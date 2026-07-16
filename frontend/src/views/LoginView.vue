<template>
  <div>
    <h2 class="text-xl font-black text-slate-800 text-center tracking-tight">Acceso Técnico</h2>
    <p class="text-slate-400 text-xs text-center mb-6 font-semibold">Introduce tus credenciales para ingresar al panel</p>
    
    <!-- Alerta de Error -->
    <div v-if="errorMsg" class="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-150 text-rose-800 text-xs font-semibold flex items-start">
      <svg class="w-4 h-4 mr-2 shrink-0 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
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
        class="w-full shadow-lg shadow-primary/20 font-bold"
        :loading="loading"
        :disabled="!email || !password"
      >
        Iniciar Sesión
      </BaseButton>
    </form>
    
    <p class="mt-6 text-center text-xs font-semibold text-slate-400">
      ¿Problemas para acceder? Contacta al Ricardo de Inciarte
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
