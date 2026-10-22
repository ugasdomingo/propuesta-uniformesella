import { readFile,stat,writeFile,mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve,sep } from 'node:path';
import { z } from 'zod';
import type { Product } from '@ellas/shared';

const color=z.object({code:z.string().min(1),name:z.string().min(1),hex:z.string().regex(/^#[a-f0-9]{6}$/i),swatch:z.string().startsWith('/catalog/swatches/'),sizes:z.array(z.string().min(1)).min(1)}).strict();
const product=z.object({reference:z.string().regex(/^[A-Z0-9]+$/),slug:z.string().regex(/^[a-z0-9]+$/),name:z.string().min(2),description:z.string().min(5),category:z.string().min(1),collection:z.string().min(1),audience:z.string().min(1),composition:z.string().min(1),compositionNotes:z.array(z.string()),weight:z.string().nullable(),colors:z.array(color).min(1),sizes:z.array(z.string()).min(1),measurements:z.array(z.object({size:z.string(),values:z.record(z.string(),z.string())}).strict()),image:z.string().startsWith('/catalog/'),imageSmall:z.string().startsWith('/catalog/'),imageWidth:z.number().positive().int(),imageHeight:z.number().positive().int(),sourceImages:z.array(z.string().startsWith('/catalog/sources/')).min(1),source:z.object({pdf:z.literal('jhktshirt_catalogue_es.pdf'),digitalPages:z.array(z.number().int().min(2).max(114)).min(1),printedPages:z.string().min(1),directorySheets:z.array(z.string()).min(1),supplierUrl:z.url(),reviewed:z.literal(true),reviewNotes:z.array(z.string())}).strict(),search:z.string().min(1)}).strict();
const products=z.array(product).min(1).parse(JSON.parse(await readFile('data/catalog/products.json','utf8')));
const inventory=JSON.parse(await readFile('data/catalog/inventory.json','utf8')) as {reference:string;expectedColors:number|null;printedPages:string}[];
const ledger=JSON.parse(await readFile('data/catalog/review-ledger.json','utf8')) as {references:Record<string,{fingerprint:string}>};
const canonicalRef=(ref:string)=>ref.split('(')[0]!.replace('TSR1600RG','TSR160ORG');
const expected=new Set(inventory.map(i=>canonicalRef(i.reference)));
const actual=new Set(products.map(p=>p.reference));
const failures:string[]=[];
if(products.length!==actual.size)failures.push('Referencias duplicadas');
for(const ref of expected)if(!actual.has(ref))failures.push(`Referencia ausente: ${ref}`);
for(const ref of actual)if(!expected.has(ref))failures.push(`Referencia ajena al directorio: ${ref}`);
if(new Set(products.map(p=>p.slug)).size!==products.length)failures.push('Slugs duplicados');
const publicRoot=resolve('apps/web/public');
const inspected=new Set<string>();
for(const p of products){
  if(new Set(p.colors.map(c=>c.code)).size!==p.colors.length)failures.push(`${p.reference}: colores duplicados`);
  const union=new Set(p.colors.flatMap(c=>c.sizes));
  if(p.sizes.length!==new Set(p.sizes).size || p.sizes.length!==union.size || p.sizes.some(s=>!union.has(s)))failures.push(`${p.reference}: tallas incoherentes`);
  for(const c of p.colors)if(c.sizes.length!==new Set(c.sizes).size)failures.push(`${p.reference}/${c.code}: tallas duplicadas`);
  if(p.measurements.length!==p.sizes.length || p.sizes.some(s=>!p.measurements.find(m=>m.size===s && Object.keys(m.values).length)))failures.push(`${p.reference}: guía de medidas incompleta`);
  const expectedColors=inventory.filter(i=>canonicalRef(i.reference)===p.reference).reduce((sum,e)=>sum+(e.expectedColors||0),0);
  if(expectedColors && p.colors.length!==expectedColors)failures.push(`${p.reference}: ${p.colors.length}/${expectedColors} colores del PDF`);
  for(const src of [p.image,p.imageSmall,...p.sourceImages,...p.colors.map(c=>c.swatch)]){
    if(inspected.has(src))continue;inspected.add(src);
    const file=resolve(publicRoot,'.'+src);
    if(!file.startsWith(publicRoot+sep)){failures.push(`Ruta fuera de public: ${src}`);continue;}
    try{if((await stat(file)).size===0)failures.push(`Imagen vacía: ${src}`);}catch{failures.push(`Imagen ausente: ${src}`);}
  }
  const fingerprint=fingerprintOf(p);
  if(ledger.references[p.reference]?.fingerprint!==fingerprint)failures.push(`${p.reference}: la ficha cambió después de su revisión`);
}
const jt=products.find(p=>p.reference==='JT150');
if(jt){const extended=jt.colors.filter(c=>c.sizes.includes('5XL')).map(c=>c.code).sort().join(',');if(extended!==['WH','GM','BK','RD','RB','NY'].sort().join(','))failures.push('JT150: carta reducida de 4XL/5XL incorrecta');}
const polo=products.find(p=>p.reference==='PORA210');
if(polo)for(const c of polo.colors)if((c.code.endsWith('W')||c.code.length>3)&&c.sizes.some(s=>s==='4XL'||s==='5XL'))failures.push(`PORA210/${c.code}: Wash y Contrast no admiten 4XL/5XL`);
const summary={directoryEntries:inventory.length,products:products.length,colors:products.reduce((sum,p)=>sum+p.colors.length,0),validVariants:products.reduce((sum,p)=>sum+p.colors.reduce((n,c)=>n+c.sizes.length,0),0),imagesChecked:inspected.size,missingReferences:[...expected].filter(r=>!actual.has(r)),extraReferences:[...actual].filter(r=>!expected.has(r)),unreviewed:products.filter(p=>!p.source.reviewed).length,failures};
await mkdir('docs',{recursive:true});
await writeFile('data/catalog/audit.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
if(failures.length)process.exitCode=1;

function sorted(value:unknown):unknown {if(Array.isArray(value))return value.map(sorted);if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([key,v])=>[key,sorted(v)]));return value;}
function fingerprintOf(p:Product){const fields={reference:p.reference,colors:p.colors,sizes:p.sizes,composition:p.composition,compositionNotes:p.compositionNotes,weight:p.weight,measurements:p.measurements,image:p.image,imageSmall:p.imageSmall,sourceImages:p.sourceImages};return createHash('sha256').update(JSON.stringify(sorted(fields))).digest('hex');}
