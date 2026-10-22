import type { Product } from '@ellas/shared';
export default defineEventHandler(async event=>{
  const config=useRuntimeConfig(event);
  setHeader(event,'content-type','application/xml; charset=utf-8');
  setHeader(event,'x-robots-tag','noindex');
  if(String(config.public.demoMode)!=='false')return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>';
  const urls=['/','/catalogo','/personalizacion','/contacto'];
  let page=1,pages=1;
  do{const result=await $fetch<{products:Product[];pages:number}>(`${config.apiInternalUrl}/api/catalog/products`,{query:{page,limit:48}});pages=result.pages;urls.push(...result.products.map(product=>`/catalogo/${product.slug}`));page++;}while(page<=pages);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(path=>`<url><loc>${new URL(path,config.public.appUrl).href.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</loc></url>`).join('')}</urlset>`;
});
