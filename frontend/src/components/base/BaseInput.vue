<template>
  <div class="mb-4">
    <label v-if="label" class="block text-xs font-bold uppercase tracking-wider text-secondary mb-1.5">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      class="appearance-none block w-full px-4 py-2.5 bg-input border border-edge rounded-xl shadow-xs placeholder-gray-400 dark:placeholder-gray-300 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary dark:focus:bg-input-focus text-body sm:text-sm transition-all duration-200"
      :class="{ 'border-danger focus:ring-danger/15 focus:border-danger dark:border-danger': error }"
      @input="$emit('update:modelValue', $event.target.value)"
    />
    <p v-if="error" class="mt-1.5 text-xs font-medium text-danger">{{ error }}</p>
  </div>
</template>

<script setup>
defineProps({
  modelValue: [String, Number],
  label: String,
  type: { type: String, default: 'text' },
  placeholder: String,
  error: String
})
defineEmits(['update:modelValue'])
</script>