import { ref } from 'vue'

const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
let observer = null

export function useDarkMode() {
  if (typeof window !== 'undefined' && !observer) {
    observer = new MutationObserver(() => {
      isDark.value = document.documentElement.classList.contains('dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  }
  return isDark
}