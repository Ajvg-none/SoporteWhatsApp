<template>
  <div class="relative inline-block group">
    <slot />
    
    <!-- Tooltip -->
    <Transition name="tooltip">
      <div
        v-if="text && isVisible"
        class="absolute z-50 px-3 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
        :class="positionClasses"
      >
        {{ text }}
        <!-- Arrow -->
        <div
          class="absolute w-2 h-2 bg-slate-900 dark:bg-slate-700 transform rotate-45"
          :class="arrowClasses"
        ></div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  position: { type: String, default: 'top' } // top, bottom, left, right
})

const isVisible = ref(false)

const positionClasses = computed(() => ({
  'top': 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  'bottom': 'top-full left-1/2 -translate-x-1/2 mt-2',
  'left': 'right-full top-1/2 -translate-y-1/2 mr-2',
  'right': 'left-full top-1/2 -translate-y-1/2 ml-2'
}[props.position]))

const arrowClasses = computed(() => ({
  'top': 'bottom-[-4px] left-1/2 -translate-x-1/2',
  'bottom': 'top-[-4px] left-1/2 -translate-x-1/2',
  'left': 'right-[-4px] top-1/2 -translate-y-1/2',
  'right': 'left-[-4px] top-1/2 -translate-y-1/2'
}[props.position]))
</script>

<style scoped>
.tooltip-enter-active,
.tooltip-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.tooltip-enter-from,
.tooltip-leave-to {
  opacity: 0;
  transform: translateY(5px);
}

.group:hover .tooltip {
  opacity: 1;
}
</style>