export default defineNuxtRouteMiddleware(async () => {
  try { await useStaff().ensure(); }
  catch { return navigateTo('/admin/login'); }
});
