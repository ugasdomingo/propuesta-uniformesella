import {randomBytes} from 'node:crypto';
import type {Request,Response as ExpressResponse} from 'express';
import type {FunctionTool,ResponseInput} from 'openai/resources/responses/responses.js';
import {z} from 'zod';
import {technicalFacts,adminChangeSchema} from '@ellas/shared';
import {AiSessionModel} from './ai-models.js';
import {ProductModel,RequestModel} from './models.js';
import {tokenHash,type Auth} from './security.js';
import {isProduction} from './config.js';
import {aiResponse,type AiIdentity} from './ai-client.js';
import {searchProducts,getRanking} from './catalog.js';
import {HttpError} from './requests.js';
import {prepareChange} from './ai-actions.js';
import {PUBLIC_PROMPT,ADMIN_PROMPT} from './ai-prompts.js';

const query=z.object({query:z.string().max(100)}).strict();
const ref=z.object({reference:z.string().regex(/^[A-Z0-9]{2,50}$/)}).strict();
const compare=z.object({references:z.array(z.string().regex(/^[A-Z0-9]{2,50}$/)).min(1).max(3)}).strict();
const readRequest=z.object({id:z.string().regex(/^[a-f0-9]{24}$/)}).strict();
const prepare=z.object({id:z.string().regex(/^[a-f0-9]{24}$/),kind:z.enum(['note','status','convert','proposal']),text:z.string().max(2000).nullable(),status:z.string().max(50).nullable(),prices:z.array(z.number().int().min(0)).max(250).nullable(),personalizationCents:z.number().int().min(0).nullable(),deliveryCents:z.number().int().min(0).nullable(),taxRate:z.number().min(0).max(100).nullable(),notes:z.string().max(2000).nullable()}).strict();
function tool(name:string,description:string,schema:z.ZodType):FunctionTool{const {$schema:_schema,...parameters}=z.toJSONSchema(schema);return {type:'function',name,description,strict:true,parameters};}
const publicTools=[tool('search_catalog','Busca prendas reales por referencia, nombre, tipo o tejido.',query),tool('read_product','Lee composición, excepciones, gramaje, tallas y colores de una referencia.',ref),tool('compare_products','Compara hasta tres referencias por especificaciones reales.',compare),tool('read_popularity','Consulta pedidos reales confirmados, sin ejemplos.',z.object({}).strict()),tool('read_faq','Lee información aprobada de pedidos y personalización.',z.object({}).strict())];
const privateTools=[...publicTools,tool('find_requests','Busca solicitudes por número, nombre o empresa; no cambia nada.',query),tool('read_request','Lee una solicitud concreta autorizada para el administrador.',readRequest),tool('prepare_change','Prepara una nota, estado, conversión o propuesta; no ejecuta cambios. Importes de propuesta en céntimos. Los argumentos no aplicables deben ser null.',prepare)];
const publicInput=z.object({message:z.string().trim().min(1).max(2000),consent:z.literal(true)}).strict();
export async function chat(req:Request,res:ExpressResponse,auth?:Auth){
  const {message}=publicInput.parse(req.body);
  if(auth&&auth.role!=='admin')throw new HttpError(403,'El asistente de gestión requiere un administrador');
  const cookieName=auth?'ellas_ai_admin':'ellas_ai';const incoming=req.cookies?.[cookieName];const token=typeof incoming==='string'&&/^[a-f0-9]{64}$/.test(incoming)?incoming:randomBytes(32).toString('hex');
  const owner=auth?`admin:${auth.userId}:${tokenHash(String(req.cookies.ellas_session))}`:'public';
  res.cookie(cookieName,token,{httpOnly:true,secure:isProduction,sameSite:'lax',path:'/',maxAge:86400000});
  const hashed=tokenHash(token+owner);
  try{await AiSessionModel.updateOne({tokenHash:hashed,owner},{$setOnInsert:{messages:[],expiresAt:new Date(Date.now()+86400000)}},{upsert:true});}catch(error){if((error as {code?:number}).code!==11000)throw error;}
  const session=await AiSessionModel.findOneAndUpdate({tokenHash:hashed,owner,expiresAt:{$gt:new Date()},$or:[{busyUntil:{$exists:false}},{busyUntil:{$lt:new Date()}}]},{$set:{busyUntil:new Date(Date.now()+90000)}},{new:true}).lean();
  if(!session)throw new HttpError(409,'Espera a que termine la respuesta anterior o abre una nueva sesión.');
  const identity:AiIdentity={owner:hashed,profile:auth?'admin':'public',ipHash:tokenHash(req.ip||'unknown'),deadline:Date.now()+55000};
  const recommendations=new Set<string>();const actions:Awaited<ReturnType<typeof prepareChange>>[]=[];
  const input:ResponseInput=session.messages.slice(-8).map(m=>({role:m.role,content:m.text.slice(0,1800)}));input.push({role:'user',content:message});
  const started=Date.now();let usedTools=0;let answer='';
  try{
    for(let round=0;round<5;round++){
      if(Date.now()-started>55000)throw new HttpError(504,'El asesor ha tardado demasiado. Reintenta con una consulta más corta.');
      const response=await aiResponse({instructions:auth?ADMIN_PROMPT:PUBLIC_PROMPT,input,tools:auth?privateTools:publicTools,parallel_tool_calls:false},identity);
      input.push(...response.output.filter(item=>item.type==='message'||item.type==='reasoning'||item.type==='function_call'));const calls=response.output.filter(item=>item.type==='function_call');
      if(!calls.length){answer=response.output_text;break;}
      for(const call of calls){if(++usedTools>8)throw new HttpError(502,'La consulta necesita demasiadas búsquedas. Hazla más concreta.');let result:unknown;
        try{const args:unknown=JSON.parse(call.arguments);
          if(call.name==='search_catalog'){const {query:q}=query.parse(args);const products=await searchProducts(q,6);products.forEach(p=>recommendations.add(p.reference));result=products.map(p=>({reference:p.reference,name:p.name,category:p.category,audience:p.audience,...technicalFacts(p)}));}
          else if(call.name==='read_product'){const {reference}=ref.parse(args);const p=await ProductModel.findOne({reference}).lean();if(!p)throw new HttpError(404,'Referencia no encontrada');recommendations.add(p.reference);result={reference:p.reference,name:p.name,description:p.description,...technicalFacts(p),sizes:p.sizes,colors:p.colors.map(c=>({code:c.code,name:c.name,sizes:c.sizes}))};}
          else if(call.name==='compare_products'){const {references}=compare.parse(args);const products=await ProductModel.find({reference:{$in:references}}).lean();products.forEach(p=>recommendations.add(p.reference));result=products.map(p=>({reference:p.reference,name:p.name,category:p.category,...technicalFacts(p),sizes:p.sizes,colorCount:p.colors.length}));}
          else if(call.name==='read_popularity'){z.object({}).strict().parse(args);result=await getRanking();}
          else if(call.name==='read_faq'){z.object({}).strict().parse(args);result={order:'Solicitud sin registro ni pago online. Precio, stock y plazo se confirman con el equipo.',personalization:'Bordado, serigrafía, DTF y transfer sujetos a revisión de logo y prenda. Logo PNG/JPG/WebP privado hasta 3 MB.',store:'Calle Almería 6, Madrid. Teléfono 91 726 17 28.',sizes:'Consultar medidas de ficha, comparando con una prenda que siente bien. No son existencias en almacén.'};}
          else if(auth&&auth.role==='admin'&&call.name==='find_requests'){const {query:q}=query.parse(args);const escaped=q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const found=await RequestModel.find({$or:['number','contact.name','contact.company'].map(field=>({[field]:{$regex:escaped,$options:'i'}}))}).select('_id number type status contact.name contact.company version').sort({createdAt:-1}).limit(8).lean();result=found;}
          else if(auth&&auth.role==='admin'&&call.name==='read_request'){const {id}=readRequest.parse(args);const request=await RequestModel.findById(id).lean();if(!request)throw new HttpError(404,'Solicitud no encontrada');result={id:String(request._id),number:request.number,version:request.version,status:request.status,type:request.type,client:request.contact.name,company:request.contact.company,lines:request.lines.slice(0,50),lineCount:request.lines.length,notes:request.notes,events:request.events.slice(-8),proposal:request.proposal};}
          else if(auth&&auth.role==='admin'&&call.name==='prepare_change'){const argsValue=prepare.parse(args);const request=await RequestModel.findById(argsValue.id).select('version').lean();if(!request)throw new HttpError(404,'Solicitud no encontrada');const base={requestId:argsValue.id,version:request.version};const change=adminChangeSchema.parse(argsValue.kind==='note'?{...base,kind:'note',text:argsValue.text}:argsValue.kind==='status'?{...base,kind:'status',status:argsValue.status}:argsValue.kind==='convert'?{...base,kind:'convert'}:{...base,kind:'proposal',prices:argsValue.prices,personalizationCents:argsValue.personalizationCents,deliveryCents:argsValue.deliveryCents,taxRate:argsValue.taxRate,notes:argsValue.notes});const action=await prepareChange(auth,change,'OpenAI · '+response.model);actions.push(action);result={prepared:true,summary:action.summary,message:'Propuesta lista. El administrador debe revisarla y pulsar Confirmar cambios.'};}
          else throw new HttpError(403,'Herramienta no autorizada');
        }catch(error){result={error:error instanceof HttpError?error.message:'Argumentos incompletos o no válidos. Pide aclaración.'};}
        const serialized=JSON.stringify(result);if(serialized.length>24000)result={error:'Demasiados datos. Consulta una referencia o solicitud concreta.'};input.push({type:'function_call_output',call_id:call.call_id,output:JSON.stringify(result)});
        if(JSON.stringify(input).length>80000)throw new HttpError(413,'La consulta acumula demasiada información. Haz una pregunta más concreta.');
      }
    }
    if(!answer.trim())throw new HttpError(502,'No se ha obtenido una respuesta completa. Tu pedido se conserva.');
    await AiSessionModel.updateOne({_id:session._id,owner},{$set:{messages:[...session.messages.slice(-8),{role:'user',text:message},{role:'assistant',text:answer.slice(0,6000)}]},$unset:{busyUntil:1}});
    const refs=[...recommendations].filter(reference=>answer.includes(reference)).slice(0,3);const products=await ProductModel.find({reference:{$in:refs}}).lean();res.json({answer,products,actions});
  }finally{await AiSessionModel.updateOne({_id:session._id,owner},{$unset:{busyUntil:1}});}
}
