import {z} from 'zod';
import {lineSchema,personalizationSchema,proposalSchema} from './contracts.js';
export const channelSchema=z.enum(['web','whatsapp','instagram','email','otro']);
export const draftDataSchema=z.object({
  channel:channelSchema,type:z.enum(['presupuesto','pedido']),externalId:z.string().trim().max(150),
  contact:z.object({name:z.string().max(100),company:z.string().max(150),email:z.string().max(254),phone:z.string().max(30)}).strict(),
  lines:z.array(lineSchema).max(250),personalization:personalizationSchema,notes:z.string().max(3000),desiredDate:z.string().max(10),
  unresolved:z.array(z.string().max(500)).max(100),captureNote:z.string().trim().max(1000),notify:z.boolean(),duplicateReviewed:z.boolean().default(false),
}).strict();
export type DraftData=z.infer<typeof draftDataSchema>;
export const adminChangeSchema=z.discriminatedUnion('kind',[
  z.object({kind:z.literal('note'),requestId:z.string().regex(/^[a-f0-9]{24}$/),version:z.number().int().min(0),text:z.string().trim().min(1).max(2000)}).strict(),
  z.object({kind:z.literal('status'),requestId:z.string().regex(/^[a-f0-9]{24}$/),version:z.number().int().min(0),status:z.enum(['recibido','en_revision','presupuestado','aceptado','descartado','pendiente_confirmacion','confirmado','en_preparacion','listo','entregado','cancelado'])}).strict(),
  z.object({kind:z.literal('convert'),requestId:z.string().regex(/^[a-f0-9]{24}$/),version:z.number().int().min(0)}).strict(),
  z.object({kind:z.literal('proposal'),requestId:z.string().regex(/^[a-f0-9]{24}$/),...proposalSchema.shape}).strict(),
]);
export type AdminChange=z.infer<typeof adminChangeSchema>;
