import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))

  const apply = (dark) => {
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
    try {
      localStorage.setItem('theme', dark ? 'dark' : 'light')
    } catch (e) {
      // localStorage no disponible (modo privado, etc.)
    }
  }

  const toggleTheme = () => apply(!isDark.value)

  return { isDark, apply, toggleTheme }
})
