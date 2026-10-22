import {z} from 'zod';
import {lineSchema,type Product} from '@ellas/shared';
export default defineNuxtPlugin(()=>{
  const selection=useSelection();const comparison=useComparison();
  const lines=z.array(lineSchema.extend({name:z.string(),colorName:z.string(),image:z.string()})).max(250);
  const draft=z.object({color:z.string().max(40),quantities:z.record(z.string().max(100),z.union([z.number(),z.string().max(30)]))});
  onNuxtReady(async()=>{
    try{const saved=localStorage.getItem('ellas-order-v2');if(saved){const state=z.object({version:z.literal(2),lines,drafts:z.record(z.string().regex(/^[A-Z0-9]+$/),draft)}).parse(JSON.parse(saved));selection.lines=state.lines;selection.drafts=state.drafts;}else{const legacy=localStorage.getItem('ellas-selection-v1');if(legacy)selection.lines=lines.parse(JSON.parse(legacy));}}catch{selection.restoreWarning='No se ha podido recuperar parte del borrador guardado. Revisa las prendas antes de enviar.';}
    try{const query=new URLSearchParams(window.location.search).get('refs');const restored=window.location.pathname==='/comparar'&&query!==null?query.split(',').filter(Boolean).map(r=>r.toUpperCase()):JSON.parse(localStorage.getItem('ellas-comparison-v1')||'[]');comparison.references=z.array(z.string().regex(/^[A-Z0-9]{2,50}$/)).max(3).parse(restored);}catch{/* A corrupt comparison does not alter the order. */}
    selection.ready=true;
    selection.$subscribe((_mutation,state)=>{try{localStorage.setItem('ellas-order-v2',JSON.stringify({version:2,lines:state.lines,drafts:state.drafts}));}catch{selection.restoreWarning='Tu navegador no permite guardar el borrador. Mantén esta página abierta hasta enviar.';}});
    comparison.$subscribe((_mutation,state)=>{try{localStorage.setItem('ellas-comparison-v1',JSON.stringify(state.references));}catch{/* Comparison remains usable for this session. */}});
    if(selection.lines.length)try{const refs=[...new Set(selection.lines.map(l=>l.reference))];const data=await $fetch<{products:Product[]}>('/api/catalog/resolve',{query:{refs:refs.join(',')}});const changed=selection.lines.filter(l=>!data.products.find(p=>p.reference===l.reference)?.colors.some(c=>c.code===l.color&&c.sizes.includes(l.size)));if(changed.length)selection.restoreWarning='Hay variantes que han cambiado: '+changed.map(l=>[l.reference,l.color,l.size].join(' / ')).join('; ')+'. Las demás prendas se conservan.';}catch{selection.restoreWarning='Revisaremos de nuevo el catálogo antes de enviar. Tu selección se conserva.';}
  });
});
