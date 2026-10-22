import { readFile } from 'node:fs/promises';
import mongoose from 'mongoose';
import type { Product } from '@ellas/shared';
import { ProductModel,connectDb } from '../apps/api/src/models.js';

const products=JSON.parse(await readFile(new URL('../data/catalog/products.json',import.meta.url),'utf8')) as Product[];
if(!products.length || new Set(products.map(p=>p.reference)).size!==products.length)throw new Error('Catálogo vacío o con referencias duplicadas');
if(products.some(p=>!p.colors.length || !p.image || !p.source.reviewed))throw new Error('Existen fichas incompletas o sin revisión');
await connectDb();
await ProductModel.init();
const result=await ProductModel.bulkWrite(products.map(product=>({replaceOne:{filter:{reference:product.reference},replacement:product,upsert:true}})));
console.log(JSON.stringify({imported:products.length,inserted:result.upsertedCount,updated:result.modifiedCount,persisted:await ProductModel.countDocuments()},null,2));
await mongoose.disconnect();
