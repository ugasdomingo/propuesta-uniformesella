import { createWorker, PSM } from 'tesseract.js';
import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
const circles=JSON.parse(await readFile('tmp/catalog/circles.json','utf8'));
await mkdir('tmp/catalog/code-ocr',{recursive:true});
const worker=await createWorker('eng',1,{langPath:resolve('.local/tessdata'),gzip:false,cacheMethod:'none'});
await worker.setParameters({tessedit_pageseg_mode:PSM.SINGLE_WORD,tessedit_char_whitelist:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/',user_defined_dpi:'150'});
for(const [page,items] of Object.entries(circles)){
  const results=[];
  for(let i=0;i<items.length;i++){
    const crop=await readFile(`tmp/catalog/color-crops/${page}-${i}.png`);
    const {data}=await worker.recognize(crop);
    results.push({index:i,code:data.text.replace(/[^A-Z0-9/]/g,''),confidence:data.confidence});
  }
  await writeFile(`tmp/catalog/code-ocr/${String(page).padStart(3,'0')}.json`,JSON.stringify(results,null,2));
  console.log(page,results.map(r=>r.code).join(' '));
}
await worker.terminate();
