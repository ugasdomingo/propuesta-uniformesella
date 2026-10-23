import {createHash,randomBytes} from 'node:crypto';
import mongoose from 'mongoose';
import {type RequestInput,type RequestLine,type Status,type AdminChange,quoteStatuses,orderStatuses,statusLabels} from '@ellas/shared';
import {ProductModel,RequestModel,UploadModel,UserModel} from './models.js';
import {config} from './config.js';
import {tokenHash} from './security.js';
import {enqueueEmails,processEmails} from './email.js';
import {invalidateRanking} from './catalog.js';

export class HttpError extends Error{constructor(public status:number,message:string){super(message);}}
type Source='web'|'whatsapp'|'instagram'|'email'|'otro';
export type CreationInput=Omit<RequestInput,'privacy'|'website'> & {privacy?:boolean;website?:string};
export interface CreationContext{customerId?:string;channel:Source;actor:string;notify:boolean;captureNote?:string;externalId?:string;synthetic?:boolean;actionId?:string;proposedBy?:string;confirmedBy?:string}
export async function createRequest(input:CreationInput,idempotencyKey:string,context:CreationContext){
  if(input.desiredDate && input.desiredDate<new Date().toISOString().slice(0,10))throw new HttpError(400,'La fecha deseada no puede ser anterior a hoy');
  const payloadHash=createHash('sha256').update(JSON.stringify(context.channel==='web'?(context.customerId?{input,customerId:context.customerId}:input):{input,channel:context.channel,notify:context.notify,captureNote:context.captureNote,externalId:context.externalId})).digest('hex');
  const existing=await RequestModel.findOne({idempotencyKey}).lean();
  if(existing){if(existing.payloadHash!==payloadHash)throw new HttpError(409,'La clave de envío ya corresponde a otros datos. Revisa el pedido.');return {number:existing.number,id:String(existing._id),duplicate:true};}
  const importedOwner=context.channel!=='web'?await UserModel.findOne({email:input.contact.email.toLowerCase().trim(),role:'customer',active:true}).select('_id demo').lean():null;
  const customerId=context.customerId||(importedOwner?String(importedOwner._id):undefined);
  const notify=context.notify&&!importedOwner?.demo;
  const products=await ProductModel.find({reference:{$in:[...new Set(input.lines.map(l=>l.reference))]}}).lean();
  const lines:RequestLine[]=[];const seen=new Set<string>();
  for(const line of input.lines){const product=products.find(p=>p.reference===line.reference);const color=product?.colors.find(c=>c.code===line.color&&c.sizes.includes(line.size));if(!product?.source.reviewed||!color)throw new HttpError(400,`Combinación no disponible: ${line.reference} / ${line.color} / ${line.size}`);const key=[line.reference,line.color,line.size].join(':');if(seen.has(key))throw new HttpError(400,'Agrupa cantidades de una misma variante antes de enviar');seen.add(key);lines.push({...line,name:product.name,colorName:color.name,image:product.imageSmall,composition:[product.composition,...product.compositionNotes].join(' · ')});}
  if(input.lines.reduce((n,l)=>n+l.quantity,0)>100000)throw new HttpError(400,'El pedido supera las 100.000 prendas');
  const upload=input.personalization.uploadId?await UploadModel.findOne({_id:input.personalization.uploadId,tokenHash:tokenHash(input.personalization.uploadToken||''),claimedBy:{$exists:false},expiresAt:{$gt:new Date()}}):undefined;
  if(input.personalization.uploadId&&(!upload||!input.personalization.enabled))throw new HttpError(400,'Vuelve a cargar el logo: ha caducado o ya está vinculado');
  const requestId=new mongoose.Types.ObjectId();
  if(upload){const claim=await UploadModel.findOneAndUpdate({_id:upload._id,claimedBy:{$exists:false}},{$set:{claimedBy:requestId},$unset:{expiresAt:1}});if(!claim)throw new HttpError(409,'El logo está vinculándose a otra solicitud. Reintenta el mismo envío.');}
  const {uploadToken:_token,...personalization}=input.personalization;
  let request;
  try{request=await RequestModel.create({_id:requestId,number:`UE-${new Date().getFullYear()}-${randomBytes(5).toString('hex').toUpperCase()}`,idempotencyKey,payloadHash,customerId,type:input.type,status:input.type==='presupuesto'?'recibido':'pendiente_confirmacion',contact:input.contact,lines,personalization,notes:input.notes,desiredDate:input.desiredDate,demo:false,isSynthetic:context.synthetic||importedOwner?.demo||false,environment:config.DEMO_MODE==='true'?'demo':'live',sourceChannel:context.channel,notificationsAllowed:notify,version:0,...(context.channel==='web'?{privacyAcceptedAt:new Date()}:{captureRecord:{by:context.actor,note:context.captureNote,externalId:context.externalId,at:new Date()}}),events:[{at:new Date().toISOString(),by:context.actor,kind:'created',...(context.actionId?{actionId:context.actionId,proposedBy:context.proposedBy,confirmedBy:context.confirmedBy}:{}),text:context.channel==='web'?'Solicitud recibida':`Solicitud registrada desde ${context.channel}. ${context.captureNote||''}`}]});}
  catch(error){if(upload)await UploadModel.updateOne({_id:upload._id,claimedBy:requestId},{$unset:{claimedBy:1},$set:{expiresAt:new Date(Date.now()+86400000)}});if((error as {code?:number}).code===11000){const prior=await RequestModel.findOne({idempotencyKey}).lean();if(prior?.payloadHash===payloadHash)return {number:prior.number,id:String(prior._id),duplicate:true};}throw error;}
  if(notify){await enqueueEmails(request._id);void processEmails().catch(()=>console.error('email_worker_error'));}
  return {number:request.number,id:String(request._id),duplicate:false};
}
export async function changeStatus(id:string,version:number,status:Status,actor:string,actionId?:string,proposedBy?:string){
  const request=await RequestModel.findById(id).lean();if(!request)throw new HttpError(404,'Solicitud no encontrada');const allowed:readonly string[]=request.type==='presupuesto'?quoteStatuses:orderStatuses;if(!allowed.includes(status))throw new HttpError(400,'Estado incompatible con el tipo de solicitud');if(['presupuestado','aceptado'].includes(status)&&!request.proposal)throw new HttpError(400,'Guarda primero una propuesta económica');
  if(actionId&&request.events.some(e=>e.actionId===actionId))return request;
  const values:Record<string,unknown>={status};if(request.type==='pedido'&&['confirmado','en_preparacion','listo','entregado'].includes(status)&&!request.confirmedAt)values.confirmedAt=new Date();
  const updated=await RequestModel.findOneAndUpdate({_id:id,version},{$set:values,$inc:{version:1},$push:{events:{at:new Date().toISOString(),by:actor,kind:'status',text:`Estado: ${statusLabels[status]}`,...(actionId?{actionId,proposedBy:proposedBy||'Asistente',confirmedBy:actor}:{})}}},{new:true}).lean();if(!updated)throw new HttpError(409,'La solicitud ha cambiado. Recarga antes de confirmar.');invalidateRanking();return updated;
}
export async function applyAdminChange(change:AdminChange,actor:string,actionId?:string,proposedBy?:string){
  const request=await RequestModel.findById(change.requestId).lean();if(!request)throw new HttpError(404,'Solicitud no encontrada');if(actionId&&request.events.some(e=>e.actionId===actionId))return request;
  if(change.kind==='status')return changeStatus(change.requestId,change.version,change.status,actor,actionId,proposedBy);
  const values:Record<string,unknown>={};let text='';
  if(change.kind==='note')text=change.text;
  if(change.kind==='convert'){if(request.type!=='presupuesto'||request.status!=='aceptado')throw new HttpError(409,'Solo se puede convertir un presupuesto aceptado');values.type='pedido';values.status='pendiente_confirmacion';text='Presupuesto aceptado convertido en pedido pendiente de confirmación';}
  if(change.kind==='proposal'){if(['aceptado','descartado','entregado','cancelado'].includes(request.status))throw new HttpError(400,'La propuesta está cerrada en este estado');if(change.prices.length!==request.lines.length)throw new HttpError(400,'Indica un precio por cada línea');const subtotalCents=change.prices.reduce((n,p,i)=>n+p*(request.lines[i]?.quantity||0),0)+change.personalizationCents+change.deliveryCents;if(!Number.isSafeInteger(subtotalCents)||subtotalCents>10000000000)throw new HttpError(400,'Importe demasiado elevado');const taxCents=Math.round(subtotalCents*change.taxRate/100);values.proposal={prices:change.prices,personalizationCents:change.personalizationCents,deliveryCents:change.deliveryCents,taxRate:change.taxRate,notes:change.notes,subtotalCents,taxCents,totalCents:subtotalCents+taxCents,updatedAt:new Date().toISOString(),by:actor};text='Propuesta económica actualizada';}
  const updated=await RequestModel.findOneAndUpdate({_id:change.requestId,version:change.version},{$set:values,$inc:{version:1},$push:{events:{at:new Date().toISOString(),by:actor,kind:change.kind,text,...(actionId?{actionId,proposedBy:proposedBy||'Asistente',confirmedBy:actor}:{})}}},{new:true}).lean();if(!updated)throw new HttpError(409,'La solicitud ha cambiado. Revisa los datos antes de confirmar.');invalidateRanking();return updated;
}
