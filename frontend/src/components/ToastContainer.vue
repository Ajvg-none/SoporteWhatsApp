<template>
  <Teleport to="body">
    <div class="fixed bottom-6 right-6 z-[100] space-y-3 max-w-sm w-full">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="bg-surface-card rounded-2xl shadow-2xl border border-edge p-4 flex items-start gap-3 animate-slideIn"
          :class="borderClass(toast.type)"
          role="status"
        >
          <!-- Icono según tipo -->
          <div class="flex-shrink-0 mt-0.5">
            <div
              class="w-10 h-10 rounded-xl flex items-center justify-center"
              :class="iconBgClass(toast.type)"
            >
              <svg
                class="w-5 h-5"
                :class="iconColorClass(toast.type)"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  :d="iconPath(toast.type)"
                />
              </svg>
            </div>
          </div>

          <!-- Contenido -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-body">{{ title(toast.type) }}</p>
            <p class="text-xs text-secondary mt-0.5 break-words">
              {{ toast.message }}
            </p>
          </div>

          <!-- Cerrar -->
          <button
            @click="toastStore.remove(toast.id)"
            class="text-muted hover:text-secondary transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar notificación"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToastStore } from '@/stores/toast'

const toastStore = useToastStore()

const TYPES = {
  success: {
    title: 'Operación exitosa',
    border: 'border-l-primary',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
    icon: 'M5 13l4 4L19 7'
  },
  error: {
    title: 'Error',
    border: 'border-l-red-500',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    icon: 'M6 18L18 6M6 6l12 12'
  },
  warning: {
    title: 'Aviso',
    border: 'border-l-amber-500',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
  },
  info: {
    title: 'Información',
    border: 'border-l-primary',
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  }
}

const borderClass = (type) => `border-l-4 ${TYPES[type]?.border || TYPES.info.border}`
const iconBgClass = (type) => TYPES[type]?.iconBg || TYPES.info.iconBg
const iconColorClass = (type) => TYPES[type]?.iconColor || TYPES.info.iconColor
const iconPath = (type) => TYPES[type]?.icon || TYPES.info.icon
const title = (type) => TYPES[type]?.title || TYPES.info.title
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
