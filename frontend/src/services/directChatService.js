import api from './api'

/**
 * Obtener todos los mensajes del chat directo
 */
export async function getDirectMessages() {
  const response = await api.get('/chat-directo')
  return response.data
}

/**
 * Enviar un mensaje desde el supervisor al número VIP
 * @param {Object} data - { numeroRemitente, contenido }
 */
export async function sendDirectMessage(data) {
  const response = await api.post('/chat-directo', data)
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
  sendDirectMessage,
  getUnreadCount
}