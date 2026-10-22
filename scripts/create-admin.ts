import mongoose from 'mongoose';
import { config } from '../apps/api/src/config.js';
import { hashPassword } from '../apps/api/src/security.js';
import { connectDb,UserModel,SessionModel } from '../apps/api/src/models.js';

if(!config.DEMO_ADMIN_EMAIL || !config.DEMO_ADMIN_PASSWORD)throw new Error('Configura DEMO_ADMIN_EMAIL y DEMO_ADMIN_PASSWORD fuera del repositorio. Contraseña mínima: 12 caracteres.');
await connectDb();
await UserModel.init();
const user=await UserModel.findOneAndUpdate({email:config.DEMO_ADMIN_EMAIL.toLowerCase()},{$set:{name:'Equipo de demostración',passwordHash:await hashPassword(config.DEMO_ADMIN_PASSWORD),active:true,role:'admin'}},{upsert:true,new:true});
await SessionModel.deleteMany({userId:user._id});
console.log('Administrador configurado. La contraseña no se imprime ni se publica. Las sesiones anteriores se han cerrado.');
await mongoose.disconnect();
