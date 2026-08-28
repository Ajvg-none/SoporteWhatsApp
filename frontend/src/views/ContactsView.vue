<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 class="text-3xl font-bold text-body">Contactos</h1>
        <p class="text-secondary mt-1">
          Lista de contactos con soporte activo. Puedes agregar, editar o eliminar contactos.
        </p>
      </div>
      <BaseButton variant="primary" @click="openAddModal">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Agregar Contacto
      </BaseButton>
    </div>

    <!-- Búsqueda -->
    <div class="relative max-w-md">
      <svg class="w-5 h-5 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="buscar"
        @input="onBuscar"
        type="text"
        placeholder="Buscar por número, nombre o sucursal..."
        class="w-full pl-11 pr-4 py-2.5 bg-input border border-edge rounded-xl text-sm text-body focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-300"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <svg class="animate-spin h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <span class="text-sm font-semibold text-muted">Cargando contactos...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="p-6 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl">
      <p class="text-red-700 dark:text-red-300 font-bold mb-2">Error al cargar la lista</p>
      <p class="text-red-600 dark:text-red-400 text-sm">{{ error }}</p>
      <BaseButton variant="outline" @click="fetchContacts" class="mt-4">Intentar de nuevo</BaseButton>
    </div>

    <!-- Empty -->
    <div v-else-if="contacts.length === 0" class="text-center py-16">
      <div class="inline-flex p-4 rounded-full bg-input mb-3">
        <svg class="h-7 w-7 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <p class="text-secondary font-bold text-sm">No hay contactos</p>
      <p class="text-muted text-xs font-semibold mt-1">Los contactos se crean automáticamente al recibir mensajes, o agrégalos manualmente</p>
    </div>

    <!-- Table -->
    <BaseCard v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-edge">
          <thead class="bg-surface-header">
            <tr>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Contacto</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Teléfono</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Sucursal</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Registrado</th>
              <th class="px-6 py-4 text-right text-[10px] font-extrabold text-muted dark:text-body uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-surface-card divide-y divide-edge">
            <tr v-for="c in contacts" :key="c.numero_telefono" class="hover:bg-primary-light/10 dark:odd:bg-surface-zebra dark:hover:bg-surface-hover transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-primary-light dark:bg-primary-deep border border-primary-light dark:border-primary-deep text-primary flex items-center justify-center text-sm font-bold uppercase">
                    {{ initials(c.nombre || c.numero_telefono) }}
                  </div>
                  <div class="text-sm font-bold text-body">
                    {{ c.nombre || 'Sin nombre' }}
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-secondary">
                {{ formatPhone(c.numero_telefono) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-secondary">
                {{ c.sucursal || '—' }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-xs font-semibold text-muted">
                {{ formatDate(c.creadoEn) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(c)"
                    class="text-primary hover:text-primary-dark font-semibold transition-colors cursor-pointer text-sm"
                  >
                    Editar
                  </button>
                  <button
                    @click="openRemoveConfirm(c)"
                    class="text-danger hover:text-red-600 font-semibold transition-colors cursor-pointer text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-6 py-4 border-t border-edge/60">
        <span class="text-xs font-semibold text-muted">
          Página {{ page }} de {{ totalPages }} · {{ total }} contactos
        </span>
        <div class="flex gap-2">
          <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="changePage(page - 1)">
            Anterior
          </BaseButton>
          <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages" @click="changePage(page + 1)">
            Siguiente
          </BaseButton>
        </div>
      </div>
    </BaseCard>

    <!-- Modal: Agregar Contacto -->
    <BaseModal v-model="showAddModal" title="Agregar Contacto" size="md">
      <form @submit.prevent="handleAdd" class="space-y-4">
        <BaseInput
          v-model="form.numero"
          label="Número de teléfono"
          placeholder="521234567890 (con código de país, sin +)"
          :error="formErrors.numero"
          required
        />
        <BaseInput
          v-model="form.nombre"
          label="Nombre (opcional)"
          placeholder="Ej: Juan Pérez..."
          :error="formErrors.nombre"
        />
        <BaseInput
          v-model="form.sucursal"
          label="Sucursal (opcional)"
          placeholder="Ej: Querétaro, CDMX..."
          :error="formErrors.sucursal"
        />
      </form>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="secondary" @click="showAddModal = false" :disabled="addLoading">
            Cancelar
          </BaseButton>
          <BaseButton variant="primary" :loading="addLoading" @click="handleAdd">
            Agregar Contacto
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal: Editar Contacto -->
    <BaseModal v-model="showEditModal" title="Editar Contacto" size="md">
      <form @submit.prevent="handleUpdate" class="space-y-4">
        <BaseInput
          v-model="editForm.nombre"
          label="Nombre"
          placeholder="Ej: Juan Pérez..."
        />
        <BaseInput
          v-model="editForm.sucursal"
          label="Sucursal"
          placeholder="Ej: Querétaro, CDMX..."
        />
      </form>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="secondary" @click="showEditModal = false" :disabled="editLoading">
            Cancelar
          </BaseButton>
          <BaseButton variant="primary" :loading="editLoading" @click="handleUpdate">
            Guardar Cambios
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Dialog: Confirmar Eliminación -->
    <ConfirmDialog
      v-model="showRemoveConfirm"
      title="¿Eliminar este contacto?"
      :message="`¿Estás seguro de eliminar a ${selectedItem?.nombre || formatPhone(selectedItem?.numero_telefono) || 'este contacto'}? Los tickets asociados no se eliminan.`"
      confirm-text="Sí, eliminar"
      cancel-text="Cancelar"
      variant="danger"
      @confirm="handleRemove"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { getContacts, createContact, updateContact, deleteContact } from '@/services/contactService'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const contacts = ref([])
const loading = ref(false)
const error = ref('')
const buscar = ref('')

// Paginación
const page = ref(1)
const limit = 20
const total = ref(0)
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / limit)))

// Modal Agregar
const showAddModal = ref(false)
const addLoading = ref(false)
const form = ref({ numero: '', nombre: '', sucursal: '' })
const formErrors = ref({})

// Modal Editar
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref({ numero: '', nombre: '', sucursal: '' })

// Eliminar
const showRemoveConfirm = ref(false)
const selectedItem = ref(null)
const removeLoading = ref(false)

let searchTimeout = null

onMounted(async () => {
  if (!authStore.isSupervisor) {
    router.push('/')
    return
  }
  await fetchContacts()
})

const fetchContacts = async () => {
  loading.value = true
  error.value = ''
  try {
    const params = { page: page.value, limit }
    if (buscar.value.trim()) params.buscar = buscar.value.trim()
    const response = await getContacts(params)
    if (response.success) {
      contacts.value = response.data || []
      total.value = response.pagination?.total || contacts.value.length
    } else {
      error.value = response.error || 'Error al cargar la lista'
    }
  } catch (err) {
    console.error('Error fetching contacts:', err)
    error.value = err.response?.data?.error || 'Error de conexión con la API'
  } finally {
    loading.value = false
  }
}

const onBuscar = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    page.value = 1
    fetchContacts()
  }, 400)
}

const changePage = (p) => {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  fetchContacts()
}

const openAddModal = () => {
  form.value = { numero: '', nombre: '', sucursal: '' }
  formErrors.value = {}
  showAddModal.value = true
}

const validateForm = () => {
  const errors = {}
  const numeroLimpio = form.value.numero.replace(/[\s\-\(\)\+]/g, '')
  if (!numeroLimpio) {
    errors.numero = 'El número es obligatorio'
  } else if (!/^\d{10,15}$/.test(numeroLimpio)) {
    errors.numero = 'El número debe tener entre 10 y 15 dígitos (solo números)'
  }
  formErrors.value = errors
  return Object.keys(errors).length === 0
}

const handleAdd = async () => {
  if (!validateForm()) return

  addLoading.value = true
  try {
    const numeroLimpio = form.value.numero.replace(/[\s\-\(\)\+]/g, '')
    const response = await createContact({
      numero: numeroLimpio,
      nombre: form.value.nombre || undefined,
      sucursal: form.value.sucursal || undefined
    })
    if (response.success) {
      showAddModal.value = false
      await fetchContacts()
      toast.success('Contacto agregado exitosamente')
    } else {
      toast.error(response.error || 'Error al agregar el contacto')
    }
  } catch (err) {
    console.error('Error adding contact:', err)
    toast.error(err.response?.data?.error || 'Error de conexión')
  } finally {
    addLoading.value = false
  }
}

const openEditModal = (c) => {
  editForm.value = {
    numero: c.numero_telefono,
    nombre: c.nombre || '',
    sucursal: c.sucursal || ''
  }
  showEditModal.value = true
}

const handleUpdate = async () => {
  editLoading.value = true
  try {
    const response = await updateContact(editForm.value.numero, {
      nombre: editForm.value.nombre || undefined,
      sucursal: editForm.value.sucursal || undefined
    })
    if (response.success) {
      showEditModal.value = false
      await fetchContacts()
      toast.success('Contacto actualizado exitosamente')
    } else {
      toast.error(response.error || 'Error al actualizar el contacto')
    }
  } catch (err) {
    console.error('Error updating contact:', err)
    toast.error(err.response?.data?.error || 'Error de conexión')
  } finally {
    editLoading.value = false
  }
}

const openRemoveConfirm = (c) => {
  selectedItem.value = c
  showRemoveConfirm.value = true
}

const handleRemove = async () => {
  if (!selectedItem.value) return

  removeLoading.value = true
  try {
    const response = await deleteContact(selectedItem.value.numero_telefono)
    if (response.success) {
      showRemoveConfirm.value = false
      await fetchContacts()
      toast.success('Contacto eliminado correctamente')
    } else {
      toast.error(response.error || 'Error al eliminar el contacto')
    }
  } catch (err) {
    console.error('Error removing contact:', err)
    toast.error(err.response?.data?.error || 'Error de conexión')
  } finally {
    removeLoading.value = false
    selectedItem.value = null
  }
}

const formatPhone = (numero) => {
  if (!numero) return '—'
  return String(numero).replace(/@c\.us|@g\.us|@lid/gi, '').replace(/[\s\-\(\)]/g, '')
}

const initials = (nombre) => {
  const s = String(nombre || '?')
  const parts = s.trim().split(/\s+/)
  return (parts[0]?.[0] || '?') + (parts[1]?.[0] || '')
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>
