import api from './api'

/**
 * Obtener lista de usuarios (solo supervisor)
 * @returns {Promise} Lista de usuarios
 */
export async function getUsers() {
  const response = await api.get('/users')
  return response.data
}

/**
 * Crear nuevo usuario (solo supervisor)
 * @param {Object} userData - { nombre, email, password, rol }
 * @returns {Promise} Usuario creado
 */
export async function createUser(userData) {
  const response = await api.post('/users', userData)
  return response.data
}

/**
 * Eliminar usuario (solo supervisor)
 * @param {number} userId - ID del usuario a eliminar
 * @returns {Promise} Resultado
 */
export async function deleteUser(userId) {
  const response = await api.delete(`/users/${userId}`)
  return response.data
}

export default {
  getUsers,
  createUser,
  deleteUser
}