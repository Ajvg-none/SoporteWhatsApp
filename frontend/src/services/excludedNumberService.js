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
 * @param {Object} data - { numero, nombre?, motivo?, tipo? }
 */
export async function addExcludedNumber(data) {
  const response = await api.post('/excluidos', data)
  return response.data
}

/**
 * Actualizar un número excluido
 * @param {number} id - ID del número excluido
 * @param {Object} data - { nombre?, motivo?, tipo? }
 */
export async function updateExcludedNumber(id, data) {
  const response = await api.put(`/excluidos/${id}`, data)
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
  updateExcludedNumber,
  removeExcludedNumber
}