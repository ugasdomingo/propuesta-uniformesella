import { defineStore } from 'pinia';
import type { CartLine } from '@ellas/shared';

export const useSelection = defineStore('selection', {
  state: () => ({ lines: [] as CartLine[], ready: false }),
  getters: { count: state => state.lines.reduce((sum,line)=>sum+line.quantity,0) },
  actions: {
    add(lines: CartLine[]) {
      for (const line of lines) {
        const found=this.lines.find(l=>l.reference===line.reference && l.color===line.color && l.size===line.size);
        if(found) found.quantity=Math.min(10000,found.quantity+line.quantity); else this.lines.push({...line});
      }
    },
    remove(index: number) { this.lines.splice(index,1); },
    clear() { this.lines=[]; },
  },
});
