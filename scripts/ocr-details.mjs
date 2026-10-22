import { createWorker, PSM } from 'tesseract.js';
import { readFile,writeFile,mkdir,access } from 'node:fs/promises';
import { resolve } from 'node:path';
const products=JSON.parse(await readFile('data/catalog/products.json','utf8'));
const sheets=[...new Set(products.flatMap(p=>p.sourceImages.map(src=>src.split('/').at(-1).replace('.webp','').toUpperCase())))].sort();
await mkdir('tmp/catalog/details-ocr',{recursive:true});
let next=0;
async function run(){
  const worker=await createWorker('spa+eng',1,{langPath:resolve('.local/tessdata'),gzip:false,cacheMethod:'none'});
  await worker.setParameters({tessedit_pageseg_mode:PSM.AUTO,user_defined_dpi:'216'});
  while(next<sheets.length){
    const sheet=sheets[next++];const output=`tmp/catalog/details-ocr/${sheet}.json`;
    try{await access(output);continue;}catch{}
    const {data}=await worker.recognize(`tmp/catalog/ocr-images/${sheet}.png`,{}, {text:true,blocks:true});
    await writeFile(output,JSON.stringify({text:data.text,blocks:data.blocks},null,2));
    console.log(sheet);
  }
  await worker.terminate();
}
await Promise.all([run(),run()]);
