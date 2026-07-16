<template>
  <div class="mb-4">
    <label v-if="label" class="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">{{ label }}</label>
    <input
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      class="appearance-none block w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200/50 rounded-xl shadow-xs placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white text-slate-800 sm:text-sm transition-all duration-200"
      :class="{ 'border-danger focus:ring-danger/15 focus:border-danger': error }"
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