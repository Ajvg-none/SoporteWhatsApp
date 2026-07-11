<template>
  <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-100/50 dark:border-slate-800/80 transition-shadow duration-200 hover:shadow-sm overflow-hidden">
    <div v-if="$slots.header || title" class="px-6 py-4.5 border-b border-slate-100/40 dark:border-slate-800/50 bg-slate-50/15 dark:bg-slate-900/30">
      <slot name="header"><h3 class="text-sm font-extrabold text-slate-700 dark:text-slate-300 tracking-tight uppercase">{{ title }}</h3></slot>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>