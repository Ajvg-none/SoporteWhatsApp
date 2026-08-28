// frontend/src/services/directChatService.js

import api from './api'

/**
 * Obtener todos los mensajes del chat directo
 */
export async function getDirectMessages() {
  const response = await api.get('/chat-directo')
  return response.data
}

/**
 * Obtener lista de números con chat privado (para sidebar)
 */
export async function getDirectChatNumbers() {
  const response = await api.get('/chat-directo/numbers')
  return response.data
}

/**
 * Obtener mensajes de un número específico
 * @param {string} numero - Número de teléfono
 */
export async function getMessagesByNumber(numero) {
  const response = await api.get(`/chat-directo/${encodeURIComponent(numero)}`)
  return response.data
}

/**
 * Enviar un mensaje desde el supervisor al número VIP
 * @param {Object|FormData} data - { numeroRemitente, contenido } o FormData (con 'archivo' para adjuntos)
 */
export async function sendDirectMessage(data) {
  const esFormData = typeof FormData !== 'undefined' && data instanceof FormData
  const response = await api.post('/chat-directo', data, {
    headers: esFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
  })
  return response.data
}

/**
 * Obtener cantidad de mensajes no leídos (para badge)
 */
export async function getUnreadCount() {
  const response = await api.get('/chat-directo/no-leidos')
  return response.data
}

export default {
  getDirectMessages,
  getDirectChatNumbers,
  getMessagesByNumber,
  sendDirectMessage,
  getUnreadCount
}