import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])
  let idCounter = 0

  const remove = (id) => {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const add = ({ type = 'info', message = '', duration = 4000 }) => {
    const id = ++idCounter
    toasts.value.push({ id, type, message })

    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    // Límite de toasts visibles simultáneos
    if (toasts.value.length > 5) {
      toasts.value.shift()
    }
  }

  const success = (message, duration) => add({ type: 'success', message, duration })
  const error = (message, duration) => add({ type: 'error', message, duration })
  const warning = (message, duration) => add({ type: 'warning', message, duration })
  const info = (message, duration) => add({ type: 'info', message, duration })

  return { toasts, add, remove, success, error, warning, info }
})
