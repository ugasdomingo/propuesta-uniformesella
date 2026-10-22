import { z } from 'zod';

export const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const quoteStatuses = ['recibido', 'en_revision', 'presupuestado', 'aceptado', 'descartado'] as const;
export const orderStatuses = ['pendiente_confirmacion', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado'] as const;
export const statuses = [...quoteStatuses, ...orderStatuses] as const;
export const statusLabels: Record<(typeof statuses)[number], string> = {
  recibido: 'Recibido', en_revision: 'En revisión', presupuestado: 'Presupuestado', aceptado: 'Aceptado', descartado: 'Descartado',
  pendiente_confirmacion: 'Pendiente de confirmación', confirmado: 'Confirmado', en_preparacion: 'En preparación', listo: 'Listo', entregado: 'Entregado', cancelado: 'Cancelado',
};
export const lineSchema = z.object({ reference: z.string().min(2).max(50), color: z.string().min(1).max(40), size: z.string().min(1).max(30), quantity: z.number().int().min(1).max(10000) }).strict();
export const contactSchema = z.object({
  name: z.string().trim().min(2, 'Indica tu nombre').max(100),
  email: z.email('Revisa tu email').max(254), phone: z.string().trim().min(7, 'Indica un teléfono de contacto').max(30).regex(/^[+\d\s().-]+$/, 'Revisa tu teléfono'),
  company: z.string().trim().max(150).default(''),
}).strict();
export const personalizationSchema = z.object({ enabled: z.boolean(), technique: z.enum(['asesoramiento', 'bordado', 'serigrafia', 'dtf', 'transfer']).default('asesoramiento'), placement: z.string().trim().max(200).default(''), notes: z.string().trim().max(2000).default(''), uploadId: z.string().regex(/^[a-f0-9]{24}$/).optional(), uploadToken: z.string().max(128).optional() }).strict();
export const requestSchema = z.object({
  type: z.enum(['presupuesto', 'pedido']), contact: contactSchema, lines: z.array(lineSchema).min(1).max(250),
  personalization: personalizationSchema,
  notes: z.string().trim().max(3000).default(''), desiredDate: z.iso.date().optional(),
  privacy: z.literal(true, 'Debes aceptar el tratamiento de tus datos para gestionar la solicitud'), website: z.string().max(0).default(''),
}).strict();
export const loginSchema = z.object({ email: z.email().max(254), password: z.string().min(1).max(200) }).strict();
export const noteSchema = z.object({ text: z.string().trim().min(1).max(2000), version: z.number().int().min(0) }).strict();
export const stateSchema = z.object({ status: z.enum(statuses), version: z.number().int().min(0) }).strict();
export const proposalSchema = z.object({
  prices: z.array(z.number().int().min(0).max(10000000)).min(1).max(250),
  personalizationCents: z.number().int().min(0).max(100000000), deliveryCents: z.number().int().min(0).max(100000000),
  taxRate: z.number().min(0).max(100), notes: z.string().trim().max(2000), version: z.number().int().min(0),
}).strict();
export type RequestInput = z.infer<typeof requestSchema>;
export type SelectionLine = z.infer<typeof lineSchema>;
export type Personalization = z.infer<typeof personalizationSchema>;
export type Status = (typeof statuses)[number];

export interface ProductColor { code: string; name: string; hex: string; swatch?: string; sizes: string[] }
export interface Product {
  reference: string; slug: string; name: string; description: string; category: string; collection: string; audience: string;
  composition: string; compositionNotes: string[]; weight: string | null;
  colors: ProductColor[]; sizes: string[]; measurements: { size: string; values: Record<string, string> }[];
  image: string; imageSmall: string; imageWidth: number; imageHeight: number; sourceImages: string[];
  source: { pdf: string; digitalPages: number[]; printedPages: string; directorySheets: string[]; supplierUrl: string; reviewed: boolean; reviewNotes: string[] };
  search: string;
}
export interface CartLine extends SelectionLine { name: string; colorName: string; image: string }
export interface RequestLine extends CartLine { composition: string }
export interface Proposal { prices: number[]; personalizationCents: number; deliveryCents: number; taxRate: number; notes: string; subtotalCents: number; taxCents: number; totalCents: number; updatedAt: string; by: string }
export interface RequestRecord {
  sourceChannel?: 'web' | 'whatsapp' | 'instagram' | 'email' | 'otro';
  environment?: 'demo' | 'live'; isSynthetic?: boolean; confirmedAt?: string;
  notificationsAllowed?:boolean;
  _id: string; number: string; type: 'presupuesto' | 'pedido'; status: Status; contact: RequestInput['contact']; lines: RequestLine[];
  personalization: Omit<Personalization, 'uploadToken'>; notes: string; desiredDate?: string; demo: boolean;
  events: { at: string; by: string; kind: string; text: string; actionId?:string;proposedBy?:string;confirmedBy?:string }[]; proposal?: Proposal;
  email: { role: string; status: string; attempts: number; lastError?: string; providerId?: string; sentAt?: string; nextAttemptAt?: string }[];
  createdAt: string; updatedAt: string; version: number;
}
export const money = (cents: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100);
