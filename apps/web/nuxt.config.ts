import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2026-10-22',
  devtools: { enabled: false },
  nitro: { vercel: { functions: { maxDuration: 90 } } },
  modules: ['@pinia/nuxt'],
  css: ['~/assets/css/main.css', '~/assets/css/order.css','~/assets/css/assistant.css','~/assets/css/customer.css'],
  typescript: { strict: true, typeCheck: false },
  runtimeConfig: {
    apiInternalUrl: 'http://127.0.0.1:4000',
    public: { appUrl: 'http://localhost:3000', demoMode: true },
  },
  app: { head: { htmlAttrs: { lang: 'es' }, titleTemplate: '%s · Uniformes Ellas', meta: [{ name: 'theme-color', content: '#eee9e1' }, { name: 'robots', content: 'noindex, nofollow, noarchive' }], link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }] } },
  vite: { plugins: [tailwindcss()], optimizeDeps: { include: ['zod', 'lucide-vue-next'] } },
  routeRules: {
    '/api/**': { headers: { 'cache-control': 'no-store' } },
    '/mi-cuenta': { headers: { 'cache-control':'private, no-store' } },
    '/mi-cuenta/**': { headers: { 'cache-control':'private, no-store' } },
    '/admin/**': { headers: { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow, noarchive' } },
    '/**': { headers: { 'x-robots-tag': 'noindex, nofollow, noarchive', 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin' } },
    '/catalog/**': { headers: { 'cache-control': 'public, max-age=3600, immutable' } },
  },
});
