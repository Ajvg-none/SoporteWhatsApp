<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-800 dark:text-white">Números Excluidos</h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1">
          Los mensajes de estos números no generarán tickets automáticamente
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
        <p class="font-bold uppercase tracking-wide mb-1">💡 ¿Cuándo usar esta lista?</p>
        <ul class="list-disc list-inside space-y-0.5">
          <li>Tu propio número (para que tus mensajes de prueba no creen tickets)</li>
          <li>Números de administradores o pruebas internas</li>
          <li>Números de spam o bots que no deben generar tickets</li>
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
      <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">No hay números excluidos</p>
      <p class="text-slate-400 text-xs font-semibold mt-1">Agrega el primer número para comenzar a filtrar mensajes</p>
    </div>

    <!-- Table -->
    <BaseCard v-else class="overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-slate-100/40 dark:divide-slate-800/60">
          <thead class="bg-slate-50/50 dark:bg-slate-900/50">
            <tr>
              <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Número</th>
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
                  <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/40 flex items-center justify-center">
                    <svg class="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  </div>
                  <span class="text-sm font-bold text-slate-800 dark:text-white font-mono">
                    {{ item.numeroFormateado }}
                  </span>
                </div>
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
                <button
                  @click="openRemoveConfirm(item)"
                  class="text-danger hover:text-red-600 font-semibold transition-colors cursor-pointer text-sm"
                >
                  Eliminar
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>

    <!-- Modal: Agregar Número -->
    <BaseModal v-model="showAddModal" title="Agregar Número a Lista de Excluidos" size="md">
      <form @submit.prevent="handleAdd" class="space-y-4">
        <BaseInput
          v-model="form.numero"
          label="Número de teléfono"
          placeholder="521234567890 (con código de país, sin +)"
          :error="formErrors.numero"
          required
        />
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
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

    <!-- Dialog: Confirmar Eliminación -->
    <ConfirmDialog
      v-model="showRemoveConfirm"
      title="¿Eliminar este número de la lista?"
      :message="`Los mensajes de ${selectedItem?.numeroFormateado || 'este número'} volverán a generar tickets automáticamente.`"
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
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import { getExcludedNumbers, addExcludedNumber, removeExcludedNumber } from '@/services/excludedNumberService'

const router = useRouter()
const authStore = useAuthStore()

const numbers = ref([])
const loading = ref(false)
const error = ref('')

const showAddModal = ref(false)
const showRemoveConfirm = ref(false)
const selectedItem = ref(null)
const addLoading = ref(false)
const removeLoading = ref(false)

const form = ref({ numero: '', motivo: '' })
const formErrors = ref({})

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
  form.value = { numero: '', motivo: '' }
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
      motivo: form.value.motivo
    })
    
    if (response.success) {
      showAddModal.value = false
      await fetchNumbers()
      alert('✅ Número agregado a la lista de excluidos')
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
      alert('✅ Número eliminado de la lista')
    } else {
      alert(response.error || 'Error al eliminar el número')
    }
  } catch (err) {
    console.error('Error removing excluded number:', err)
    alert(err.response?.data?.error || 'Error de conexión')
  } finally {
    removeLoading.value = false
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