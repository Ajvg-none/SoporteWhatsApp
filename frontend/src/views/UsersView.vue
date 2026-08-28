<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-body">Gestión de Usuarios</h1>
        <p class="text-secondary mt-1">Administra los técnicos y supervisores del sistema</p>
      </div>
      <BaseButton
        variant="primary"
        @click="openCreateModal"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Técnico
      </BaseButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <svg class="animate-spin h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm font-semibold text-muted">Cargando usuarios...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="p-6 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl">
      <p class="text-red-700 dark:text-red-300 font-bold mb-2">Error al cargar usuarios</p>
      <p class="text-red-600 dark:text-red-400 text-sm">{{ error }}</p>
      <BaseButton variant="outline" @click="fetchUsers" class="mt-4">
        Intentar de nuevo
      </BaseButton>
    </div>

    <!-- Empty State -->
    <div v-else-if="users.length === 0" class="text-center py-16">
      <div class="inline-flex p-4 rounded-full bg-input mb-3">
        <svg class="h-7 w-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p class="text-secondary font-bold text-sm">No hay usuarios registrados</p>
      <p class="text-muted text-xs font-semibold mt-1">Crea el primer técnico para comenzar</p>
    </div>

    <!-- Table -->
    <BaseCard v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-edge">
          <thead class="bg-surface-header">
            <tr>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Nombre</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Email</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Rol</th>
              <!-- ✅ NUEVA COLUMNA: Estado -->
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Estado</th>
              <th class="px-6 py-4 text-right text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-surface-card divide-y divide-edge">
            <!-- ✅ Cada fila se atenúa si el usuario está inactivo -->
            <tr
              v-for="user in users"
              :key="user.id"
              class="hover:bg-primary-light/10 dark:odd:bg-surface-zebra dark:hover:bg-surface-hover transition-colors duration-150"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold" :class="user.activo ? 'text-body' : 'text-muted'">
                {{ user.nombre }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm" :class="user.activo ? 'text-secondary' : 'text-muted'">
                {{ user.email }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <BaseBadge :variant="user.rol === 'supervisor' ? 'purple' : 'blue'">
                  <svg v-if="user.rol === 'supervisor'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <svg v-else class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                  {{ user.rol === 'supervisor' ? 'Supervisor' : 'Técnico' }}
                </BaseBadge>
              </td>
              <!-- Estado -->
              <td class="px-6 py-4 whitespace-nowrap">
                <BaseBadge :variant="user.activo ? 'green' : 'gray'" dot>
                  {{ user.activo ? 'Activo' : 'Inactivo' }}
                </BaseBadge>
              </td>
              <!-- Acciones -->
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  v-if="user.activo"
                  @click="openDeleteConfirm(user)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-danger/30 text-danger hover:bg-danger hover:text-white hover:border-danger transition-colors duration-150 cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Desactivar
                </button>
                <button
                  v-else
                  @click="openReactivarConfirm(user)"
                  class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border border-emerald-500/40 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors duration-150 cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Reactivar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Modal: Crear Usuario -->
    <BaseModal
      v-model="showCreateModal"
      title="Crear Nuevo Técnico"
      size="md"
    >
      <form @submit.prevent="handleCreateUser" class="space-y-4">
        <BaseInput
          v-model="form.nombre"
          label="Nombre completo"
          placeholder="Juan Pérez"
          :error="formErrors.nombre"
          required
        />
        <BaseInput
          v-model="form.email"
          label="Correo electrónico"
          type="email"
          placeholder="juan@empresa.com"
          :error="formErrors.email"
          required
        />
        <BaseInput
          v-model="form.password"
          label="Contraseña"
          type="password"
          placeholder="Mínimo 6 caracteres"
          :error="formErrors.password"
          required
        />
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-muted mb-1.5">Rol</label>
          <select
            v-model="form.rol"
            class="w-full px-4 py-2.5 bg-input border border-edge rounded-xl text-sm text-body focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200"
          >
            <option value="tecnico">Técnico</option>
            <option value="supervisor">Supervisor</option>
          </select>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton
            variant="secondary"
            @click="showCreateModal = false"
            :disabled="createLoading"
          >
            Cancelar
          </BaseButton>
          <BaseButton
            variant="primary"
            :loading="createLoading"
            @click="handleCreateUser"
          >
            Crear Usuario
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Dialog: Confirmar Desactivación -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="¿Desactivar este usuario?"
      :message="`Al desactivar a ${selectedUser?.nombre || 'este usuario'}, perderá acceso al sistema. Su historial de auditoría y tickets asignados se conservarán.`"
      confirm-text="Sí, desactivar"
      cancel-text="Cancelar"
      variant="danger"
      @confirm="handleDeleteUser"
    />

    <!-- Dialog: Confirmar Reactivar -->
    <ConfirmDialog
      v-model="showReactivarConfirm"
      title="¿Reactivar este usuario?"
      :message="`Al reactivar a ${selectedReactivarUser?.nombre || 'este usuario'} recuperará acceso al sistema.`"
      confirm-text="Sí, reactivar"
      cancel-text="Cancelar"
      variant="primary"
      @confirm="handleReactivarUser"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
// ✅ NUEVO: importar reactivarUsuario
import { getUsers, createUser, desactivarUsuario, reactivarUsuario } from '@/services/userService'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

// Estados
const users = ref([])
const loading = ref(false)
const error = ref('')
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const selectedUser = ref(null)
const showReactivarConfirm = ref(false)
const selectedReactivarUser = ref(null)

// Formulario de creación
const form = ref({
  nombre: '',
  email: '',
  password: '',
  rol: 'tecnico'
})
const formErrors = ref({})
const createLoading = ref(false)
const deleteLoading = ref(false)

// Cargar usuarios al montar
onMounted(async () => {
  // Verificar que sea supervisor
  if (!authStore.isSupervisor) {
    router.push('/')
    return
  }
  await fetchUsers()
})

const fetchUsers = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await getUsers()
    if (response.success) {
      users.value = response.data || []
    } else {
      error.value = response.error || 'Error al cargar usuarios'
    }
  } catch (err) {
    console.error('Error fetching users:', err)
    error.value = err.response?.data?.error || 'Error de conexión con la API'
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  form.value = { nombre: '', email: '', password: '', rol: 'tecnico' }
  formErrors.value = {}
  showCreateModal.value = true
}

const validateForm = () => {
  const errors = {}
  if (!form.value.nombre.trim()) {
    errors.nombre = 'El nombre es obligatorio'
  }
  if (!form.value.email.trim()) {
    errors.email = 'El email es obligatorio'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) {
    errors.email = 'El email no es válido'
  }
  if (!form.value.password) {
    errors.password = 'La contraseña es obligatoria'
  } else if (form.value.password.length < 6) {
    errors.password = 'La contraseña debe tener al menos 6 caracteres'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleCreateUser = async () => {
  if (!validateForm()) return
  createLoading.value = true
  try {
    const response = await createUser(form.value)
    if (response.success) {
      showCreateModal.value = false
      await fetchUsers()
      toast.success('Usuario creado exitosamente')
    } else {
      toast.error(response.error || 'Error al crear usuario')
    }
  } catch (err) {
    console.error('Error creating user:', err)
    toast.error(err.response?.data?.error || 'Error de conexión')
  } finally {
    createLoading.value = false
  }
}

const openDeleteConfirm = (user) => {
  selectedUser.value = user
  showDeleteConfirm.value = true
}

const handleDeleteUser = async () => {
  if (!selectedUser.value) return
  deleteLoading.value = true
  try {
    const response = await desactivarUsuario(selectedUser.value.id)
    if (response.success) {
      showDeleteConfirm.value = false
      await fetchUsers()
      toast.success('Técnico desactivado correctamente.')
    } else {
      toast.error(response.error || 'Error al desactivar usuario')
    }
  } catch (err) {
    console.error('Error desactivando usuario:', err)
    const mensaje = err.response?.data?.error || 'Ocurrió un error al desactivar al técnico.'
    toast.error(mensaje)
  } finally {
    deleteLoading.value = false
  }
}

// ✅ NUEVO: Función para reactivar usuario
const openReactivarConfirm = (user) => {
  selectedReactivarUser.value = user
  showReactivarConfirm.value = true
}

const handleReactivarUser = async () => {
  if (!selectedReactivarUser.value) return

  try {
    const response = await reactivarUsuario(selectedReactivarUser.value.id)
    if (response.success) {
      await fetchUsers()
      toast.success('Usuario reactivado correctamente')
    } else {
      toast.error(response.error || 'Error al reactivar usuario')
    }
  } catch (err) {
    console.error('Error reactivando usuario:', err)
    toast.error(err.response?.data?.error || 'Error de conexión')
  }
}
</script>