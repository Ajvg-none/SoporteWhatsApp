import api from './api'

/**
 * Obtener lista de números excluidos
 */
export async function getExcludedNumbers() {
  const response = await api.get('/excluidos')
  return response.data
}

/**
 * Agregar un número a la lista de excluidos
 * @param {Object} data - { numero, motivo? }
 */
export async function addExcludedNumber(data) {
  const response = await api.post('/excluidos', data)
  return response.data
}

/**
 * Eliminar un número de la lista de excluidos
 * @param {number} id - ID del número excluido
 */
export async function removeExcludedNumber(id) {
  const response = await api.delete(`/excluidos/${id}`)
  return response.data
}

export default {
  getExcludedNumbers,
  addExcludedNumber,
  removeExcludedNumber
}