<template>
  <div class="bg-white dark:bg-card-dark rounded-2xl shadow-xs border border-gray-100/50 dark:border-gray-500 transition-shadow duration-200 hover:shadow-sm overflow-hidden">
    <div v-if="$slots.header || title" class="px-6 py-4.5 border-b border-gray-100/40 dark:border-gray-500 bg-gray-50/15 dark:bg-card-dark">
      <slot name="header"><h3 class="text-sm font-extrabold text-gray-700 dark:text-gray-300 tracking-tight uppercase">{{ title }}</h3></slot>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>