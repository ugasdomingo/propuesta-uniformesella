export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const path = getRouterParam(event, 'path') || '';
  if (!path || path.split('/').some(part => ['.', '..'].includes(decodeURIComponent(part)))) throw createError({ statusCode: 400 });
  const base = new URL(config.apiInternalUrl);
  const target = new URL(`/api/${path}${getRequestURL(event).search}`, base);
  if (target.origin !== base.origin) throw createError({ statusCode: 400 });
  setHeader(event, 'cache-control', 'no-store');
  return proxyRequest(event, target.href, { headers: { 'x-forwarded-host': getRequestHost(event) } });
});
