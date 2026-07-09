<template>
  <div>
    <h2 class="text-2xl font-bold text-gray-900 mb-6 text-center">Bienvenido de nuevo</h2>
    
    <!-- Alerta de Error -->
    <div v-if="errorMsg" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start">
      <svg class="w-5 h-5 mr-2 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      <span>{{ errorMsg }}</span>
    </div>

    <form @submit.prevent="handleLogin" class="space-y-4">
      <BaseInput
        v-model="email"
        label="Correo Electrónico"
        type="email"
        placeholder="tecnico@empresa.com"
        required
        :disabled="loading"
      />

      <BaseInput
        v-model="password"
        label="Contraseña"
        type="password"
        placeholder="••••••••"
        required
        :disabled="loading"
      />

      <BaseButton
        type="submit"
        variant="primary"
        class="w-full"
        :loading="loading"
        :disabled="!email || !password"
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
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  if (!email.value || !password.value) return
  loading.value = true
  errorMsg.value = ''

  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (error) {
    console.error('Error logging in:', error)
    errorMsg.value = error.message || 'Error al conectar con el servidor. Inténtelo más tarde.'
  } finally {
    loading.value = false
  }
}
</script>
