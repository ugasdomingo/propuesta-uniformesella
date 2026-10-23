import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import { quoteStatuses,orderStatuses,type RequestLine,type Proposal } from '@ellas/shared';
import { connectDb,ProductModel,RequestModel } from '../apps/api/src/models.js';

if(process.env.DEMO_MODE!=='true')throw new Error('La carga ficticia solo está permitida con DEMO_MODE=true');
await connectDb();
await RequestModel.init();
const products=await ProductModel.find({reference:{$in:['JT150','JTPOLO','JTSWKNG','WKOPORTO','TSRA150']}}).lean();
if(products.length<4)throw new Error('Importa el catálogo antes del historial de demo');
const companies=['Estudio Horizonte (demo)','Café del Patio (demo)','Clínica Ejemplo (demo)','Taller Prisma (demo)','Equipo Norte (demo)','Colegio Imaginario (demo)','Restaurante Demo (demo)','Servicios Muestra (demo)','Club Ejemplo (demo)','Equipo de Eventos (demo)'];
for(let i=0;i<20;i++){
  const type=i%2===0?'presupuesto':'pedido';
  const status=type==='presupuesto'?quoteStatuses[Math.floor(i/2)%quoteStatuses.length]!:orderStatuses[Math.floor(i/2)%orderStatuses.length]!;
  const number=`DEMO-2026-${String(i+1).padStart(3,'0')}`;
  const date=new Date(Date.now()-(i+1)*17*3600000);
  const lines:RequestLine[]=[];
  for(let j=0;j<(i%3)+1;j++){
    const product=products[(i+j)%products.length]!;const color=product.colors[j%product.colors.length]!;
    for(const size of color.sizes.slice(0,2))lines.push({reference:product.reference,name:product.name,color:color.code,colorName:color.name,size,quantity:3+(i+j)%12,image:product.imageSmall,composition:product.composition});
  }
  const hasProposal=['presupuestado','aceptado','confirmado','en_preparacion','listo','entregado'].includes(status);
  const prices=lines.map((_,n)=>850+n*150);const subtotal=lines.reduce((sum,line,n)=>sum+line.quantity*prices[n]!,0)+2500;
  const proposal:Proposal|undefined=hasProposal?{prices,personalizationCents:2000,deliveryCents:500,taxRate:21,notes:'DATOS FICTICIOS. Importes ilustrativos para la demo; no son tarifas del catálogo.',subtotalCents:subtotal,taxCents:Math.round(subtotal*.21),totalCents:subtotal+Math.round(subtotal*.21),updatedAt:date.toISOString(),by:'Semilla de demostración'}:undefined;
  await RequestModel.updateOne({number},{$setOnInsert:{number,idempotencyKey:`seed-${i+1}`,payloadHash:createHash('sha256').update(number).digest('hex'),type,status,contact:{name:`Persona ficticia ${i+1}`,email:`persona${i+1}@example.invalid`,phone:`+34 000 000 ${String(i+1).padStart(3,'0')}`,company:companies[i%companies.length]!},lines,personalization:{enabled:i%3!==0,technique:'asesoramiento',placement:i%3!==0?'Pecho izquierdo (ejemplo)':'',notes:'Ejemplo ficticio de personalización, sin logo adjunto.'},notes:'SOLICITUD FICTICIA DE DEMOSTRACIÓN. No contactar ni enviar correos.',demo:true,environment:'demo',sourceChannel:'web',isSynthetic:true,notificationsAllowed:false,proposal,version:0,privacyAcceptedAt:date,createdAt:date,updatedAt:date,events:[{at:date.toISOString(),by:'Semilla de demostración',kind:'created',text:'Datos de ejemplo. Esta solicitud no genera correos.'}]}},{upsert:true,timestamps:false});
}
console.log(`Historial disponible: ${await RequestModel.countDocuments({demo:true})} solicitudes ficticias. No se han creado trabajos de correo.`);
await mongoose.disconnect();
