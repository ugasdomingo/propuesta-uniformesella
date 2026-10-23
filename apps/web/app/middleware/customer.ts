export default defineNuxtRouteMiddleware(async()=>{
  try{const user=await useAccount().refresh();if(!user)return navigateTo('/mi-cuenta/entrar');if(user.role!=='customer')return navigateTo('/admin/solicitudes');}
  catch{return navigateTo('/mi-cuenta/entrar');}
});
