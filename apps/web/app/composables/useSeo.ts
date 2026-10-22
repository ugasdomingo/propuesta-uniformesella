export function useSeo(title: string, description: string) {
  const route = useRoute();
  const config = useRuntimeConfig();
  const canonical = new URL(route.path, config.public.appUrl).href;
  useSeoMeta({ title, description, robots: 'noindex, nofollow, noarchive', ogTitle: `${title} · Uniformes Ellas`, ogDescription: description, ogType: 'website', ogLocale: 'es_ES' });
  useHead({ link: [{ rel: 'canonical', href: canonical }] });
  if (route.path !== '/' && !route.path.startsWith('/admin')) {
    const root = new URL('/', config.public.appUrl).href;
    const entries = [{ '@type': 'ListItem', position: 1, name: 'Inicio', item: root }];
    if (route.path.startsWith('/catalogo/')) entries.push({ '@type': 'ListItem', position: 2, name: 'Catálogo', item: new URL('/catalogo', root).href });
    entries.push({ '@type': 'ListItem', position: entries.length + 1, name: title, item: canonical });
    useHead({ script: [{ key: 'breadcrumbs', type: 'application/ld+json', innerHTML: JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: entries }).replace(/</g, '\\u003c') }] });
  }
}
