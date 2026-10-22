import type { Product } from './contracts.js';

export interface TechnicalFacts {
  weight: { min: number; max: number; source: string } | null;
  composition: string;
  fibers: { name: string; percent: number }[];
  exceptions: string[];
  compositionResolved: boolean;
  details:string;
  source: { pages: string; images: string[] };
}

// Read only explicit source values. Unmatched color exceptions remain visible.
export function technicalFacts(product: Product, colorCode?: string): TechnicalFacts {
  const weight = product.weight?.match(/^(\d+(?:[.,]\d+)?)(?:\s*[-–]\s*(\d+(?:[.,]\d+)?))?$/);
  let composition = product.composition;
  let compositionResolved = true;
  if (colorCode) {
    const clean=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
    const selected=product.colors.find(color=>color.code===colorCode);
    const direct=product.compositionNotes.find(value=>value.split(':')[0]?.trim().split(/[, /]+/).includes(colorCode));
    const grouped=product.compositionNotes.filter(value=>['fluor','heather','denim heather'].includes(clean(value.split(':')[0]||''))).sort((a,b)=>b.split(':')[0]!.length-a.split(':')[0]!.length).find(value=>selected&&clean(selected.name).includes(clean(value.split(':')[0]||'')));
    const note=direct||grouped;
    if(note)composition=note.slice(note.indexOf(':')+1).trim();
    else if(!selected||product.compositionNotes.some(value=>{const label=value.split(':')[0]?.trim()||'';return !/^[A-Z0-9 /,+-]+$/.test(label)&&!['fluor','heather','denim heather','elastico','interior','softshell'].includes(clean(label));})){
      compositionResolved=false;composition='Composición específica no resuelta; consulta las notas de la ficha.';
    }
  }
  const fibers = [...composition.matchAll(/(\d+(?:[.,]\d+)?)\s*%\s*(algod[oó]n|poli[eé]ster|viscosa|elastano|poliamida|acr[ií]lico|lana|lino)/gi)].map(match => ({ name: match[2]!.toLowerCase(), percent: Number(match[1]!.replace(',', '.')) }));
  return { weight: weight ? { min: Number(weight[1]!.replace(',', '.')), max: Number((weight[2] || weight[1])!.replace(',', '.')), source: product.weight! } : null, composition, fibers, exceptions: product.compositionNotes, compositionResolved, details:product.description,source: { pages: product.source.printedPages, images: product.sourceImages } };
}

export function technicalColorFacts(product:Product){return Object.fromEntries(product.colors.map(color=>{const facts=technicalFacts(product,color.code);return [color.code,{composition:facts.composition,fibers:facts.fibers,resolved:facts.compositionResolved}];}));}
