import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  // Cargar estado inicial desde localStorage para persistencia (RF-02)
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(JSON.parse(localStorage.getItem('user') || 'null'))

  const isAuthenticated = computed(() => !!token.value)
  // El rol es crucial para proteger Dashboard y Usuarios (RF-04, RF-28)
  const isSupervisor = computed(() => user.value?.rol === 'supervisor')

  const setAuth = (newToken, newUser) => {
    token.value = newToken
    user.value = newUser
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(newUser))
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      if (response.data && response.data.success) {
        setAuth(response.data.token, response.data.user)
        return response.data.user
      } else {
        throw new Error(response.data.error || 'Credenciales inválidas')
      }
    } catch (error) {
      let errorMsg = 'Error al iniciar sesión'
      if (error.response) {
        if (error.response.status === 500) {
          errorMsg = 'Error de conexión con el servidor'
        } else {
          errorMsg = error.response.data?.error || error.response.data?.message || 'Credenciales inválidas'
        }
      } else if (error.request) {
        errorMsg = 'Error de conexión con el servidor'
      } else {
        errorMsg = error.message || 'Error de conexión con el servidor'
      }
      throw new Error(errorMsg)
    }
  }

  const logout = () => {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return { token, user, isAuthenticated, isSupervisor, setAuth, login, logout }
})