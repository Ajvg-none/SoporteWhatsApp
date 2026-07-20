<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-800 dark:text-white">Números Excluidos</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">
          Controla qué números generan tickets y cuáles van al chat privado
        </p>
      </div>
      <BaseButton variant="primary" @click="openAddModal">
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Agregar Número
      </BaseButton>
    </div>

    <!-- Info Banner -->
    <div class="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-start gap-3.5">
      <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <div class="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
        <p class="font-bold uppercase tracking-wide mb-1">💡 Tipos de exclusión</p>
        <ul class="list-disc list-inside space-y-0.5">
          <li><b>Excluido:</b> Los mensajes de este número NO generan tickets ni aparecen en ningún lado</li>
          <li><b>Chat Privado:</b> Los mensajes van al <b>Chat Privado VIP</b> y todos los supervisores pueden verlos y responder</li>
        </ul>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-col items-center justify-center py-20">
      <svg class="animate-spin h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
      <span class="text-sm font-semibold text-slate-400">Cargando lista...</span>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="p-6 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl">
      <p class="text-red-700 dark:text-red-300 font-bold mb-2">Error al cargar la lista</p>
      <p class="text-red-600 dark:text-red-400 text-sm">{{ error }}</p>
      <BaseButton variant="outline" @click="fetchNumbers" class="mt-4">Intentar de nuevo</BaseButton>
    </div>

    <!-- Empty -->
    <div v-else-if="numbers.length === 0" class="text-center py-16">
      <div class="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
        <svg class="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      </div>
      <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">No hay números gestionados</p>
      <p class="text-slate-400 text-xs font-semibold mt-1">Agrega el primer número para configurar su comportamiento</p>
    </div>

    <!-- Table -->
    <BaseCard v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100/40 dark:divide-slate-800/60">
          <thead class="bg-slate-50/50 dark:bg-slate-900/50">
            <tr>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Alias / Número</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Tipo</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Motivo</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Agregado por</th>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Fecha</th>
              <th class="px-6 py-4 text-right text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-100/40 dark:divide-slate-800/60">
            <tr v-for="item in numbers" :key="item.id" class="hover:bg-sky-50/10 dark:hover:bg-sky-950/10 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center gap-2">
                  <div class="w-8 h-8 rounded-lg flex items-center justify-center"
                    :class="item.tipo === 'chat_privado' 
                      ? 'bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 text-purple-600' 
                      : 'bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 text-red-500'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        :d="item.tipo === 'chat_privado' 
                          ? 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' 
                          : 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm font-bold text-slate-800 dark:text-white">
                      {{ item.nombre || 'Sin alias' }}
                    </div>
                    <div class="text-xs font-mono text-slate-400 dark:text-slate-500">
                      {{ item.numeroFormateado }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <BaseBadge :variant="item.tipo === 'chat_privado' ? 'purple' : 'red'">
                  {{ item.tipoLabel }}
                </BaseBadge>
              </td>
              <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                {{ item.motivo || '—' }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                {{ item.creadoPor }}
              </td>
              <td class="px-6 py-4 text-xs font-semibold text-slate-400">
                {{ formatDate(item.creadoEn) }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right">
                <div class="flex items-center justify-end gap-2">
                  <button
                    @click="openEditModal(item)"
                    class="text-primary hover:text-primary-dark font-semibold transition-colors cursor-pointer text-sm"
                  >
                    Editar
                  </button>
                  <button
                    @click="openRemoveConfirm(item)"
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
    </BaseCard>

    <!-- Modal: Agregar Número -->
    <BaseModal v-model="showAddModal" title="Agregar Número" size="md">
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
          label="Alias (opcional)"
          placeholder="Ej: Soporte interno, Cliente VIP..."
          :error="formErrors.nombre"
        />
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
            Tipo
          </label>
          <select
            v-model="form.tipo"
            class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200"
          >
            <option value="excluido">Excluido (no genera tickets)</option>
            <option value="chat_privado">Chat Privado (va al chat VIP)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
            Motivo (opcional)
          </label>
          <textarea
            v-model="form.motivo"
            placeholder="Ej: Número interno de pruebas, Mensajes del administrador..."
            rows="2"
            class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 placeholder-slate-400"
          ></textarea>
        </div>
      </form>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="secondary" @click="showAddModal = false" :disabled="addLoading">
            Cancelar
          </BaseButton>
          <BaseButton variant="primary" :loading="addLoading" @click="handleAdd">
            Agregar Número
          </BaseButton>
        </div>
      </template>
    </BaseModal>

    <!-- Modal: Editar Número -->
    <BaseModal v-model="showEditModal" title="Editar Número" size="md">
      <form @submit.prevent="handleUpdate" class="space-y-4">
        <BaseInput
          v-model="editForm.nombre"
          label="Alias"
          placeholder="Ej: Soporte interno, Cliente VIP..."
        />
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
            Tipo
          </label>
          <select
            v-model="editForm.tipo"
            class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200"
          >
            <option value="excluido">Excluido (no genera tickets)</option>
            <option value="chat_privado">Chat Privado (va al chat VIP)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-1.5">
            Motivo (opcional)
          </label>
          <textarea
            v-model="editForm.motivo"
            placeholder="Motivo de la exclusión..."
            rows="2"
            class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 placeholder-slate-400"
          ></textarea>
        </div>
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
      title="¿Eliminar este número?"
      :message="`¿Estás seguro de eliminar ${selectedItem?.nombre || selectedItem?.numeroFormateado || 'este número'} de la lista?`"
      confirm-text="Sí, eliminar"
      cancel-text="Cancelar"
      variant="danger"
      @confirm="handleRemove"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { getExcludedNumbers, addExcludedNumber, updateExcludedNumber, removeExcludedNumber } from '@/services/excludedNumberService'

const router = useRouter()
const authStore = useAuthStore()

const numbers = ref([])
const loading = ref(false)
const error = ref('')

// Modal Agregar
const showAddModal = ref(false)
const addLoading = ref(false)
const form = ref({ 
  numero: '', 
  nombre: '', 
  motivo: '', 
  tipo: 'excluido' 
})
const formErrors = ref({})

// Modal Editar
const showEditModal = ref(false)
const editLoading = ref(false)
const editForm = ref({ 
  id: null,
  nombre: '', 
  motivo: '', 
  tipo: 'excluido' 
})

// Eliminar
const showRemoveConfirm = ref(false)
const selectedItem = ref(null)
const removeLoading = ref(false)

onMounted(async () => {
  if (!authStore.isSupervisor) {
    router.push('/')
    return
  }
  await fetchNumbers()
})

const fetchNumbers = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await getExcludedNumbers()
    if (response.success) {
      numbers.value = response.data || []
    } else {
      error.value = response.error || 'Error al cargar la lista'
    }
  } catch (err) {
    console.error('Error fetching excluded numbers:', err)
    error.value = err.response?.data?.error || 'Error de conexión con la API'
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  form.value = { numero: '', nombre: '', motivo: '', tipo: 'excluido' }
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
    const response = await addExcludedNumber({
      numero: numeroLimpio,
      nombre: form.value.nombre || undefined,
      motivo: form.value.motivo || undefined,
      tipo: form.value.tipo
    })
    
    if (response.success) {
      showAddModal.value = false
      await fetchNumbers()
      alert('✅ Número agregado exitosamente')
    } else {
      alert(response.error || 'Error al agregar el número')
    }
  } catch (err) {
    console.error('Error adding excluded number:', err)
    alert(err.response?.data?.error || 'Error de conexión')
  } finally {
    addLoading.value = false
  }
}

const openEditModal = (item) => {
  editForm.value = {
    id: item.id,
    nombre: item.nombre || '',
    motivo: item.motivo || '',
    tipo: item.tipo || 'excluido'
  }
  showEditModal.value = true
}

const handleUpdate = async () => {
  editLoading.value = true
  try {
    const response = await updateExcludedNumber(editForm.value.id, {
      nombre: editForm.value.nombre || undefined,
      motivo: editForm.value.motivo || undefined,
      tipo: editForm.value.tipo
    })
    
    if (response.success) {
      showEditModal.value = false
      await fetchNumbers()
      alert('✅ Número actualizado exitosamente')
    } else {
      alert(response.error || 'Error al actualizar el número')
    }
  } catch (err) {
    console.error('Error updating excluded number:', err)
    alert(err.response?.data?.error || 'Error de conexión')
  } finally {
    editLoading.value = false
  }
}

const openRemoveConfirm = (item) => {
  selectedItem.value = item
  showRemoveConfirm.value = true
}

const handleRemove = async () => {
  if (!selectedItem.value) return
  
  removeLoading.value = true
  try {
    const response = await removeExcludedNumber(selectedItem.value.id)
    if (response.success) {
      showRemoveConfirm.value = false
      await fetchNumbers()
      alert('✅ Número eliminado correctamente')
    } else {
      alert(response.error || 'Error al eliminar el número')
    }
  } catch (err) {
    console.error('Error removing excluded number:', err)
    alert(err.response?.data?.error || 'Error de conexión')
  } finally {
    removeLoading.value = false
    selectedItem.value = null
  }
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