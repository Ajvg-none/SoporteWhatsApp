import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Tickets',
        component: () => import('@/views/TicketsView.vue')
      },
      {
        path: 'tickets/:id',
        name: 'TicketDetail',
        component: () => import('@/views/TicketDetailView.vue')
      },
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/DashboardView.vue'),
        meta: { requiresSupervisor: true }
      },
      {
        path: 'usuarios',
        name: 'Users',
        component: () => import('@/views/UsersView.vue'),
        meta: { requiresSupervisor: true }
      },

      {
        path: 'excluidos',
        name: 'ExcludedNumbers',
        component: () => import('@/views/ExcludedNumbersView.vue'),
        meta: { requiresSupervisor: true }
      },
      {
        path: 'chat-directo',
        name: 'DirectChat',
        component: () => import('@/views/DirectChatView.vue'),
        meta: { requiresSupervisor: true }
      }
    ]
  },
  {
    path: '/',
    component: () => import('@/layouts/AuthLayout.vue'),
    meta: { isPublic: true },
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/LoginView.vue')
      }
    ]
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

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth)
  const requiresSupervisor = to.matched.some(record => record.meta.requiresSupervisor)
  const isPublic = to.matched.some(record => record.meta.isPublic)

  // 1. Rutas Públicas
  if (isPublic) {
    if (authStore.isAuthenticated && to.name === 'Login') {
      return { name: 'Tickets' } // Redirigir si ya está logueado
    }
    return true // Permitir acceso
  }

  // 2. Rutas Privadas (Requieren Autenticación)
  if (requiresAuth && !authStore.isAuthenticated) {
    return { name: 'Login' } // Redirigir al login
  }

  // 3. Rutas Restringidas por Rol (Solo Supervisores)
  if (requiresSupervisor && !authStore.isSupervisor) {
    return { name: 'Tickets' } // Redirigir a la vista principal
  }

  return true // Permitir acceso
})

export default router