import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import mongoose from 'mongoose';
import { z } from 'zod';
import { normalize, requestSchema, loginSchema, stateSchema, noteSchema, proposalSchema, quoteStatuses, orderStatuses, statusLabels, type RequestLine } from '@ellas/shared';
import { config, emailConfigured } from './config.js';
import { connectDb, ProductModel, RequestModel, UserModel, SessionModel, EmailModel, UploadModel } from './models.js';
import { sameOrigin, requireAuth, verifyPassword, newSession, cookieOptions, tokenHash } from './security.js';
import { uploadRouter } from './uploads.js';
import { enqueueEmails, processEmails } from './email.js';

import {catalogRouter} from './catalog.js';
import {publicAiRouter,adminAiRouter} from './ai.js';
import {AiSessionModel,AiUsageModel,DraftModel,ActionModel} from './ai-models.js';
import {createRequest,changeStatus,applyAdminChange,HttpError} from './requests.js';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(express.json({ limit: '512kb' }), cookieParser());
app.use((req, res, next) => { res.set('X-Robots-Tag', config.DEMO_MODE === 'true' ? 'noindex, nofollow, noarchive' : 'noindex'); res.set('Cache-Control', 'no-store'); next(); });
app.get('/health', async (_req, res) => { const up = mongoose.connection.readyState === 1; res.status(up ? 200 : 503).json({ ok: up }); });
app.use('/api', sameOrigin);
const limiter = (limit: number, windowMs: number) => rateLimit({ windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Has realizado demasiados intentos. Espera unos minutos.' } });
app.use('/api', limiter(1200, 15 * 60000));
app.use('/api/uploads', limiter(20, 60 * 60000), uploadRouter);
app.use('/api/catalog',catalogRouter);
app.use('/api/assistant',limiter(60,15*60000),publicAiRouter);
app.use('/api/admin/assistant',limiter(120,15*60000),adminAiRouter);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const querySchema = z.object({ q: z.string().max(100).default(''), category: z.string().max(50).default(''), collection: z.string().max(50).default(''), audience: z.string().max(50).default(''), size: z.string().max(30).default(''), color: z.string().max(40).default(''), composition: z.string().max(60).default(''), weight: z.string().max(30).default(''), page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(48).default(24) });
app.get('/api/catalog/products', async (req, res) => {
  const query = querySchema.parse(req.query);
  const filter: Record<string, unknown> = {};
  const term = normalize(query.q).replace(/t-shirt|t shirt/g, 'camiseta').replace(/vest\b/g, 'chaleco');
  if (term) filter.$and=term.split(/\s+/).filter(Boolean).slice(0,8).map(word=>({search:{$regex:escape(word),$options:'i'}}));
  for (const key of ['category', 'collection', 'audience','weight'] as const) if (query[key]) filter[key] = query[key];
  if (query.composition) filter.composition = { $regex: escape(query.composition), $options: 'i' };
  const variant: Record<string, unknown> = {};
  if (query.size) variant.sizes = query.size;
  if (query.color) variant.code = query.color;
  if (Object.keys(variant).length) filter.colors = { $elemMatch: variant };
  const [products, total, all] = await Promise.all([ProductModel.find(filter).sort({ reference: 1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(), ProductModel.countDocuments(filter), ProductModel.find().select('category collection audience sizes colors.code colors.name colors.hex composition weight').lean()]);
  // Exact reference first, independent of the alphabetic sort, on search page one.
  if (query.page === 1 && term) {
    const exact = await ProductModel.findOne({ ...filter, reference: query.q.toUpperCase().trim() }).lean();
    if (exact) { const index = products.findIndex(p => p.reference === exact.reference); if (index >= 0) products.splice(index,1); products.unshift(exact); products.splice(query.limit); }
  }
  const unique = (values: string[]) => [...new Set(values)].filter(Boolean).sort((a,b)=>a.localeCompare(b,'es'));
  res.json({ products, total, page: query.page, pages: Math.ceil(total / query.limit), facets: {
    categories: unique(all.map(p=>p.category)), collections: unique(all.map(p=>p.collection)), audiences: unique(all.map(p=>p.audience)),
    sizes: unique(all.flatMap(p=>p.sizes)), colors: [...new Map(all.flatMap(p=>p.colors).map(c=>[c.code,{code:c.code,name:c.name,hex:c.hex}])).values()].sort((a,b)=>a.name.localeCompare(b.name)),
    compositions: ['Algodón','Poliéster','Viscosa','Elastano'].filter(value=>all.some(p=>normalize(p.composition).includes(normalize(value)))), weights: unique(all.map(p=>p.weight || '')),
  } });
});
app.get('/api/catalog/products/:slug', async (req, res) => {
  const slug = z.string().min(2).max(100).parse(req.params.slug);
  const product = await ProductModel.findOne({ $or: [{ slug }, { reference: slug.toUpperCase() }] }).lean();
  if (!product) return void res.status(404).json({ message: 'Prenda no encontrada' });
  res.json(product);
});

app.post('/api/requests',limiter(15,60*60000),async(req,res)=>{const input=requestSchema.parse(req.body);const key=z.uuid().parse(req.get('idempotency-key'));const result=await createRequest(input,key,{channel:'web',actor:'Solicitante',notify:true});res.status(result.duplicate?200:201).json({number:result.number,duplicate:result.duplicate});});

app.post('/api/auth/login', limiter(8,15*60000), async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await UserModel.findOne({ email: input.email.toLowerCase().trim(), active: true });
  // A fixed valid-format hash keeps missing-user and wrong-password work comparable.
  const hash = user?.passwordHash || '45bc4c21d621921827e4afd1eec63b6c:' + '00'.repeat(64);
  const valid = await verifyPassword(input.password, hash);
  if (!user || !valid) return void res.status(401).json({ message: 'Email o contraseña incorrectos' });
  const csrf = await newSession(String(user._id),res);
  res.json({ name: user.name, email: user.email, csrf, role:user.role });
});
app.get('/api/auth/session', requireAuth, (_req,res)=>res.json(res.locals.auth));
app.post('/api/auth/logout', requireAuth, async (req,res)=>{ await SessionModel.deleteOne({ tokenHash: tokenHash(String(req.cookies.ellas_session)) }); res.clearCookie('ellas_session', { ...cookieOptions, maxAge: 0 }); res.json({ ok: true }); });
app.use('/api/admin', requireAuth);
const listSchema = z.object({ q: z.string().max(100).default(''), status: z.string().max(50).default(''), type: z.enum(['','presupuesto','pedido']).default(''), from: z.union([z.literal(''), z.iso.date()]).default(''), to: z.union([z.literal(''), z.iso.date()]).default(''), page: z.coerce.number().int().min(1).max(10000).default(1) });
app.get('/api/admin/requests', async (req,res)=>{
  const q = listSchema.parse(req.query);
  const filter: Record<string,unknown> = {};
  if (q.q) filter.$or = ['number','contact.name','contact.company','contact.email'].map(field=>({ [field]: { $regex: escape(q.q), $options:'i' } }));
  if (q.status) filter.status=q.status;
  if (q.type) filter.type=q.type;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: new Date(q.from) } : {}), ...(q.to ? { $lt: new Date(new Date(q.to).getTime()+86400000) } : {}) };
  const [requests,total,summary] = await Promise.all([RequestModel.find(filter).select('-idempotencyKey -payloadHash -privacyAcceptedAt').sort({ createdAt:-1 }).skip((q.page-1)*20).limit(20).lean(),RequestModel.countDocuments(filter),RequestModel.aggregate<{_id:string;count:number}>([{ $group:{ _id:'$status',count:{$sum:1} } }])]);
  res.json({ requests,total,pages:Math.ceil(total/20),page:q.page,summary, emailConfigured, demoMode: config.DEMO_MODE==='true' });
});
app.param('id', (req,res,next,id: string)=>{ if (!mongoose.isObjectIdOrHexString(id)) return void res.status(404).json({ message:'Solicitud no encontrada' }); next(); });
app.get('/api/admin/requests/:id',async(req,res)=>{
  const request=await RequestModel.findById(req.params.id).lean();
  if(!request) return void res.status(404).json({message:'Solicitud no encontrada'});
  const email=await EmailModel.find({requestId:request._id}).select('role status attempts lastError providerId sentAt nextAttemptAt').lean();
  const {idempotencyKey:_key,payloadHash:_hash,privacyAcceptedAt:_privacy,...publicRequest}=request;
  res.json({...publicRequest,email});
});
app.patch('/api/admin/requests/:id/status',async(req,res)=>{const input=stateSchema.parse(req.body);await changeStatus(String(req.params.id),input.version,input.status,res.locals.auth.name);res.json({ok:true});});
app.post('/api/admin/requests/:id/notes',async(req,res)=>{const input=noteSchema.parse(req.body);await applyAdminChange({kind:'note',requestId:String(req.params.id),...input},res.locals.auth.name);res.json({ok:true});});
app.put('/api/admin/requests/:id/proposal',async(req,res)=>{const input=proposalSchema.parse(req.body);await applyAdminChange({kind:'proposal',requestId:String(req.params.id),...input},res.locals.auth.name);res.json({ok:true});});
app.post('/api/admin/requests/:id/convert',async(req,res)=>{const {version}=z.object({version:z.number().int().min(0)}).strict().parse(req.body);await applyAdminChange({kind:'convert',requestId:String(req.params.id),version},res.locals.auth.name);res.json({ok:true});});
app.post('/api/admin/requests/:id/email/retry',limiter(20,60*60000),async(req,res)=>{
  const request=await RequestModel.findById(req.params.id).lean();
  if(!request || request.demo || request.notificationsAllowed===false) return void res.status(400).json({message:'Esta solicitud no tiene avisos autorizados para reintentar'});
  if(!emailConfigured) return void res.status(503).json({message:'Configura EMAIL_FROM y EMAIL_API_KEY para realizar envíos reales'});
  await enqueueEmails(request._id);
  await EmailModel.updateMany({requestId:request._id,status:{$in:['failed','unconfigured','pending']}},{$set:{status:'pending',attempts:0,nextAttemptAt:new Date()}});
  res.json({ok:true}); void processEmails().catch(()=>console.error('email_retry_error'));
});
app.use((_req,res)=>res.status(404).json({message:'Ruta no encontrada'}));
app.use((error: unknown,_req: express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(res.headersSent) return;
  if(error instanceof HttpError)return void res.status(error.status).json({message:error.message});
  if(error instanceof z.ZodError) return void res.status(400).json({message:'Revisa los campos indicados',issues:error.issues.map(i=>({path:i.path.join('.'),message:i.message}))});
  if((error as {code?:string}).code==='LIMIT_FILE_SIZE') return void res.status(413).json({message:'El logo supera los 3 MB'});
  console.error(JSON.stringify({event:'request_error',name:error instanceof Error?error.name:'unknown'}));
  res.status(500).json({message:'No se ha podido completar la operación. Si estabas enviando una solicitud, vuelve a intentarlo sin cambiar la selección.'});
});
await connectDb();
await Promise.all([ProductModel.init(),RequestModel.init(),UserModel.init(),SessionModel.init(),EmailModel.init(),UploadModel.init(),AiSessionModel.init(),AiUsageModel.init(),DraftModel.init(),ActionModel.init()]);
const server=app.listen(config.PORT,config.NODE_ENV==='production'?'0.0.0.0':'127.0.0.1',()=>console.log(`Uniformes Ellas API :${config.PORT}; email ${emailConfigured?'configurado':'sin configurar'}`));
const timer=setInterval(()=>void processEmails().catch(()=>console.error('email_worker_error')),15000);
void processEmails().catch(()=>console.error('email_worker_error'));
async function shutdown(){clearInterval(timer);server.close(async()=>{await mongoose.disconnect();process.exit(0)});}
process.on('SIGTERM',()=>void shutdown()); process.on('SIGINT',()=>void shutdown());
