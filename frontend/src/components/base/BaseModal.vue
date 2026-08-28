<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @click.self="handleBackdropClick"
      >
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
        
        <!-- Modal Content -->
        <div
          class="relative bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-gray-200/80 dark:border-gray-500 max-h-[90vh] flex flex-col overflow-hidden"
          :class="sizeClasses"
        >
          <!-- Header -->
          <div
            v-if="title || $slots.header"
            class="px-6 py-4 border-b border-gray-100 dark:border-gray-500 bg-gray-50/50 dark:bg-[#757575] shrink-0"
          >
            <div class="flex items-center justify-between">
              <slot name="header">
                <h3 class="text-lg font-bold text-gray-800 dark:text-white">{{ title }}</h3>
              </slot>
              <button
                v-if="closable"
                @click="close"
                class="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 cursor-pointer"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto p-6 min-h-0">
            <slot />
          </div>

          <!-- Footer -->
          <div
            v-if="$slots.footer"
            class="px-6 py-4 border-t border-gray-100 dark:border-gray-500 bg-gray-50/30 dark:bg-card-dark shrink-0"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm, md, lg, xl
  closable: { type: Boolean, default: true },
  closeOnBackdrop: { type: Boolean, default: true }
})

const emit = defineEmits(['update:modelValue', 'close'])

const sizeClasses = computed(() => ({
  'sm': 'w-full max-w-md',
  'md': 'w-full max-w-lg',
  'lg': 'w-full max-w-2xl',
  'xl': 'w-full max-w-4xl'
}[props.size]))

const close = () => {
  emit('update:modelValue', false)
  emit('close')
}

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close()
  }
}

// Cerrar con tecla ESC
const handleEsc = (e) => {
  if (e.key === 'Escape' && props.modelValue && props.closable) {
    close()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEsc)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEsc)
})

// Bloquear scroll del body cuando el modal está abierto
watch(() => props.modelValue, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
  opacity: 0;
}
</style>