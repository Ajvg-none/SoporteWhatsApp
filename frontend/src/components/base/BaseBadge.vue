<template>
  <span class="inline-flex items-center gap-1.5 border px-2.5 py-1 rounded-full text-[11px] font-bold leading-none whitespace-nowrap" :class="variantClasses">
    <span v-if="dot" class="w-1.5 h-1.5 rounded-full bg-current shrink-0"></span>
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'gray' }, // gray, blue, green, yellow, red, purple
  dot: { type: Boolean, default: false }
})

const VARIANTS = {
  gray:   '!bg-gray-50 !text-gray-600 border-gray-200 dark:!bg-gray-500/15 dark:!text-gray-300 dark:!border-gray-500/30',
  blue:   '!bg-blue-50 !text-blue-700 border-blue-200 dark:!bg-blue-500/15 dark:!text-blue-300 dark:!border-blue-500/30',
  green:  '!bg-emerald-50 !text-emerald-700 border-emerald-200 dark:!bg-emerald-500/15 dark:!text-emerald-300 dark:!border-emerald-500/30',
  yellow: '!bg-amber-50 !text-amber-700 border-amber-200 dark:!bg-amber-500/15 dark:!text-amber-300 dark:!border-amber-500/30',
  red:    '!bg-rose-50 !text-rose-700 border-rose-200 dark:!bg-red-500/15 dark:!text-red-300 dark:!border-red-500/30',
  purple: '!bg-purple-50 !text-purple-700 border-purple-200 dark:!bg-purple-500/15 dark:!text-purple-300 dark:!border-purple-500/30'
}

const variantClasses = computed(() => VARIANTS[props.variant] || VARIANTS.gray)
</script>
