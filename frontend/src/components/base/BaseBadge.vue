<template>
  <span 
    class="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-wider uppercase border transition-colors duration-150"
    :class="[
      badgeClasses,
      props.variant === 'gray' ? '!bg-slate-50 !text-slate-600 border-slate-200/80' : '',
      props.variant === 'blue' ? '!bg-sky-50 !text-sky-700 border-sky-200/80' : '',
      props.variant === 'green' ? '!bg-emerald-50 !text-emerald-700 border-emerald-200/80' : '',
      props.variant === 'yellow' ? '!bg-amber-50 !text-amber-700 border-amber-200/80' : '',
      props.variant === 'red' ? '!bg-rose-50 !text-rose-700 border-rose-200/80' : '',
      props.variant === 'purple' ? '!bg-purple-50 !text-purple-700 border-purple-200/80' : ''
    ]"
  >
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ variant: { type: String, default: 'gray' } }) // gray, blue, green, yellow, red, purple

const badgeClasses = computed(() => ({
  'bg-gray-100 text-gray-800': props.variant === 'gray',
  'bg-blue-100 text-blue-800': props.variant === 'blue',
  'bg-green-100 text-green-800': props.variant === 'green',
  'bg-yellow-100 text-yellow-800': props.variant === 'yellow',
  'bg-red-100 text-red-800': props.variant === 'red',
  'bg-purple-100 text-purple-800': props.variant === 'purple',
}))
</script>