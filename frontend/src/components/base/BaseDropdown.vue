<template>
  <div class="relative" ref="dropdownRef">
    <!-- Trigger Button -->
    <button
      type="button"
      @click="toggle"
      :disabled="disabled"
      class="w-full inline-flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/65 rounded-xl shadow-xs text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
    >
      <span class="truncate">
        {{ displayValue }}
      </span>
      <svg
        class="w-4 h-4 ml-2 transition-transform duration-200"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div
        v-if="isOpen"
        class="absolute z-10 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/60 rounded-xl shadow-lg overflow-hidden"
      >
        <div class="max-h-60 overflow-y-auto">
          <button
            v-for="option in options"
            :key="option.value"
            type="button"
            @click="selectOption(option)"
            class="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150 cursor-pointer flex items-center justify-between"
            :class="[
              modelValue === option.value
                ? 'bg-primary/5 dark:bg-primary/10 text-primary font-semibold'
                : 'text-slate-700 dark:text-slate-300'
            ]"
          >
            <span>{{ option.label }}</span>
            <svg
              v-if="modelValue === option.value"
              class="w-4 h-4 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, default: () => [] }, // [{ value: 'x', label: 'X' }]
  placeholder: { type: String, default: 'Seleccionar...' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const dropdownRef = ref(null)

const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  const selected = props.options.find(opt => opt.value === props.modelValue)
  return selected ? selected.label : props.placeholder
})

const toggle = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectOption = (option) => {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

// Cerrar al hacer click fuera
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>