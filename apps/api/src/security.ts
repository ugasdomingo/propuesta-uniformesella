import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response, NextFunction } from 'express';
import { config, isProduction } from './config.js';
import { SessionModel, UserModel } from './models.js';

const scryptAsync = promisify(scrypt);
export const tokenHash = (value: string) => createHmac('sha256', config.SESSION_SECRET).update(value).digest('hex');
export async function hashPassword(password: string) { const salt = randomBytes(16).toString('hex'); const hash = await scryptAsync(password, salt, 64) as Buffer; return `${salt}:${hash.toString('hex')}`; }
export async function verifyPassword(password: string, stored: string) {
  const [salt, encoded] = stored.split(':');
  if (!salt || !encoded) return false;
  const result = await scryptAsync(password, salt, 64) as Buffer;
  const expected = Buffer.from(encoded, 'hex');
  return result.length === expected.length && timingSafeEqual(result, expected);
}
export function sameOrigin(req: Request, res: Response, next: NextFunction) {
  if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
  if (req.get('origin') !== new URL(config.APP_URL).origin) return void res.status(403).json({ message: 'Origen de solicitud no permitido' });
  next();
}
export interface Auth { role:'admin'|'staff'|'customer'; demo:boolean; userId: string; name: string; email: string; csrf: string }
declare global { namespace Express { interface Locals { auth: Auth } } }
export async function readAuth(req:Request):Promise<Auth|null> {
  const cookie:unknown=req.cookies?.ellas_session;
  if(typeof cookie!=='string')return null;
  const session=await SessionModel.findOne({tokenHash:tokenHash(cookie),expiresAt:{$gt:new Date()}}).lean();
  if(!session)return null;
  const user=await UserModel.findOne({_id:session.userId,active:true}).lean();
  if(!user || !['admin','staff','customer'].includes(user.role))return null;
  return {userId:String(user._id),name:user.name,email:user.email,csrf:session.csrf,role:user.role as Auth['role'],demo:user.demo===true};
}
export async function requireAuth(req:Request,res:Response,next:NextFunction){
  const auth=await readAuth(req);
  if(!auth)return void res.status(401).json({message:'Inicia sesión para continuar'});
  if(!['GET','HEAD'].includes(req.method)&&req.get('x-csrf-token')!==auth.csrf)return void res.status(403).json({message:'Recarga la página para continuar'});
  res.locals.auth=auth;next();
}
export function requireStaff(_req:Request,res:Response,next:NextFunction){
  if(!['admin','staff'].includes(res.locals.auth?.role))return void res.status(403).json({message:'Este acceso está reservado al equipo'});
  next();
}
export function requireCustomer(_req:Request,res:Response,next:NextFunction){
  if(res.locals.auth?.role!=='customer')return void res.status(403).json({message:'Utiliza una cuenta de comprador'});
  next();
}
export const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/', maxAge: 8 * 60 * 60 * 1000 };
export async function newSession(userId: string, res: Response) {
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(24).toString('hex');
  await SessionModel.create({ tokenHash: tokenHash(token), csrf, userId, expiresAt: new Date(Date.now() + cookieOptions.maxAge) });
  res.cookie('ellas_session', token, cookieOptions);
  return csrf;
}

export function requireAdmin(_req:Request,res:Response,next:NextFunction){if(res.locals.auth?.role!=='admin')return void res.status(403).json({message:'Esta acción requiere un administrador'});next();}
