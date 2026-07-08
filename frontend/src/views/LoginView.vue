<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Bienvenido de nuevo</h2>
    
    <form @submit.prevent class="space-y-4">
      <BaseInput
        v-model="email"
        label="Correo Electrónico"
        type="email"
        placeholder="tecnico@empresa.com"
        required
      />

      <BaseInput
        v-model="password"
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        required
      />

      <BaseButton
        type="submit"
        variant="primary"
        class="w-full"
      >
        Iniciar Sesión
      </BaseButton>
    </form>

    <p class="mt-6 text-center text-sm text-gray-500">
      ¿Problemas para acceder? Contacta al administrador
    </p>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const email = ref('')
const password = ref('')

// TODO: En Sprint 1, implementar lógica de autenticación con API
</script>
