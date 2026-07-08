<template>
  <div class="min-h-screen flex items-center justify-center animate-fadeIn">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-gray-900 mb-4">404</h1>
      <p class="text-xl text-gray-600 mb-8">Página no encontrada</p>
      <router-link 
        to="/" 
        class="inline-block"
      >
        <BaseButton variant="primary">
          Volver al Inicio
        </BaseButton>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import BaseButton from '@/components/base/BaseButton.vue'
</script>
