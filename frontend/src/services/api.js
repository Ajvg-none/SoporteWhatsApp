import axios from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  timeout: 15000
})

// Request Interceptor to add Authorization Bearer token
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response Interceptor to handle 401 unauthorized errors
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const authStore = useAuthStore()
    if (error.response && error.response.status === 401) {
      console.warn('Unauthorized request detected. Logging out and redirecting to login.')
      authStore.logout()
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default api
