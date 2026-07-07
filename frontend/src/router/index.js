import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { isPublic: true } // Cualquiera puede ver el login
  },
  {
    path: '/',
    name: 'Tickets',
    component: () => import('@/views/TicketsView.vue'),
    meta: { requiresAuth: true } // Requiere estar logueado
  },
  {
    path: '/tickets/:id',
    name: 'TicketDetail',
    component: () => import('@/views/TicketDetailView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/DashboardView.vue'),
    meta: { requiresAuth: true, requiresSupervisor: true } // Solo supervisores (RF-28)
  },
  {
    path: '/usuarios',
    name: 'Users',
    component: () => import('@/views/UsersView.vue'),
    meta: { requiresAuth: true, requiresSupervisor: true } // Solo supervisores (RF-05)
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation Guards (Protección de rutas)
router.beforeEach((to, from) => {
  const authStore = useAuthStore()

  // 1. Rutas Públicas
  if (to.meta.isPublic) {
    if (authStore.isAuthenticated && to.name === 'Login') {
      return { name: 'Tickets' } // Redirigir si ya está logueado
    }
    return true // Permitir acceso
  }

  // 2. Rutas Privadas (Requieren Autenticación)
  if (!authStore.isAuthenticated) {
    return { name: 'Login' } // Redirigir al login
  }

  // 3. Rutas Restringidas por Rol (Solo Supervisores)
  if (to.meta.requiresSupervisor && !authStore.isSupervisor) {
    return { name: 'Tickets' } // Redirigir a la vista principal
  }

  return true // Permitir acceso
})

export default router