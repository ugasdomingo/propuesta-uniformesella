<script setup lang="ts">
defineProps<{reference:string}>();const comparison=useComparison();
</script>
<template><button type="button" class="compare-toggle" :aria-pressed="comparison.references.includes(reference)" @click="comparison.toggle(reference)"><AppIcon name="SlidersHorizontal" :size="15" />{{comparison.references.includes(reference)?'En comparación':'Comparar'}}</button></template>
