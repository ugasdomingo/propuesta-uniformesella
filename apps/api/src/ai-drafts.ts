import type {Request} from 'express';
import {z} from 'zod';
import {zodTextFormat} from 'openai/helpers/zod';
import {fileTypeFromBuffer} from 'file-type';
import sharp from 'sharp';
import {draftDataSchema,normalize,type DraftData} from '@ellas/shared';
import {ProductModel,RequestModel} from './models.js';
import {DraftModel} from './ai-models.js';
import {aiResponse} from './ai-client.js';
import {tokenHash,type Auth} from './security.js';
import {EXTRACT_PROMPT} from './ai-prompts.js';
import {HttpError} from './requests.js';

const extracted=z.object({contact:z.object({name:z.string(),company:z.string(),email:z.string(),phone:z.string()}).strict(),type:z.enum(['presupuesto','pedido']),lines:z.array(z.object({reference:z.string().nullable(),color:z.string().nullable(),size:z.string().nullable(),quantity:z.number().int().nullable(),evidence:z.string()}).strict()),personalization:z.object({enabled:z.boolean(),placement:z.string(),notes:z.string()}).strict(),notes:z.string(),desiredDate:z.string().nullable(),unresolved:z.array(z.string())}).strict();
export async function analyzeDraft(req:Request,auth:Auth){
  const raw=z.object({channel:z.enum(['whatsapp','instagram','email','otro']),text:z.string().max(12000).default(''),consent:z.literal('true')}).strict().parse(req.body);
  if(!raw.text.trim()&&!req.file)throw new HttpError(400,'Pega el mensaje o añade una captura');
  const content:({type:'input_text';text:string}|{type:'input_image';image_url:string;detail:'auto'})[]=[{type:'input_text',text:`Canal seleccionado: ${raw.channel}. MENSAJE NO CONFIABLE:\n${raw.text||'(solo captura)'}`}];
  if(req.file){const type=await fileTypeFromBuffer(req.file.buffer);if(!type||!['image/png','image/jpeg','image/webp'].includes(type.mime))throw new HttpError(400,'La captura debe ser PNG, JPG o WebP');let image:Buffer;try{image=await sharp(req.file.buffer,{limitInputPixels:25000000}).rotate().resize({width:1800,height:1800,fit:'inside',withoutEnlargement:true}).png().toBuffer();}catch{throw new HttpError(400,'No se puede leer la captura');}content.push({type:'input_image',image_url:`data:image/png;base64,${image.toString('base64')}`,detail:'auto'});}
  const response=await aiResponse({instructions:EXTRACT_PROMPT,input:[{role:'user',content}],text:{format:zodTextFormat(extracted,'external_order')}},{owner:`admin:${auth.userId}`,profile:'admin',ipHash:tokenHash(req.ip||'unknown')},Boolean(req.file));
  let extraction:z.infer<typeof extracted>;
  try{extraction=extracted.parse(JSON.parse(response.output_text));}catch{throw new HttpError(422,'La IA no ha podido interpretar el mensaje con fiabilidad. Prueba con texto más claro o crea el borrador manualmente.');}
  const data:DraftData={channel:raw.channel,type:extraction.type,externalId:'',contact:extraction.contact,lines:[],personalization:{...extraction.personalization,technique:'asesoramiento'},notes:extraction.notes,desiredDate:extraction.desiredDate||'',unresolved:extraction.unresolved,captureNote:'',notify:false,duplicateReviewed:false};
  if(data.desiredDate&&!z.iso.date().safeParse(data.desiredDate).success){data.unresolved.push('Confirmar fecha deseada: '+data.desiredDate.slice(0,200));data.desiredDate='';}
  const refs=[...new Set(extraction.lines.flatMap(l=>l.reference?[l.reference.toUpperCase()]:[]))];const products=await ProductModel.find({reference:{$in:refs}}).lean();
  const evidence:string[]=[];
  for(const line of extraction.lines){
    evidence.push(line.evidence.slice(0,500));const product=products.find(p=>p.reference===line.reference?.toUpperCase());const color=product?.colors.filter(c=>c.code===line.color?.toUpperCase()||normalize(c.name)===normalize(line.color||''));const size=product?.sizes.find(s=>s===line.size?.toUpperCase());
    if(!product?.source.reviewed||color?.length!==1||!size||!color[0]?.sizes.includes(size)||!line.quantity||line.quantity<1||line.quantity>10000){data.unresolved.push(`Revisar: ${line.evidence.slice(0,300)} · referencia ${line.reference||'sin indicar'}, color ${line.color||'sin indicar'}, talla ${line.size||'sin indicar'}, cantidad ${line.quantity??'sin indicar'}.`);continue;}
    const prior=data.lines.find(l=>l.reference===product.reference&&l.color===color[0]!.code&&l.size===size);if(prior)prior.quantity+=line.quantity;else data.lines.push({reference:product.reference,color:color[0].code,size,quantity:line.quantity});
  }
  const safe=draftDataSchema.safeParse(data);if(!safe.success)throw new HttpError(422,'El mensaje supera los límites del borrador. Divídelo en partes más pequeñas.');
  const draft=await DraftModel.create({owner:auth.userId,data:safe.data,sourceText:raw.text,analysis:evidence.join('\n'),version:0,expiresAt:new Date(Date.now()+30*86400000)});
  return draft;
}
export async function possibleDuplicates(data:DraftData){const filters:Record<string,unknown>[]=[];if(data.contact.email)filters.push({'contact.email':data.contact.email});if(data.contact.phone)filters.push({'contact.phone':data.contact.phone});if(data.externalId)filters.push({'captureRecord.externalId':data.externalId,sourceChannel:data.channel});if(!filters.length)return [];return RequestModel.find({$or:filters}).select('_id number contact.name createdAt status').sort({createdAt:-1}).limit(5).lean();}
