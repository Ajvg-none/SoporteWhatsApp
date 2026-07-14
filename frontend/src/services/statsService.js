import api from './api'

/**
 * Obtener estadísticas del dashboard
 * @param {string} periodo - '7d', '30d', '90d'
 * @returns {Promise} Datos del dashboard
 */
export async function getDashboardStats(periodo = '7d') {
  const response = await api.get('/stats/dashboard', {
    params: { periodo }
  })
  return response.data
}

export default {
  getDashboardStats
}