import api from './api'

/**
 * Cambiar estado de un ticket
 * @param {number} ticketId - ID del ticket
 * @param {string} estado - Nuevo estado
 * @returns {Promise} Respuesta de la API
 */
export async function changeStatus(ticketId, estado) {
  const response = await api.put(`/tickets/${ticketId}/status`, { estado })
  return response.data
}

/**
 * Cerrar un ticket
 * @param {number} ticketId - ID del ticket
 * @returns {Promise} Respuesta de la API
 */
export async function closeTicket(ticketId) {
  const response = await api.post(`/tickets/${ticketId}/close`)
  return response.data
}

/**
 * Solicitar transferencia de ticket
 * @param {number} ticketId - ID del ticket
 * @param {number} destinoTecnicoId - ID del técnico destino
 * @returns {Promise} Respuesta de la API
 */
export async function requestTransfer(ticketId, destinoTecnicoId) {
  const response = await api.post(`/tickets/${ticketId}/transfer-request`, {
    destino_tecnico_id: destinoTecnicoId
  })
  return response.data
}

/**
 * Aceptar transferencia de ticket
 * @param {number} ticketId - ID del ticket
 * @returns {Promise} Respuesta de la API
 */
export async function acceptTransfer(ticketId) {
  const response = await api.post(`/tickets/${ticketId}/transfer-accept`)
  return response.data
}

/**
 * Rechazar transferencia de ticket
 * @param {number} ticketId - ID del ticket
 * @returns {Promise} Respuesta de la API
 */
export async function rejectTransfer(ticketId) {
  const response = await api.post(`/tickets/${ticketId}/transfer-reject`)
  return response.data
}

/**
 * Reasignación forzada por supervisor
 * @param {number} ticketId - ID del ticket
 * @param {number} destinoTecnicoId - ID del técnico destino
 * @returns {Promise} Respuesta de la API
 */
export async function forceAssign(ticketId, destinoTecnicoId) {
  const response = await api.post(`/tickets/${ticketId}/force-assign`, {
    destino_tecnico_id: destinoTecnicoId
  })
  return response.data
}

/**
* Obtener lista de técnicos (para modales de transferencia/reasignación)
* Usa el endpoint /api/users y filtra solo los técnicos
* @returns {Promise} Lista de técnicos
*/
export async function getTechnicians() {
  const response = await api.get('/users/tecnicos')
  return response.data
}

export async function getTransferenciasPendientes() {
  const response = await api.get('/tickets/transferencias-pendientes')
  return response.data
}

export default {
  changeStatus,
  closeTicket,
  requestTransfer,
  acceptTransfer,
  rejectTransfer,
  forceAssign,
  getTechnicians,
  getTransferenciasPendientes
}