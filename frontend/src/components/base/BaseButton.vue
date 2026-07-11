<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center px-5 py-2.5 border border-transparent text-sm font-semibold rounded-xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    :class="buttonClasses"
    @click="$emit('click')"
  >
    <svg v-if="loading" class="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
    <slot />
  </button>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  variant: { type: String, default: 'primary' }, // primary, secondary, danger, outline
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})
defineEmits(['click'])

const buttonClasses = computed(() => ({
  'bg-primary text-white hover:bg-primary-dark focus:ring-primary': props.variant === 'primary',
  'bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-205 border-gray-300 dark:border-slate-700/60 hover:bg-gray-50 dark:hover:bg-slate-700/80 focus:ring-primary': props.variant === 'secondary',
  'bg-danger text-white hover:bg-red-600 focus:ring-danger': props.variant === 'danger',
  'border-2 border-primary text-primary hover:bg-primary hover:text-white focus:ring-primary': props.variant === 'outline',
}))
</script>