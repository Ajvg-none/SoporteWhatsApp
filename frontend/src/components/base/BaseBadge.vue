<template>
<span :class="[
  badgeClasses,
  props.variant === 'gray' ? '!bg-slate-50 dark:!bg-slate-800 !text-slate-600 dark:!text-slate-300 border-slate-200/80 dark:border-slate-700' : '',
  props.variant === 'blue' ? '!bg-sky-50 dark:!bg-sky-950/40 !text-sky-700 dark:!text-sky-300 border-sky-200/80 dark:border-sky-800' : '',
  props.variant === 'green' ? '!bg-emerald-50 dark:!bg-emerald-950/40 !text-emerald-700 dark:!text-emerald-300 border-emerald-200/80 dark:border-emerald-800' : '',
  props.variant === 'yellow' ? '!bg-amber-50 dark:!bg-amber-950/40 !text-amber-700 dark:!text-amber-300 border-amber-200/80 dark:border-amber-800' : '',
  props.variant === 'red' ? '!bg-rose-50 dark:!bg-rose-950/40 !text-rose-700 dark:!text-rose-300 border-rose-200/80 dark:border-rose-800' : '',
  props.variant === 'purple' ? '!bg-purple-50 dark:!bg-purple-950/40 !text-purple-700 dark:!text-purple-300 border-purple-200/80 dark:border-purple-800' : ''
]">
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