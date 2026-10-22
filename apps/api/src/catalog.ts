import express from 'express';
import type { PipelineStage } from 'mongoose';
import {z} from 'zod';
import {normalize,technicalFacts} from '@ellas/shared';
import {ProductModel,RequestModel} from './models.js';

export const catalogRouter=express.Router();
const escape=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export async function searchProducts(query:string,limit=8){
  const terms=normalize(query).replace(/t-shirt|t shirt/g,'camiseta').split(/\s+/).filter(Boolean).slice(0,8);
  const products=await ProductModel.find(terms.length?{$and:terms.map(term=>({search:{$regex:escape(term),$options:'i'}}))}:{}).sort({reference:1}).limit(197).lean();
  const ref=query.trim().toUpperCase();
  return products.sort((a,b)=>(a.reference===ref?-2:a.reference.startsWith(ref)?-1:0)-(b.reference===ref?-2:b.reference.startsWith(ref)?-1:0)||a.reference.localeCompare(b.reference)).slice(0,limit);
}
catalogRouter.get('/suggestions',async(req,res)=>{const q=z.string().trim().min(2).max(100).parse(req.query.q);res.json({products:await searchProducts(q)});});
const references=(value:unknown,max:number)=>z.string().max(10000).default('').parse(value).split(',').filter(Boolean).map(v=>z.string().regex(/^[A-Z0-9]{2,50}$/).parse(v.toUpperCase())).filter((v,i,a)=>a.indexOf(v)===i).slice(0,max);
catalogRouter.get('/resolve',async(req,res)=>{const refs=references(req.query.refs,197);res.json({products:await ProductModel.find({reference:{$in:refs}}).lean()});});
export function rankingPipeline(now:Date=new Date(),scope:'live'|'demo'='live'):PipelineStage[]{
  return [{$match:{type:'pedido',status:{$in:['confirmado','en_preparacion','listo','entregado']},confirmedAt:{$gte:new Date(now.getTime()-90*86400000),$lte:now},environment:scope,...(scope==='live'?{demo:{$ne:true},isSynthetic:false}:{})}},{$unwind:'$lines'},{$group:{_id:{order:'$_id',reference:'$lines.reference'},units:{$sum:'$lines.quantity'}}},{$group:{_id:'$_id.reference',orders:{$sum:1},units:{$sum:'$units'}}},{$sort:{orders:-1,units:-1,_id:1}},{$project:{_id:0,reference:'$_id',orders:1,units:1}}];
}
export interface RankingItem{reference:string;orders:number;units:number}
let cached:{expires:number;items:RankingItem[];updatedAt:string}|undefined;
export function invalidateRanking(){cached=undefined;}
export async function getRanking(){if(!cached||cached.expires<Date.now())cached={expires:Date.now()+60000,items:await RequestModel.aggregate<RankingItem>(rankingPipeline()),updatedAt:new Date().toISOString()};return {items:cached.items,days:90,updatedAt:cached.updatedAt};}
catalogRouter.get('/ranking',async(_req,res)=>{const ranking=await getRanking();const products=await ProductModel.find({reference:{$in:ranking.items.slice(0,6).map(p=>p.reference)}}).lean();res.json({...ranking,items:ranking.items.slice(0,6).flatMap(item=>{const product=products.find(p=>p.reference===item.reference);return product?[{...item,product}]:[];})});});
catalogRouter.get('/comparison',async(req,res)=>{const refs=references(req.query.refs,3);const products=await ProductModel.find({reference:{$in:refs}}).lean();const ranking=await getRanking();res.json({products:refs.flatMap(ref=>products.filter(p=>p.reference===ref)),facts:products.map(p=>({reference:p.reference,...technicalFacts(p)})),ranking:ranking.items.filter(p=>refs.includes(p.reference)),days:90});});
