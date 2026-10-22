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
export interface Auth { userId: string; name: string; email: string; csrf: string }
declare global { namespace Express { interface Locals { auth: Auth } } }
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const cookie: unknown = req.cookies?.ellas_session;
  if (typeof cookie !== 'string') return void res.status(401).json({ message: 'Inicia sesión para continuar' });
  const session = await SessionModel.findOne({ tokenHash: tokenHash(cookie), expiresAt: { $gt: new Date() } }).lean();
  if (!session) return void res.status(401).json({ message: 'La sesión ha caducado' });
  const user = await UserModel.findOne({ _id: session.userId, active: true }).lean();
  if (!user) return void res.status(401).json({ message: 'Acceso no disponible' });
  if (!['GET','HEAD'].includes(req.method) && req.get('x-csrf-token') !== session.csrf) return void res.status(403).json({ message: 'Recarga la página para continuar' });
  res.locals.auth = { userId: String(user._id), name: user.name, email: user.email, csrf: session.csrf };
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
