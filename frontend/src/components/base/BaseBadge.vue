<template>
<span :class="[lightClasses, darkClasses]">
    <slot />
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'gray' }, // gray, blue, green, yellow, red, purple
  darkVariant: { type: String, default: '' }  // override de paleta oscura (ej: 'azul')
})

const LIGHT = {
  gray:  '!bg-gray-50 !text-gray-600 border-gray-200/80',
  blue:  '!bg-primary-light !text-primary-dark border-primary/30',
  green: '!bg-emerald-50 !text-emerald-700 border-emerald-200/80',
  yellow: '!bg-amber-50 !text-amber-700 border-amber-200/80',
  red:   '!bg-rose-50 !text-rose-700 border-rose-200/80',
  purple: '!bg-purple-50 !text-purple-700 border-purple-200/80'
}

const DARK = {
  gray:   'dark:!bg-[#6B7280] dark:!text-white dark:!border-[#6B7280]',
  blue:   'dark:!bg-primary dark:!text-white dark:!border-primary',
  green:  'dark:!bg-[#10B981] dark:!text-white dark:!border-[#10B981]',
  yellow: 'dark:!bg-[#F59E0B] dark:!text-white dark:!border-[#F59E0B]',
  red:    'dark:!bg-[#F43F5E] dark:!text-white dark:!border-[#F43F5E]',
  purple: 'dark:!bg-[#8B5CF6] dark:!text-white dark:!border-[#8B5CF6]',
  azul:   'dark:!bg-[#3B82F6] dark:!text-white dark:!border-[#3B82F6]'
}

const lightClasses = computed(() => LIGHT[props.variant] || LIGHT.gray)
const darkClasses = computed(() => DARK[props.darkVariant || props.variant] || DARK.gray)
</script>