import {randomBytes,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import mongoose from 'mongoose';
import {z} from 'zod';
import {config} from '../apps/api/src/config.js';
import {connectDb,UserModel,ProductModel,RequestModel} from '../apps/api/src/models.js';
import {hashPassword,verifyPassword} from '../apps/api/src/security.js';

if(config.DEMO_MODE!=='true')throw new Error('La creación de cuentas ficticias requiere DEMO_MODE=true.');
if(!config.DEMO_ADMIN_EMAIL||!config.DEMO_ADMIN_PASSWORD)throw new Error('Configura las credenciales privadas del administrador.');
const customerEmail=process.env.DEMO_CUSTOMER_EMAIL||'cliente@demo.uniformesellas.local';
const customerPassword=process.env.DEMO_CUSTOMER_PASSWORD||randomBytes(18).toString('base64url');
if(!z.email().safeParse(customerEmail).success||customerPassword.length<12)throw new Error('Revisa DEMO_CUSTOMER_EMAIL y DEMO_CUSTOMER_PASSWORD; no se han mostrado sus valores.');
if(customerEmail.toLowerCase()===config.DEMO_ADMIN_EMAIL.toLowerCase())throw new Error('Las dos cuentas necesitan emails distintos.');
// Save a newly generated password privately before creating the account, so it cannot be lost on a partial failure.
const envPath=new URL('../.env',import.meta.url);
let env=await readFile(envPath,'utf8');
for(const [key,value] of [['DEMO_CUSTOMER_EMAIL',customerEmail],['DEMO_CUSTOMER_PASSWORD',customerPassword]]){
  if(!process.env[key!]){
    const pattern=new RegExp('^'+key+'=.*$','m');
    env=pattern.test(env)?env.replace(pattern,`${key}=${value}`):env.trimEnd()+`\n${key}=${value}\n`;
  }
}
await writeFile(envPath,env,{mode:0o600});
try{
  await connectDb();await Promise.all([UserModel.init(),RequestModel.init()]);
  async function ensureUser(email:string,password:string,name:string,role:'admin'|'customer'){
    const existing=await UserModel.findOne({email:email.toLowerCase()});
    const user=existing||await UserModel.findOneAndUpdate({email:email.toLowerCase()},{$setOnInsert:{email:email.toLowerCase(),name,passwordHash:await hashPassword(password),role,active:true,demo:role==='customer'}},{upsert:true,new:true});
    if(!user||user.role!==role||!user.active||(role==='customer'&&!user.demo)||!await verifyPassword(password,user.passwordHash))throw new Error('Una cuenta existente no coincide con la configuración privada. No se han cambiado contraseñas, permisos ni sesiones.');
    return user;
  }
  const admin=await ensureUser(config.DEMO_ADMIN_EMAIL,config.DEMO_ADMIN_PASSWORD,'Equipo de demostración','admin');
  const customer=await ensureUser(customerEmail,customerPassword,'Cliente de demostración','customer');
  const product=await ProductModel.findOne({reference:'JT150'}).lean();
  const color=product?.colors.find(c=>c.code==='WH'&&c.sizes.includes('M')&&c.sizes.includes('L'));
  if(!product||!color)throw new Error('Importa primero el catálogo revisado.');
  const number='DEMO-CLIENTE-2026-001';
  const timestamp=new Date().toISOString();
  await RequestModel.updateOne({number},{$setOnInsert:{number,idempotencyKey:'seed-customer-demo-v1',payloadHash:createHash('sha256').update(number).digest('hex'),customerId:String(customer._id),type:'pedido',status:'pendiente_confirmacion',contact:{name:customer.name,email:customer.email,phone:'+34 000 000 004',company:'Equipo de demostración'},lines:[{size:'M',quantity:3},{size:'L',quantity:2}].map(v=>({...v,reference:product.reference,name:product.name,color:color.code,colorName:color.name,image:product.imageSmall,composition:product.composition})),personalization:{enabled:false,technique:'asesoramiento',placement:'',notes:''},notes:'Pedido ficticio para mostrar el seguimiento de la cuenta de comprador.',demo:true,isSynthetic:true,environment:'demo',sourceChannel:'web',notificationsAllowed:false,version:0,createdAt:timestamp,updatedAt:timestamp,events:[{at:new Date().toISOString(),by:'Semilla de demostración',kind:'created',text:'Ejemplo ficticio vinculado a la cuenta de comprador. Sin envío de emails.'}]}},{upsert:true,timestamps:false});
  await mkdir(new URL('../.local/',import.meta.url),{recursive:true});
  await writeFile(new URL('../.local/USUARIOS-DEMO.md',import.meta.url),`# Usuarios privados de la demo\n\nBase de datos: MongoDB Atlas. Mismas cuentas al desplegar contra esta base.\n\n## Administrador\n\nAcceso: ${config.APP_URL}/admin/login\n\nUsuario: ${admin.email}\n\nContraseña: ${config.DEMO_ADMIN_PASSWORD}\n\nPermisos: panel del equipo y asistente administrativo.\n\n## Comprador\n\nAcceso: ${config.APP_URL}/mi-cuenta/entrar\n\nUsuario: ${customer.email}\n\nContraseña: ${customerPassword}\n\nPermisos: solo pedidos y logos vinculados a su identificador. Cuenta ficticia sin avisos por email. Incluye un pedido de ejemplo.\n\nArchivo excluido de Git. No lo publiques ni lo copies a la web. Sustituye el origen localhost por la URL estable cuando despliegues.\n`,{mode:0o600});
  console.log('Administrador y comprador verificados en Atlas. Accesos guardados en .local/USUARIOS-DEMO.md, excluido de Git. No se han impreso contraseñas ni enviado emails.');
}finally{await mongoose.disconnect();}
