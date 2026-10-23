import type {AuthSession} from '@ellas/shared';
export function useAccount(){
  const user=useState<AuthSession|null>('account-session',()=>null);
  const request=useRequestFetch();
  async function refresh(){
    try{user.value=await request<AuthSession>('/api/auth/session');}
    catch(error){const status=(error as {statusCode?:number;status?:number}).statusCode||(error as {status?:number}).status;if(status!==401)throw error;user.value=null;}
    return user.value;
  }
  async function logout(){const session=await refresh();if(session)await $fetch('/api/auth/logout',{method:'POST',headers:{'x-csrf-token':session.csrf}});user.value=null;}
  return {user,refresh,logout};
}
