import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {technicalFacts,technicalColorFacts,type Product} from '@ellas/shared';
const products=JSON.parse(await readFile('data/catalog/products.json','utf8')) as Product[];
const records=Object.fromEntries(products.map(product=>{const facts=technicalFacts(product);const colors=technicalColorFacts(product);return [product.reference,{facts,colors,fingerprint:createHash('sha256').update(JSON.stringify({facts,colors})).digest('hex')}];}));
await writeFile('data/catalog/technical.json',JSON.stringify({derivationVersion:1,source:'products.json revisado; valores explícitos, sin inferencia IA',references:records},null,2)+'\n');
console.log(JSON.stringify({technicalRecords:products.length,knownWeights:products.filter(p=>technicalFacts(p).weight).length,unknownWeights:products.filter(p=>!technicalFacts(p).weight).map(p=>p.reference)}));
