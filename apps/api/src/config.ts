import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'), PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//, 'Usa una URI mongodb:// o mongodb+srv:// válida'), APP_URL: z.url(), SESSION_SECRET: z.string().min(32),
  DEMO_MODE: z.enum(['true','false']).default('true'),
  ORDER_NOTIFICATION_TO: z.email().default('ugasdomingo@gmail.com'), EMAIL_REDIRECT_TO: z.email().default('ugasdomingo@gmail.com'),
  EMAIL_FROM: z.string().default(''), EMAIL_API_KEY: z.string().default(''),
  S3_ENDPOINT: z.string().default(''), S3_REGION: z.string().default('auto'), S3_BUCKET: z.string().default(''), S3_ACCESS_KEY_ID: z.string().default(''), S3_SECRET_ACCESS_KEY: z.string().default(''),
  DEMO_ADMIN_EMAIL: z.preprocess(value=>value===''?undefined:value,z.email().optional()), DEMO_ADMIN_PASSWORD: z.preprocess(value=>value===''?undefined:value,z.string().min(12).optional()),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Configuración inválida:', parsed.error.issues.map(issue => ({ key: issue.path.join('.'), message: issue.message })));
  throw new Error('Revisa las variables indicadas en .env.example');
}
export const config = parsed.data;
export const isProduction = config.NODE_ENV === 'production';
export const emailConfigured = Boolean(config.EMAIL_FROM && config.EMAIL_API_KEY);
if (isProduction && new URL(config.APP_URL).protocol !== 'https:') throw new Error('APP_URL debe usar HTTPS en producción');
if ([config.S3_ENDPOINT,config.S3_BUCKET,config.S3_ACCESS_KEY_ID,config.S3_SECRET_ACCESS_KEY].some(Boolean) && ![config.S3_ENDPOINT,config.S3_BUCKET,config.S3_ACCESS_KEY_ID,config.S3_SECRET_ACCESS_KEY].every(Boolean)) throw new Error('Configuración S3 incompleta');
