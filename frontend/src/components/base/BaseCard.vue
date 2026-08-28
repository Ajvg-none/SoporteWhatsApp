<template>
  <div class="bg-surface-card rounded-2xl shadow-xs border border-edge transition-shadow duration-200 hover:shadow-sm overflow-hidden">
    <div v-if="$slots.header || title" class="px-6 py-4.5 border-b border-edge bg-surface-hover">
      <slot name="header"><h3 class="text-sm font-extrabold text-secondary tracking-tight uppercase">{{ title }}</h3></slot>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>