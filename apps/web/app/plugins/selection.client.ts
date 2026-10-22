import { z } from 'zod';
import { lineSchema } from '@ellas/shared';
export default defineNuxtPlugin(() => {
  const selection=useSelection();
  onNuxtReady(()=>{
    try { const stored=localStorage.getItem('ellas-selection-v1'); if(stored) selection.lines=z.array(lineSchema.extend({name:z.string(),colorName:z.string(),image:z.string()})).max(250).parse(JSON.parse(stored)); }
    catch { localStorage.removeItem('ellas-selection-v1'); }
    selection.ready=true;
    selection.$subscribe((_mutation,state)=>{ try {localStorage.setItem('ellas-selection-v1',JSON.stringify(state.lines));} catch {/* The active selection remains usable when local storage is unavailable. */} });
  });
});
