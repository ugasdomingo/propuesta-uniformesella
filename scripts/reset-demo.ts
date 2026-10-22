import mongoose from 'mongoose';
import { connectDb,RequestModel } from '../apps/api/src/models.js';
if(process.env.DEMO_MODE!=='true' || !process.argv.includes('--confirm-demo-only'))throw new Error('Requiere DEMO_MODE=true y --confirm-demo-only. Solo elimina el historial ficticio.');
await connectDb();
const result=await RequestModel.deleteMany({demo:true,number:{$regex:'^DEMO-'}});
console.log(`Eliminadas ${result.deletedCount} solicitudes ficticias. Las solicitudes de visitantes se conservan. Ejecuta npm run demo:seed para reponer el historial.`);
await mongoose.disconnect();
