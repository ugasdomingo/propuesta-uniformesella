import { defineStore } from 'pinia';
import type { CartLine } from '@ellas/shared';

export const useSelection = defineStore('selection', {
  state: () => ({ lines: [] as CartLine[], ready: false, validation: '', restoreWarning:'', drafts:{} as Record<string,{color:string;quantities:Record<string,string|number>}> }),
  getters: { count: state => state.lines.reduce((sum,line)=>sum+(Number(line.quantity)||0),0) },
  actions: {
    add(lines: CartLine[]) {
      this.validation='';
      const merged=this.lines.map(line=>({...line}));
      for (const line of lines) {
        const found=merged.find(l=>l.reference===line.reference && l.color===line.color && l.size===line.size);
        if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity+(found?.quantity||0)>10000){this.validation='Cada talla admite entre 1 y 10.000 prendas. Revisa la cantidad acumulada.';return false;}
        if(found) found.quantity+=line.quantity; else merged.push({...line});
      }
      if(merged.length>250||merged.reduce((n,l)=>n+l.quantity,0)>100000){this.validation='El pedido admite hasta 250 variantes y 100.000 prendas.';return false;}
      this.lines=merged;return true;
    },
    remove(index: number) { this.lines.splice(index,1); },
    clear() { this.lines=[]; },
  },
});
