<template>
  <BaseModal
    :modelValue="modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    size="sm"
    :closable="true"
  >
    <div class="text-center">
      <!-- Icon -->
      <div
        class="mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4"
        :class="iconClasses"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            v-if="variant === 'danger'"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
          <path
            v-else
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      <!-- Title -->
      <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">
        {{ title }}
      </h3>

      <!-- Message -->
      <p class="text-sm text-slate-600 dark:text-slate-400 mb-6">
        {{ message }}
      </p>

      <!-- Actions -->
      <div class="flex gap-3">
        <BaseButton
          variant="secondary"
          @click="handleCancel"
          class="flex-1"
        >
          {{ cancelText }}
        </BaseButton>
        <BaseButton
          :variant="variant"
          @click="handleConfirm"
          class="flex-1"
        >
          {{ confirmText }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<script setup>
import { computed } from 'vue'
import BaseModal from './BaseModal.vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: '¿Estás seguro?' },
  message: { type: String, default: 'Esta acción no se puede deshacer.' },
  confirmText: { type: String, default: 'Confirmar' },
  cancelText: { type: String, default: 'Cancelar' },
  variant: { type: String, default: 'danger' } // danger, primary
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel'])

const iconClasses = computed(() => ({
  'danger': 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  'primary': 'bg-primary/10 text-primary'
}[props.variant]))

const handleConfirm = () => {
  emit('confirm')
  emit('update:modelValue', false)
}

const handleCancel = () => {
  emit('cancel')
  emit('update:modelValue', false)
}
</script>