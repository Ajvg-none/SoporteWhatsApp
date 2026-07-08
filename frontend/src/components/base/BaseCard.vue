<template>
  <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div v-if="$slots.header || title" class="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
      <slot name="header"><h3 class="text-lg font-semibold text-gray-800">{{ title }}</h3></slot>
    </div>
    <div class="p-6">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: String })
</script>