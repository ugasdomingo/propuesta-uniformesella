import mongoose from 'mongoose';
import {config} from '../apps/api/src/config.js';
import {connectDb,RequestModel} from '../apps/api/src/models.js';
await connectDb();
const filter={environment:{$exists:false}};
const before=await RequestModel.collection.countDocuments(filter);
const marked=await RequestModel.collection.countDocuments({number:'UE-2026-0309682444'});
console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'preview',legacyRequests:before,knownManualExample:marked,preservesSnapshots:true}));
if(process.argv.includes('--apply')){
  if(config.DEMO_MODE!=='true' && before)throw new Error('La migración histórica requiere el entorno demo original. No clasifiques ventas reales automáticamente.');
  await RequestModel.collection.updateMany(filter,{$set:{environment:'demo',sourceChannel:'web',isSynthetic:false}});
  await RequestModel.collection.updateMany({demo:true},{$set:{isSynthetic:true,notificationsAllowed:false}});
  await RequestModel.collection.updateOne({number:'UE-2026-0309682444'},{$set:{isSynthetic:true,notificationsAllowed:false}});
  console.log('Metadatos migrados; snapshots, importes e historial conservados.');
}
await mongoose.disconnect();
