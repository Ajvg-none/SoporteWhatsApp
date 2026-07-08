<template>
  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" :class="badgeClasses">
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