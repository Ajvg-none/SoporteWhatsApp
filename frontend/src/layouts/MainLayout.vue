<template>
  <div class="flex h-screen bg-white dark:bg-background-dark overflow-hidden">
    <!-- Sidebar Lateral -->
    <aside class="w-64 bg-white dark:bg-card-dark border-r border-gray-100 dark:border-gray-500 flex flex-col z-20 transition-all duration-300">
      <!-- Logo Area -->
      <div class="h-16 flex items-center justify-start border-b border-gray-100 dark:border-gray-500 px-6 gap-3.5">
        <div class="w-8 h-8 rounded-lg bg-primary-light dark:bg-[#4a5e0f] border border-primary-light/80 dark:border-primary-dark/50 flex items-center justify-center text-primary shadow-xs">
          <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <span class="text-lg font-bold text-gray-800 dark:text-white tracking-wide">Soporte<span class="text-primary">WA</span></span>
      </div>

      <!-- Navegación -->
      <nav class="flex-1 overflow-y-auto py-6 px-3.5 space-y-1.5">
        <router-link 
          to="/" 
          class="flex items-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary transition-all duration-200 group"
          :class="[ $route.path === '/' ? 'bg-primary-light dark:bg-[#4a5e0f] !text-primary border border-primary-light/30 dark:border-[#4a5e0f]' : 'border border-transparent' ]"
        >
          <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          Tickets
        </router-link>

        <!-- Opciones solo para Supervisores -->
        <template v-if="authStore.isSupervisor">
          <router-link 
            to="/dashboard" 
            class="flex items-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary transition-all duration-200 group"
            :class="[ $route.path === '/dashboard' ? 'bg-primary-light dark:bg-[#4a5e0f] !text-primary border border-primary-light/30 dark:border-[#4a5e0f]' : 'border border-transparent' ]"
          >
            <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Dashboard
          </router-link>
          
          <router-link 
            to="/usuarios" 
            class="flex items-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary transition-all duration-200 group"
            :class="[ $route.path === '/usuarios' ? 'bg-primary-light dark:bg-[#4a5e0f] !text-primary border border-primary-light/30 dark:border-[#4a5e0f]' : 'border border-transparent' ]"
          >
            <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Usuarios
          </router-link>

          <router-link
            to="/excluidos"
            class="flex items-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary transition-all duration-200 group"
            :class="[ $route.path === '/excluidos' ? 'bg-primary-light dark:bg-[#4a5e0f] !text-primary border border-primary-light/30 dark:border-[#4a5e0f]' : 'border border-transparent' ]"
          >
            <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Números Excluidos
          </router-link>

          <router-link
            to="/contactos"
            class="flex items-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary transition-all duration-200 group"
            :class="[ $route.path === '/contactos' ? 'bg-primary-light dark:bg-[#4a5e0f] !text-primary border border-primary-light/30 dark:border-[#4a5e0f]' : 'border border-transparent' ]"
          >
            <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Contactos
          </router-link>

          <router-link
            to="/chat-directo"
            class="flex items-center px-4 py-3 text-sm font-semibold text-gray-600 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-primary dark:hover:text-primary transition-all duration-200 group"
            :class="[ $route.path === '/chat-directo' ? 'bg-primary-light dark:bg-[#4a5e0f] !text-primary border border-primary-light/30 dark:border-[#4a5e0f]' : 'border border-transparent' ]"
          >
            <svg class="w-5 h-5 mr-3 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Chat Privado
          </router-link>
        </template>
      </nav>

      <!-- Perfil y Logout -->
      <div class="p-4 border-t border-gray-100 dark:border-gray-500 bg-gray-50/40 dark:bg-card-dark">
        <div class="flex items-center mb-4">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-hover text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
            {{ userInitial }}
          </div>
          <div class="ml-3 overflow-hidden">
            <p class="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{{ authStore.user?.nombre || 'Usuario' }}</p>
            <p class="text-xs text-gray-400 font-semibold capitalize tracking-wide">{{ authStore.user?.rol }}</p>
          </div>
        </div>
        <button 
          @click="handleLogout"
          class="w-full flex items-center justify-center px-4 py-2.5 text-xs font-bold text-danger border border-danger/20 rounded-xl hover:bg-danger hover:text-white transition-colors duration-250 cursor-pointer"
        >
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Cerrar Sesión
        </button>
      </div>
    </aside>

    <!-- Área Principal -->
    <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
      <!-- Header Superior -->
      <header class="h-16 bg-white dark:bg-card-dark border-b border-gray-100 dark:border-gray-500 flex items-center justify-between px-8 z-10 shrink-0">
        <h2 class="text-lg font-bold text-gray-800 dark:text-white tracking-tight">{{ currentTitle }}</h2>
        <div class="flex items-center gap-4.5">
          <!-- Toggler de Modo Oscuro -->
          <button 
            @click="toggleTheme" 
            class="p-2 rounded-xl border border-gray-200/80 dark:border-gray-700/70 text-gray-500 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-all duration-200 cursor-pointer"
            :title="isDark ? 'Activar modo claro' : 'Activar modo oscuro'"
          >
            <svg v-if="!isDark" class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m12.728 12.728l.707.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
            <svg v-else class="w-4.5 h-4.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          </button>
          <div class="text-xs font-semibold text-gray-400 tracking-wide uppercase bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-200/40 dark:border-gray-700/50">
            {{ currentDate }}
          </div>
        </div>
      </header>

      <!-- Contenido de la Vista con Transición -->
      <main class="flex-1 overflow-y-auto p-8 bg-white dark:bg-background-dark">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Notificaciones toast globales -->
    <ToastContainer />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import ToastContainer from '@/components/ToastContainer.vue'

const router = useRouter()
const authStore = useAuthStore()

const isDark = ref(localStorage.getItem('theme') === 'dark')

const toggleTheme = () => {
  isDark.value = !isDark.value
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

onMounted(() => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
})

const userInitial = computed(() => authStore.user?.nombre?.charAt(0).toUpperCase() || 'U')
const currentDate = computed(() => new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }))
const currentTitle = computed(() => {
  const titles = {
    'Tickets': 'Gestión de Tickets',
    'TicketDetail': 'Detalle del Ticket',
    'Dashboard': 'Panel de Control',
    'Users': 'Administración de Usuarios',
    'ExcludedNumbers': 'Números Excluidos',
    'Contacts': 'Contactos',
    'DirectChat': 'Chat Privado VIP'
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