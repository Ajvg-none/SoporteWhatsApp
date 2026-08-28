import api from './api'

/**
 * Obtener listado de contactos (búsqueda opcional)
 * @param {Object} params - { buscar?, page?, limit? }
 */
export async function getContacts(params = {}) {
  const response = await api.get('/contactos', { params })
  return response.data
}

/**
 * Crear un contacto manualmente
 * @param {Object} data - { numero, nombre?, sucursal? }
 */
export async function createContact(data) {
  const response = await api.post('/contactos', data)
  return response.data
}

/**
 * Actualizar un contacto (nombre/sucursal)
 * @param {string} numero - Número del contacto
 * @param {Object} data - { nombre?, sucursal? }
 */
export async function updateContact(numero, data) {
  const response = await api.put(`/contactos/${encodeURIComponent(numero)}`, data)
  return response.data
}

/**
 * Eliminar un contacto
 * @param {string} numero - Número del contacto
 */
export async function deleteContact(numero) {
  const response = await api.delete(`/contactos/${encodeURIComponent(numero)}`)
  return response.data
}

export default {
  getContacts,
  createContact,
  updateContact,
  deleteContact
}
