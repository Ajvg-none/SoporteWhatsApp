<template>
  <div class="flex h-screen bg-gray-100 overflow-hidden">
    <!-- Sidebar Lateral -->
    <aside class="w-64 bg-white shadow-xl flex flex-col z-20 transition-all duration-300">
      <!-- Logo Area -->
      <div class="h-16 flex items-center justify-center border-b border-gray-100 px-6">
        <span class="text-xl font-bold text-primary tracking-wide">SoporteWA</span>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        <router-link 
          to="/" 
          class="flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 group"
          :class="{ 'bg-primary text-white shadow-md': $route.path === '/' }"
        >
          <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          Tickets
        </router-link>

        <!-- Opciones solo para Supervisores -->
        <template v-if="authStore.isSupervisor">
          <router-link 
            to="/dashboard" 
            class="flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 group"
            :class="{ 'bg-primary text-white shadow-md': $route.path === '/dashboard' }"
          >
            <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Dashboard
          </router-link>
          
          <router-link 
            to="/usuarios" 
            class="flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-primary hover:text-white transition-all duration-200 group"
            :class="{ 'bg-primary text-white shadow-md': $route.path === '/usuarios' }"
          >
            <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Usuarios
          </router-link>
        </template>
      </nav>

      <!-- Perfil y Logout -->
      <div class="p-4 border-t border-gray-100 bg-gray-50">
        <div class="flex items-center mb-3">
          <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-sm">
            {{ userInitial }}
          </div>
          <div class="ml-3 overflow-hidden">
            <p class="text-sm font-semibold text-gray-800 truncate">{{ authStore.user?.nombre || 'Usuario' }}</p>
            <p class="text-xs text-gray-500 capitalize">{{ authStore.user?.rol }}</p>
          </div>
        </div>
        <button 
          @click="handleLogout"
          class="w-full flex items-center justify-center px-4 py-2 text-sm text-danger border border-danger/20 rounded-lg hover:bg-danger hover:text-white transition-colors duration-200"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- Área Principal -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header Superior -->
      <header class="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-10">
        <h2 class="text-xl font-semibold text-gray-800">{{ currentTitle }}</h2>
        <div class="text-sm text-gray-500">
          {{ currentDate }}
        </div>
      </header>

      <!-- Contenido de la Vista con Transición -->
      <main class="flex-1 overflow-y-auto p-8">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const userInitial = computed(() => authStore.user?.nombre?.charAt(0).toUpperCase() || 'U')
const currentDate = computed(() => new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
const currentTitle = computed(() => {
  const titles = {
    'Tickets': 'Gestión de Tickets',
    'TicketDetail': 'Detalle del Ticket',
    'Dashboard': 'Panel de Control',
    'Users': 'Administración de Usuarios'
  }
  return titles[router.currentRoute.value.name] || 'SoporteWhatsApp'
})

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(10px); }
</style>