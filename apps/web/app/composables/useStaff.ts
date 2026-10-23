import type {AuthSession} from '@ellas/shared';
type Staff=AuthSession & {role:'admin'|'staff'};
export function useStaff(){
  const account=useAccount();
  const staff=computed<Staff|null>({get:()=>account.user.value&&account.user.value.role!=='customer'?account.user.value as Staff:null,set:value=>{account.user.value=value;}});
  async function ensure(){const session=await account.refresh();if(!session||session.role==='customer')throw createError({statusCode:403,message:'Acceso reservado al equipo'});return session as Staff;}
  async function mutate<T>(url:string,options:{method:'POST'|'PATCH'|'PUT';body?:unknown}){
    const session=await ensure();
    try{return await $fetch<T>(url,{...options,body:options.body as Record<string,unknown>|undefined,headers:{'x-csrf-token':session.csrf}});}
    catch(error){if((error as {status?:number}).status===401){staff.value=null;await navigateTo('/admin/login');}throw error;}
  }
  return {staff,ensure,mutate};
}
