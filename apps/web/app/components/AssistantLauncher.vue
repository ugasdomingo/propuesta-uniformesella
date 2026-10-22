<script setup lang="ts">const open=ref(false);const route=useRoute();watch(()=>route.path,()=>open.value=false);</script>
<template><div class="assistant-widget"><button v-if="!open" class="assistant-launcher" @click="open=true"><span>✳</span> ¿Te ayudo a elegir?</button><LazyAssistantPanel v-if="open" @close="open=false"/></div></template>
