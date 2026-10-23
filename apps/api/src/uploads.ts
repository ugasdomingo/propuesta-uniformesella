import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import mongoose from 'mongoose';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { config } from './config.js';
import { tokenHash, requireAuth } from './security.js';
import { UploadModel, RequestModel } from './models.js';

export const uploadRouter = express.Router();
const parser = multer({ storage: multer.memoryStorage(), limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 0 } });
const s3 = config.S3_BUCKET ? new S3Client({ endpoint: config.S3_ENDPOINT, region: config.S3_REGION, credentials: { accessKeyId: config.S3_ACCESS_KEY_ID, secretAccessKey: config.S3_SECRET_ACCESS_KEY }, forcePathStyle: true }) : undefined;
function bucket() { if (!mongoose.connection.db) throw new Error('Base de datos no conectada'); return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'privateLogos' }); }
uploadRouter.post('/', parser.single('logo'), async (req, res) => {
  if (!req.file) return void res.status(400).json({ message: 'Selecciona una imagen PNG, JPG o WebP (máx. 3 MB)' });
  const fileType = await fileTypeFromBuffer(req.file.buffer);
  if (!fileType || !['image/jpeg','image/png','image/webp'].includes(fileType.mime)) return void res.status(400).json({ message: 'Solo se permiten imágenes PNG, JPG o WebP' });
  let buffer: Buffer;
  try { buffer = await sharp(req.file.buffer, { limitInputPixels: 25000000 }).rotate().resize({ width: 3000, height: 3000, fit: 'inside', withoutEnlargement: true }).png().toBuffer(); }
  catch { return void res.status(400).json({ message: 'La imagen no se puede leer o es demasiado grande' }); }
  const id = new mongoose.Types.ObjectId();
  const token = randomBytes(32).toString('hex');
  const key = `logos/${id}.png`;
  if (s3) await s3.send(new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, Body: buffer, ContentType: 'image/png' }));
  else await pipeline(Readable.from(buffer), bucket().openUploadStreamWithId(id, key, { metadata: { contentType: 'image/png' } }));
  await UploadModel.create({ _id: id, name: req.file.originalname.replace(/[\x00-\x1f<>"/\\]/g, '').slice(0,120) || 'logo.png', mime: 'image/png', size: buffer.length, tokenHash: tokenHash(token), storage: s3 ? 's3' : 'gridfs', key, expiresAt: new Date(Date.now()+24*3600000) });
  res.status(201).json({ id: String(id), token, name: req.file.originalname.slice(0,120) });
});
uploadRouter.get('/:id', requireAuth, async (req, res) => {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) return void res.sendStatus(404);
  const file = await UploadModel.findOne({ _id: req.params.id, claimedBy: { $exists: true } }).lean();
  if (!file) return void res.sendStatus(404);
  if(res.locals.auth.role==='customer' && !await RequestModel.exists({_id:file.claimedBy,customerId:res.locals.auth.userId}))return void res.sendStatus(404);
  res.set({ 'Content-Type': 'image/png', 'Content-Disposition': `inline; filename="logo-${file._id}.png"`, 'Cache-Control':'private, no-store', 'X-Content-Type-Options':'nosniff' });
  if (file.storage === 's3') {
    if (!s3) throw new Error('Almacenamiento S3 no configurado');
    const result = await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: file.key }));
    if (!result.Body) return void res.sendStatus(404);
    await pipeline(result.Body as Readable, res);
  } else await pipeline(bucket().openDownloadStream(file._id), res);
});
