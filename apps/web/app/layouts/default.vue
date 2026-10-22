<script setup lang="ts">
const selection=useSelection(); const route=useRoute(); const menu=ref(false);
watch(()=>route.fullPath,()=>menu.value=false);
</script>
<template>
  <div>
    <a href="#main" class="skip-link">Saltar al contenido</a>
    <div class="demo-strip"><span class="demo-dot" /> DEMOSTRACIÓN <span class="demo-strip-divider">/</span> Tu próximo pedido de equipo, mucho más fácil.</div>
    <header class="site-header"><div class="container header-inner">
      <NuxtLink to="/" class="brand" aria-label="Uniformes Ellas, inicio"><img src="/brand/uniformes-ellas.png" alt="Uniformes Ellas" width="168" height="56" /><span>VESTIMOS A TU EQUIPO</span></NuxtLink>
      <nav class="desktop-nav" aria-label="Navegación principal"><NuxtLink to="/catalogo" :class="{active:route.path.startsWith('/catalogo')}">Catálogo <span class="tiny-pill">2026</span></NuxtLink><NuxtLink to="/comparar">Comparar</NuxtLink><NuxtLink to="/personalizacion">Personalización</NuxtLink><NuxtLink to="/contacto">Nuestra tienda</NuxtLink></nav>
      <div class="header-actions"><NuxtLink to="/catalogo" class="icon-button desktop-search" aria-label="Buscar una prenda"><AppIcon name="Search" /></NuxtLink><NuxtLink to="/hacer-pedido" class="selection-link"><AppIcon name="ShoppingBag" /><span>Hacer un pedido</span><b>{{ selection.count }}</b></NuxtLink><button class="icon-button mobile-menu" :aria-expanded="menu" aria-label="Abrir menú" @click="menu=!menu"><AppIcon :name="menu?'X':'Menu'" /></button></div>
    </div><nav v-if="menu" class="mobile-nav container" aria-label="Menú móvil"><NuxtLink to="/hacer-pedido">Hacer un pedido <AppIcon name="ArrowUpRight" /></NuxtLink><NuxtLink to="/comparar">Comparar prendas <AppIcon name="ArrowUpRight" /></NuxtLink><NuxtLink to="/catalogo">Explorar catálogo <AppIcon name="ArrowUpRight" /></NuxtLink><NuxtLink to="/personalizacion">Personalización <AppIcon name="ArrowUpRight" /></NuxtLink><NuxtLink to="/contacto">Nuestra tienda <AppIcon name="ArrowUpRight" /></NuxtLink></nav></header>
    <main id="main"><slot /></main><ClientOnly><ComparisonTray /><AssistantLauncher /></ClientOnly>
    <footer class="site-footer"><div class="container"><div class="footer-top"><div><span class="footer-wordmark">Uniformes Ellas<span>®</span></span><p>Personas que trabajan.<br />Equipos que se reconocen.</p></div><div class="footer-links"><NuxtLink to="/catalogo">Explorar catálogo</NuxtLink><NuxtLink to="/personalizacion">Personaliza tu equipo</NuxtLink><NuxtLink to="/contacto">Calle Almería 6, Madrid</NuxtLink><a href="tel:917261728">91 726 17 28</a></div><div class="footer-note"><span class="eyebrow">A TU LADO, EN CADA PRENDA</span><p>Elige tallas y colores.<br />Nosotros nos encargamos del resto.</p><NuxtLink to="/hacer-pedido" class="text-link">Hacer un pedido <AppIcon name="ArrowUpRight" /></NuxtLink></div></div><div class="footer-bottom"><span>© {{ new Date().getFullYear() }} Uniformes Ellas · Demo comercial</span><div><NuxtLink to="/privacidad">Privacidad</NuxtLink><NuxtLink to="/admin/solicitudes">Acceso del equipo <AppIcon name="LockKeyhole" :size="13" /></NuxtLink></div></div></div></footer>
    <NuxtLink v-if="selection.count && !route.path.startsWith('/admin') && route.path!='/hacer-pedido'" to="/hacer-pedido" class="mobile-selection"><AppIcon name="ShoppingBag" />{{ selection.count }} prendas en tu pedido<AppIcon name="ArrowRight" /></NuxtLink>
  </div>
</template>
