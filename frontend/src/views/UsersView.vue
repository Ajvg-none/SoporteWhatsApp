<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-800 dark:text-white">Gestión de Usuarios</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">Administra los técnicos y supervisores del sistema</p>
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
      <span class="text-sm font-semibold text-slate-400 dark:text-slate-300">Cargando usuarios...</span>
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
      <div class="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
        <svg class="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">No hay usuarios registrados</p>
      <p class="text-slate-400 text-xs font-semibold mt-1">Crea el primer técnico para comenzar</p>
    </div>

    <!-- Table -->
    <BaseCard v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100/40 dark:divide-slate-800/60">
          <thead class="bg-slate-50/50 dark:bg-slate-900/50">
            <tr>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Nombre</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Email</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Rol</th>
              <th class="px-6 py-4 text-right text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-100/40 dark:divide-slate-800/60">
            <tr v-for="user in users" :key="user.id" class="hover:bg-sky-50/10 dark:hover:bg-sky-950/10 transition-colors duration-150">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800 dark:text-white">{{ user.nombre }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">{{ user.email }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <BaseBadge :variant="user.rol === 'supervisor' ? 'purple' : 'blue'">
                  {{ user.rol }}
                </BaseBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  @click="openDeleteConfirm(user)"
                  class="text-danger hover:text-red-600 dark:text-danger dark:hover:text-red-500 font-semibold transition-colors cursor-pointer"
                >
                  Eliminar
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
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">Rol</label>
          <select
            v-model="form.rol"
            class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200"
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

    <!-- Dialog: Confirmar Eliminación -->
    <ConfirmDialog
      v-model="showDeleteConfirm"
      title="¿Eliminar este usuario?"
      :message="`Al eliminar a ${selectedUser?.nombre || 'este usuario'}, perderá acceso al sistema. Esta acción no se puede deshacer.`"
      confirm-text="Sí, eliminar"
      cancel-text="Cancelar"
      variant="danger"
      @confirm="handleDeleteUser"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { getUsers, createUser, deleteUser } from '@/services/userService'

const router = useRouter()
const authStore = useAuthStore()

// Estados
const users = ref([])
const loading = ref(false)
const error = ref('')
const showCreateModal = ref(false)
const showDeleteConfirm = ref(false)
const selectedUser = ref(null)

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
      alert('Usuario creado exitosamente')
    } else {
      alert(response.error || 'Error al crear usuario')
    }
  } catch (err) {
    console.error('Error creating user:', err)
    alert(err.response?.data?.error || 'Error de conexión')
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
    const response = await deleteUser(selectedUser.value.id)
    if (response.success) {
      showDeleteConfirm.value = false
      await fetchUsers()
      alert('Usuario eliminado exitosamente')
    } else {
      alert(response.error || 'Error al eliminar usuario')
    }
  } catch (err) {
    console.error('Error deleting user:', err)
    alert(err.response?.data?.error || 'Error de conexión')
  } finally {
    deleteLoading.value = false
  }
}
</script>
