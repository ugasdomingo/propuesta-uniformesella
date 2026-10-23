<script setup lang="ts">
import { UserRound, ArrowUpRight, ArrowRight, Search, ShoppingBag, Plus, Minus, X, Check, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Menu, ArrowLeft, MoveUpRight, LockKeyhole, LogOut, Upload, FileText, Clock, Shirt, CheckCircle2, Phone, MapPin, Mail, ExternalLink } from 'lucide-vue-next';
const icons = { UserRound, ArrowUpRight, ArrowRight, Search, ShoppingBag, Plus, Minus, X, Check, ChevronDown, ChevronLeft, ChevronRight, SlidersHorizontal, Menu, ArrowLeft, MoveUpRight, LockKeyhole, LogOut, Upload, FileText, Clock, Shirt, CheckCircle2, Phone, MapPin, Mail, ExternalLink };
withDefaults(defineProps<{ name: keyof typeof icons; size?: number }>(),{size:20});
</script>
<template><component :is="icons[name]" :size="size" :stroke-width="1.65" aria-hidden="true" /></template>
