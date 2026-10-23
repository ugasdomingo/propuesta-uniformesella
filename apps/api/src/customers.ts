import express from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { RequestModel } from './models.js';
import { requireAuth, requireCustomer } from './security.js';

export const customerRouter=express.Router();
customerRouter.use(requireAuth,requireCustomer);
customerRouter.get('/requests',async(req,res)=>{
  const {page}=z.object({page:z.coerce.number().int().min(1).max(10000).default(1)}).strict().parse(req.query);
  const filter={customerId:res.locals.auth.userId};
  const [requests,total]=await Promise.all([RequestModel.find(filter).select('number type status createdAt updatedAt demo isSynthetic lines.quantity').sort({createdAt:-1,_id:-1}).skip((page-1)*20).limit(20).lean(),RequestModel.countDocuments(filter)]);
  res.json({requests:requests.map(r=>({_id:String(r._id),number:r.number,type:r.type,status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt,demo:r.demo||r.isSynthetic===true,quantity:r.lines.reduce((n,l)=>n+l.quantity,0)})),total,page,pages:Math.ceil(total/20)});
});
customerRouter.get('/requests/:id',async(req,res)=>{
  if(!mongoose.isObjectIdOrHexString(req.params.id))return void res.status(404).json({message:'Solicitud no encontrada'});
  const r=await RequestModel.findOne({_id:req.params.id,customerId:res.locals.auth.userId}).lean();
  if(!r)return void res.status(404).json({message:'Solicitud no encontrada'});
  // Only customer fields; internal events, capture records, hashes and staff identities stay private.
  res.json({_id:String(r._id),number:r.number,type:r.type,status:r.status,createdAt:r.createdAt,updatedAt:r.updatedAt,demo:r.demo||r.isSynthetic===true,quantity:r.lines.reduce((n,l)=>n+l.quantity,0),desiredDate:r.desiredDate,notes:r.notes,
    contact:{name:r.contact.name,email:r.contact.email,phone:r.contact.phone,company:r.contact.company},
    lines:r.lines.map(l=>({reference:l.reference,name:l.name,color:l.color,colorName:l.colorName,size:l.size,quantity:l.quantity,image:l.image,composition:l.composition})),
    personalization:{enabled:r.personalization.enabled,technique:r.personalization.technique,placement:r.personalization.placement,notes:r.personalization.notes,uploadId:r.personalization.uploadId},
    proposal:r.proposal?{prices:r.proposal.prices,personalizationCents:r.proposal.personalizationCents,deliveryCents:r.proposal.deliveryCents,taxRate:r.proposal.taxRate,notes:r.proposal.notes,subtotalCents:r.proposal.subtotalCents,taxCents:r.proposal.taxCents,totalCents:r.proposal.totalCents,updatedAt:r.proposal.updatedAt}:undefined});
});
