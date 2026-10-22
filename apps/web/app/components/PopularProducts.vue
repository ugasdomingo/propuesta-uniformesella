<script setup lang="ts">
import type {Product} from '@ellas/shared';
const {data}=await useFetch<{items:{reference:string;orders:number;units:number;product:Product}[];days:number;updatedAt:string}>('/api/catalog/ranking');
</script>
<template><section v-if="data?.items.length" class="section container popular-section"><div class="section-heading"><div><span class="eyebrow">LOS FAVORITOS DE OTROS EQUIPOS</span><h2>Los más pedidos<br/><span class="serif-word">para hacer equipo.</span></h2></div><p class="section-aside">Pedidos confirmados · Últimos {{data.days}} días<br/>Actualizado {{new Date(data.updatedAt).toLocaleDateString('es-ES')}}</p></div><div class="product-grid"><div v-for="item in data.items" :key="item.reference"><ProductCard :product="item.product"/><p class="popular-count">{{item.orders}} pedidos · {{item.units}} prendas</p></div></div></section></template>
