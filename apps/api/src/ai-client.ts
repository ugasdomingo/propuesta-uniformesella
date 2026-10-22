import OpenAI from 'openai';
import type {Response,ResponseCreateParamsNonStreaming} from 'openai/resources/responses/responses.js';
import {config} from './config.js';
import {AiUsageModel} from './ai-models.js';
import {HttpError} from './requests.js';

export const aiConfigured=()=>Boolean(config.OPENAI_API_KEY);
const client=aiConfigured()?new OpenAI({apiKey:config.OPENAI_API_KEY,baseURL:'https://api.openai.com/v1',maxRetries:0,timeout:config.AI_TIMEOUT_MS}):undefined;
export interface AiIdentity{owner:string;profile:'public'|'admin';ipHash:string;deadline?:number}
async function reserve(key:string,limit:number){
  try{await AiUsageModel.updateOne({key},{$setOnInsert:{calls:0,inputTokens:0,outputTokens:0,expiresAt:new Date(Date.now()+3*86400000)}},{upsert:true});}catch(error){if((error as {code?:number}).code!==11000)throw error;}
  const result=await AiUsageModel.updateOne({key,calls:{$lt:limit}},{$inc:{calls:1}});if(!result.modifiedCount)throw new HttpError(429,'Has alcanzado el límite de asesoramiento de hoy. Puedes continuar preparando el pedido manualmente.');
}
export async function aiResponse(params:Omit<ResponseCreateParamsNonStreaming,'model'|'store'|'max_output_tokens'>,identity:AiIdentity,vision=false):Promise<Response>{
  if(!client)throw new HttpError(503,'El asesor aún no está configurado. Puedes preparar tu pedido con el buscador.');
  const day=new Date().toISOString().slice(0,10);const usageKey=`${day}:${identity.profile}`;
  await reserve(`${day}:owner:${identity.owner}`,identity.profile==='admin'?Math.max(config.AI_SESSION_DAILY_LIMIT,60):config.AI_SESSION_DAILY_LIMIT);
  await reserve(`${day}:ip:${identity.ipHash}`,Math.max(config.AI_SESSION_DAILY_LIMIT,60));
  await reserve(`${day}:global`,config.AI_DAILY_CALL_LIMIT);
  const started=Date.now();
  const remaining=identity.deadline?identity.deadline-started:config.AI_TIMEOUT_MS;
  if(remaining<500)throw new HttpError(504,'El asesor ha tardado demasiado. Haz una consulta más concreta.');
  try{
    const response=await client.responses.create({...params,model:vision?config.OPENAI_VISION_MODEL:config.OPENAI_MODEL,store:false,max_output_tokens:config.AI_MAX_OUTPUT_TOKENS,reasoning:{effort:'low'}},{timeout:Math.min(config.AI_TIMEOUT_MS,remaining)});
    await AiUsageModel.updateOne({key:usageKey},{$inc:{calls:1,inputTokens:response.usage?.input_tokens||0,outputTokens:response.usage?.output_tokens||0},$setOnInsert:{expiresAt:new Date(Date.now()+3*86400000)}},{upsert:true});
    console.log(JSON.stringify({event:'ai_usage',profile:identity.profile,model:response.model,inputTokens:response.usage?.input_tokens,outputTokens:response.usage?.output_tokens,ms:Date.now()-started}));
    if(response.status!=='completed')throw new HttpError(502,'El análisis no ha terminado. Reduce el contenido y vuelve a intentarlo; tu trabajo se conserva.');
    return response;
  }catch(error){if(error instanceof HttpError)throw error;const status=error instanceof OpenAI.APIError?error.status:undefined;console.error(JSON.stringify({event:'ai_error',profile:identity.profile,status:status||'network',ms:Date.now()-started}));throw new HttpError(status===429?503:502,status===401?'La configuración del asesor necesita revisión. Tu pedido manual sigue disponible.':'El asesor no está disponible en este momento. Tu trabajo se conserva; vuelve a intentarlo.');}
}
