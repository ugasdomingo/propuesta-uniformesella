import { defineStore } from 'pinia';
export const useComparison=defineStore('comparison',{
  state:()=>({references:[] as string[],message:''}),
  actions:{
    toggle(reference:string){this.message='';if(this.references.includes(reference))this.references=this.references.filter(r=>r!==reference);else if(this.references.length<3)this.references.push(reference);else this.message='Ya tienes tres prendas. Quita una para comparar otra.';},
  },
});
