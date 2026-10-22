import {randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {adminChangeSchema,requestSchema,draftDataSchema,type AdminChange,type DraftData,statusLabels,money} from '@ellas/shared';
import {ActionModel,DraftModel} from './ai-models.js';
import {RequestModel} from './models.js';
import {tokenHash,type Auth} from './security.js';
import {HttpError,createRequest,applyAdminChange} from './requests.js';
import {possibleDuplicates} from './ai-drafts.js';

function assertAdmin(auth:Auth){if(auth.role!=='admin')throw new HttpError(403,'Esta acción requiere un administrador');}
export async function prepareChange(auth:Auth,raw:unknown,proposedBy='Administrador'){
  assertAdmin(auth);const change=adminChangeSchema.parse(raw);const request=await RequestModel.findById(change.requestId).lean();if(!request)throw new HttpError(404,'Solicitud no encontrada');if(request.version!==change.version)throw new HttpError(409,'La solicitud ha cambiado. Vuelve a revisarla.');
  const detail=change.kind==='note'?'Añadir nota: '+change.text:change.kind==='status'?'Cambiar estado a: '+statusLabels[change.status]:change.kind==='convert'?'Convertir presupuesto aceptado en pedido pendiente de confirmación':'Actualizar propuesta: '+(change.kind==='proposal'?change.prices.map((p,i)=>request.lines[i]?.reference+' / '+request.lines[i]?.color+' / '+request.lines[i]?.size+': '+money(p)+' por unidad').join('\n')+'\nPersonalización: '+money(change.personalizationCents)+' · Entrega: '+money(change.deliveryCents)+' · IVA: '+change.taxRate+'%\n'+change.notes:'');
  const summary='Solicitud: '+request.number+'\nCliente: '+request.contact.name+'\nEstado actual: '+statusLabels[request.status]+'\n\n'+detail;
  return saveAction(auth,{kind:'change',change,summary,proposedBy});
}
export async function prepareDraft(auth:Auth,id:string,version:number){
  assertAdmin(auth);const draft=await DraftModel.findOne({_id:id,owner:auth.userId,expiresAt:{$gt:new Date()}}).lean();if(!draft)throw new HttpError(404,'Borrador no disponible');if(draft.version!==version)throw new HttpError(409,'El borrador ha cambiado. Revisa y guarda de nuevo.');if(draft.requestId)throw new HttpError(409,'El borrador ya tiene una solicitud vinculada');
  const data=draftDataSchema.parse(draft.data);if(data.channel==='web')throw new HttpError(400,'Elige el canal de origen del mensaje');if(data.unresolved.length)throw new HttpError(400,'Resuelve o descarta expresamente las dudas del borrador');if(!data.captureNote.trim())throw new HttpError(400,'Indica cómo se obtuvieron los datos de contacto');
  requestSchema.omit({privacy:true,website:true}).parse(toCreation(data));
  if((await possibleDuplicates(data)).length&&!data.duplicateReviewed)throw new HttpError(400,'Revisa las posibles coincidencias y confirma que es otra solicitud');
  return saveAction(auth,{kind:'create',draftId:draft._id,draftVersion:version,data,idempotencyKey:draft.creationKey,summary:'Canal: '+data.channel+'\nCliente: '+data.contact.name+' · '+data.contact.company+'\nContacto: '+data.contact.email+' · '+data.contact.phone+'\nTipo: '+data.type+' (sin confirmación comercial)\n\nPrendas:\n'+data.lines.map(l=>l.reference+' · '+l.color+' · '+l.size+' · '+l.quantity+' uds.').join('\n')+'\n\nPersonalización: '+(data.personalization.enabled?'Sí · '+data.personalization.placement+' · '+data.personalization.notes:'No')+'\nObservaciones: '+data.notes+'\nOrigen de los datos: '+data.captureNote+'\nAvisos por email: '+(data.notify?'Sí; en demo redirigidos a ugasdomingo@gmail.com':'No enviar')});
}
function toCreation(data:DraftData){return {type:data.type,contact:data.contact,lines:data.lines,personalization:data.personalization,notes:data.notes,...(data.desiredDate?{desiredDate:data.desiredDate}:{})};}
async function saveAction(auth:Auth,fields:{kind:'change';change:AdminChange;summary:string;proposedBy:string}|{kind:'create';draftId:unknown;draftVersion:number;data:DraftData;summary:string;idempotencyKey:string}){
  const token=randomBytes(32).toString('hex');const action=await ActionModel.create({...fields,owner:auth.userId,tokenHash:tokenHash(token),state:'pending',idempotencyKey:'idempotencyKey' in fields?fields.idempotencyKey:randomUUID(),expiresAt:new Date(Date.now()+10*60000)});
  return {id:String(action._id),token,summary:fields.summary,expiresAt:action.expiresAt,kind:action.kind};
}
export async function confirmAction(auth:Auth,id:string,token:string){
  assertAdmin(auth);const filter={_id:z.string().regex(/^[a-f0-9]{24}$/).parse(id),owner:auth.userId,tokenHash:tokenHash(token),expiresAt:{$gt:new Date()}};
  const previous=await ActionModel.findOne(filter).lean();if(!previous)throw new HttpError(404,'La propuesta no está disponible o ha caducado');if(previous.state==='completed')return previous.result;
  const action=await ActionModel.findOneAndUpdate({...filter,$or:[{state:'pending'},{state:'executing',leaseUntil:{$lt:new Date()}}]},{$set:{state:'executing',leaseUntil:new Date(Date.now()+90000)}},{new:true}).lean();if(!action)throw new HttpError(409,'Esta acción ya se está procesando. Espera y reintenta.');
  try{
    let result:{id:string;number:string};
    if(action.kind==='create'){
      const draft=await DraftModel.findOneAndUpdate({_id:action.draftId,owner:auth.userId,version:action.draftVersion,$or:[{confirmingUntil:{$exists:false}},{confirmingUntil:{$lt:new Date()}},{confirmingAction:String(action._id)}]},{$set:{confirmingUntil:new Date(Date.now()+90000),confirmingAction:String(action._id)}},{new:true}).lean();if(!draft||draft.version!==action.draftVersion)throw new HttpError(409,'El borrador ha cambiado. Prepara una nueva revisión.');
      const data=draftDataSchema.parse(action.data);const input=requestSchema.omit({privacy:true,website:true}).parse(toCreation(data));
      result=await createRequest(input,action.idempotencyKey,{channel:data.channel,actor:auth.name,notify:data.notify,captureNote:data.captureNote,externalId:data.externalId,actionId:String(action._id),proposedBy:draft.analysis.startsWith('Borrador creado manualmente')?'Administrador':'OpenAI',confirmedBy:auth.userId});
      await DraftModel.updateOne({_id:draft._id,owner:auth.userId,version:action.draftVersion},{$set:{requestId:result.id},$unset:{sourceText:1}});
    }else{const request=await applyAdminChange(adminChangeSchema.parse(action.change),auth.name,String(action._id),action.proposedBy);result={id:String(request._id),number:request.number};}
    await ActionModel.updateOne({_id:action._id},{$set:{state:'completed',result,confirmedBy:auth.userId,confirmedAt:new Date()},$unset:{leaseUntil:1}});return result;
  }catch(error){await ActionModel.updateOne({_id:action._id,state:'executing'},{$set:{state:error instanceof HttpError&&error.status===409?'failed':'pending'},$unset:{leaseUntil:1}});throw error;}finally{if(action.draftId)await DraftModel.updateOne({_id:action.draftId,confirmingAction:String(action._id)},{$unset:{confirmingUntil:1,confirmingAction:1}});}
}
