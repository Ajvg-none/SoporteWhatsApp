<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import MainLayout from '@/layouts/MainLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'

const route = useRoute()

// Si la ruta tiene meta.isPublic, usa AuthLayout, si no, MainLayout
const layout = computed(() => {
  return route.meta.isPublic ? AuthLayout : MainLayout
})
</script>