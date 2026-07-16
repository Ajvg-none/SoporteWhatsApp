<template>
  <div class="fixed bottom-6 right-6 z-50 space-y-3 max-w-sm w-full">
    <TransitionGroup name="toast">
      <div
        v-for="notification in notifications"
        :key="notification.id"
        class="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 p-4 flex items-start gap-3 animate-slideIn"
        :class="{
          'border-l-4 border-l-primary': notification.type === 'nuevo_mensaje_cliente',
          'border-l-4 border-l-green-500': notification.type === 'ticket_asignado',
          'border-l-4 border-l-purple-500': notification.type === 'solicitud_transferencia',
          'border-l-4 border-l-amber-500': notification.type === 'ticket_reasignado',
          'border-l-4 border-l-blue-500': notification.type === 'nuevo_ticket_disponible'
        }"
      >
        <!-- Icono según tipo -->
        <div class="flex-shrink-0 mt-0.5">
          <div 
            class="w-10 h-10 rounded-xl flex items-center justify-center"
            :class="getIconBgClass(notification.type)"
          >
            <svg 
              class="w-5 h-5" 
              :class="getIconColorClass(notification.type)"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                stroke-width="2" 
                :d="getIconPath(notification.type)"
              />
            </svg>
          </div>
        </div>

        <!-- Contenido -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <p class="text-sm font-bold text-slate-800 dark:text-white truncate">
              {{ getNotificationTitle(notification.type) }}
            </p>
            <button 
              @click="removeNotification(notification.id)"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{{ notification.mensaje }}</p>
          <div class="flex items-center gap-3 mt-2">
            <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {{ formatTime(notification.timestamp) }}
            </span>
            <router-link 
              v-if="notification.ticketId"
              :to="`/tickets/${notification.ticketId}`"
              class="text-[10px] font-bold text-primary hover:text-primary-dark transition-colors cursor-pointer"
              @click="removeNotification(notification.id)"
            >
              Ver ticket →
            </router-link>
          </div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import socketService from '@/services/socketService'

const notifications = ref([])
let notificationIdCounter = 0

// Mapeo de tipos de notificación
const NOTIFICATION_TYPES = {
  'nuevo_mensaje_cliente': {
    title: 'Nuevo mensaje del cliente',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    iconPath: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
  },
  'ticket_asignado': {
    title: 'Ticket asignado',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  'solicitud_transferencia': {
    title: 'Solicitud de transferencia',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    iconPath: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'
  },
  'ticket_reasignado': {
    title: 'Ticket reasignado',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    iconPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
  },
  'nuevo_ticket_disponible': {
    title: 'Nuevo ticket disponible',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    iconPath: 'M12 6v6m0 0v6m0-6h6m-6 0H6'
  }
}

const getIconBgClass = (type) => {
  return NOTIFICATION_TYPES[type]?.iconBg || 'bg-slate-100'
}

const getIconColorClass = (type) => {
  return NOTIFICATION_TYPES[type]?.iconColor || 'text-slate-400'
}

const getIconPath = (type) => {
  return NOTIFICATION_TYPES[type]?.iconPath || 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
}

const getNotificationTitle = (type) => {
  return NOTIFICATION_TYPES[type]?.title || 'Notificación'
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const addNotification = (data) => {
  const id = ++notificationIdCounter
  notifications.value.unshift({
    id,
    ...data
  })

  // Auto-remover después de 10 segundos
  setTimeout(() => {
    removeNotification(id)
  }, 10000)

  // Limitar a 5 notificaciones
  if (notifications.value.length > 5) {
    notifications.value.pop()
  }
}

const removeNotification = (id) => {
  const index = notifications.value.findIndex(n => n.id === id)
  if (index > -1) {
    notifications.value.splice(index, 1)
  }
}

// Configurar listeners de Socket.IO
onMounted(() => {
  // Escuchar eventos de notificación
  socketService.on('nuevo_mensaje_cliente', (data) => {
    addNotification({
      type: 'nuevo_mensaje_cliente',
      ...data
    })
  })

  socketService.on('ticket_asignado', (data) => {
    addNotification({
      type: 'ticket_asignado',
      ...data
    })
  })

  socketService.on('solicitud_transferencia', (data) => {
    addNotification({
      type: 'solicitud_transferencia',
      ...data
    })
  })

  socketService.on('ticket_reasignado', (data) => {
    addNotification({
      type: 'ticket_reasignado',
      ...data
    })
  })

  socketService.on('nuevo_ticket_disponible', (data) => {
    addNotification({
      type: 'nuevo_ticket_disponible',
      ...data
    })
  })
})

// Limpiar listeners al desmontar
onUnmounted(() => {
  socketService.off('nuevo_mensaje_cliente')
  socketService.off('ticket_asignado')
  socketService.off('solicitud_transferencia')
  socketService.off('ticket_reasignado')
  socketService.off('nuevo_ticket_disponible')
})
</script>

<style scoped>
.toast-enter-active {
  transition: all 0.3s ease;
}
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(100px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(100px);
}

.animate-slideIn {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(100px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>