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
 * Desactivar un usuario sin eliminarlo físicamente
 * @param {number} userId - ID del usuario a desactivar
 * @returns {Promise} Resultado
 */
export async function desactivarUsuario(userId) {
  const response = await api.patch(`/users/${userId}/desactivar`)
  return response.data
}

/**
 * Alias para mantener compatibilidad con el resto de la app
 */
export async function deleteUser(userId) {
  return desactivarUsuario(userId)
}

export default {
  getUsers,
  createUser,
  desactivarUsuario,
  deleteUser
}