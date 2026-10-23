import mongoose, { Schema } from 'mongoose';
import type { Product, RequestRecord, RequestLine } from '@ellas/shared';

const colorSchema = new Schema({ code: String, name: String, hex: String, swatch: String, sizes: [String] }, { _id: false });
const productSchema = new Schema<Product>({
  reference: { type: String, required: true, unique: true }, slug: { type: String, required: true, unique: true },
  name: String, description: String, category: String, collection: String, audience: String, composition: String, compositionNotes: [String], weight: String,
  colors: [colorSchema], sizes: [String], measurements: [Schema.Types.Mixed], image: String, imageSmall: String, imageWidth: Number, imageHeight: Number, sourceImages: [String], source: Schema.Types.Mixed, search: String,
}, { timestamps: true, versionKey: false, suppressReservedKeysWarning: true });
productSchema.index({ category: 1, collection: 1, reference: 1 });
productSchema.index({ 'colors.code': 1, 'colors.sizes': 1 });
export const ProductModel = mongoose.model<Product>('Product', productSchema);

// The request embeds a catalog snapshot; later product edits cannot change its history.
export type StoredRequest = Omit<RequestRecord, '_id' | 'email'> & { customerId?:string; idempotencyKey: string; payloadHash: string; privacyAcceptedAt?: Date; notificationsAllowed?:boolean; captureRecord?:{by:string;note?:string;externalId?:string;at:Date} };
const requestLineSchema = new Schema<RequestLine>({ reference: String, name: String, color: String, colorName: String, size: String, quantity: Number, image: String, composition: String }, { _id: false });
const requestDbSchema = new Schema<StoredRequest>({
  number: { type: String, required: true, unique: true }, idempotencyKey: { type: String, required: true, unique: true }, payloadHash: { type: String, required: true },
  customerId: String,
  type: { type: String, required: true }, status: { type: String, required: true }, contact: { type: Schema.Types.Mixed, required: true },
  lines: { type: [requestLineSchema], required: true }, personalization: Schema.Types.Mixed, notes: String, desiredDate: String, demo: { type: Boolean, default: false },
  sourceChannel:{type:String,enum:['web','whatsapp','instagram','email','otro'],default:'web'},environment:{type:String,enum:['demo','live'],default:'demo'},isSynthetic:{type:Boolean,default:false},confirmedAt:Date,notificationsAllowed:{type:Boolean,default:true},captureRecord:Schema.Types.Mixed,
  events: [Schema.Types.Mixed], proposal: Schema.Types.Mixed, version: { type: Number, default: 0 }, privacyAcceptedAt: Date,
}, { timestamps: true, versionKey: false });
requestDbSchema.index({ status: 1, createdAt: -1 });
requestDbSchema.index({customerId:1,createdAt:-1});
requestDbSchema.index({ type: 1, createdAt: -1 });
requestDbSchema.index({environment:1,isSynthetic:1,type:1,status:1,confirmedAt:-1});
export const RequestModel = mongoose.model<StoredRequest>('Request', requestDbSchema);
export const UserModel = mongoose.model('User', new Schema({ email: { type: String, unique: true, required: true }, name: { type: String, required: true }, passwordHash: { type: String, required: true }, active: { type: Boolean, default: true }, role: { type: String, enum: ['admin', 'staff', 'customer'], default: 'staff' }, demo: {type:Boolean,default:false} }, { timestamps: true }));
export const SessionModel = mongoose.model('Session', new Schema({ tokenHash: { type: String, unique: true, required: true }, userId: { type: Schema.Types.ObjectId, required: true, ref: 'User' }, csrf: { type: String, required: true }, expiresAt: { type: Date, required: true, index: { expires: 0 } } }));
export const UploadModel = mongoose.model('Upload', new Schema({ name: { type: String, required: true }, mime: { type: String, required: true }, size: { type: Number, required: true }, tokenHash: { type: String, required: true }, storage: { type: String, enum: ['gridfs', 's3'], required: true }, key: { type: String, required: true }, claimedBy: { type: Schema.Types.ObjectId, ref: 'Request' }, expiresAt: { type: Date }, createdAt: { type: Date, default: Date.now } }));
export const EmailModel = mongoose.model('EmailJob', new Schema({
  requestId: { type: Schema.Types.ObjectId, required: true, ref: 'Request' }, role: { type: String, enum: ['business', 'customer'], required: true },
  status: { type: String, enum: ['pending', 'sending', 'sent', 'failed', 'unconfigured'], default: 'pending' }, attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: Date.now }, leaseUntil: Date, lastError: String, providerId: String, sentAt: Date,
}, { timestamps: true }));
EmailModel.schema.index({ requestId: 1, role: 1 }, { unique: true });
EmailModel.schema.index({ status: 1, nextAttemptAt: 1 });
export async function connectDb() { await mongoose.connect(configUri(), { serverSelectionTimeoutMS: 10000 }); }
function configUri() { const uri = process.env.MONGODB_URI; if (!uri) throw new Error('MONGODB_URI es obligatorio'); return uri; }
