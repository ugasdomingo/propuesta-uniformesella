<script setup lang="ts">
import type { Product } from '@ellas/shared';
defineProps<{ product: Product; priority?: boolean }>();
</script>
<template>
  <article class="product-card">
    <NuxtLink :to="`/catalogo/${product.slug}`" class="product-card-image" :aria-label="`Ver ${product.name}, referencia ${product.reference}`">
      <img :src="product.imageSmall" :srcset="`${product.imageSmall} 420w, ${product.image} 900w`" sizes="(max-width: 640px) 47vw, (max-width: 1000px) 31vw, 24vw" :alt="product.name" :width="product.imageWidth" :height="product.imageHeight" :loading="priority ? 'eager' : 'lazy'" />
      <span class="card-reference">{{ product.reference }}</span><span class="card-open"><AppIcon name="ArrowUpRight" :size="22" /></span>
    </NuxtLink>
    <div class="product-card-top"><span class="eyebrow muted">{{ product.collection }} / {{ product.audience }}</span><span class="color-dots" aria-hidden="true"><i v-for="color in product.colors.slice(0,4)" :key="color.code" :style="{ background: color.hex, backgroundImage: color.swatch ? 'url(' + color.swatch + ')' : undefined, backgroundSize: 'cover' }" /><small v-if="product.colors.length > 4">+{{ product.colors.length-4 }}</small></span></div>
    <NuxtLink :to="`/catalogo/${product.slug}`" class="product-card-title">{{ product.name }}</NuxtLink>
    <p class="product-card-meta">{{ product.sizes[0] }}–{{ product.sizes.at(-1) }} <span>·</span> Precio bajo presupuesto</p>
    <div class="card-actions"><NuxtLink :to="{path:'/hacer-pedido',query:{ref:product.reference}}">Elegir <AppIcon name="Plus" :size="14"/></NuxtLink><CompareButton :reference="product.reference"/></div>
  </article>
</template>
