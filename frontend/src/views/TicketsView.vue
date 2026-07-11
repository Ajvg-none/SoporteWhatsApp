<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Gestión de Tickets</h1>
        <p class="text-gray-500 mt-1">Monitorea y atiende los chats de soporte técnico.</p>
      </div>
      <div class="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100 self-start md:self-auto">
        <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-sm font-medium text-gray-600">Sesión activa como: <b class="text-gray-800 capitalize">{{ authStore.user?.rol }}</b></span>
      </div>
    </div>

    <!-- Filtros y Búsqueda -->
    <BaseCard class="border border-gray-100 shadow-sm">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            v-model="searchQuery"
            @input="handleSearchInput"
            placeholder="Buscar por número, nombre de cliente o sucursal..."
            type="text"
            class="w-full pl-10 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition-all placeholder-gray-400"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''; handleSearchInput()"
            class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Tabs de Estado -->
      <div class="mt-5 border-b border-gray-100">
        <nav class="-mb-px flex space-x-6 overflow-x-auto pb-1">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="handleTabChange(tab.value)"
            class="py-2.5 px-1 border-b-2 font-semibold text-sm whitespace-nowrap transition-all duration-200"
            :class="selectedStatus === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-200'"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </BaseCard>

    <!-- Tabla de Tickets -->
    <BaseCard class="border border-gray-100 shadow-sm overflow-hidden">
      <!-- Loading indicator -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20">
        <svg class="animate-spin h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span class="text-sm font-medium text-gray-500">Cargando tickets...</span>
      </div>

      <!-- Error Alert -->
      <div v-else-if="errorMsg" class="p-6 text-center">
        <div class="inline-flex p-3 rounded-full bg-red-50 text-red-500 mb-2">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <p class="text-red-700 font-semibold mb-2">Ha ocurrido un error</p>
        <p class="text-red-500 text-sm mb-4">{{ errorMsg }}</p>
        <BaseButton variant="outline" @click="fetchTickets">Intentar de nuevo</BaseButton>
      </div>

      <!-- Dynamic content with fade transition for empty / table states -->
      <transition name="fade" mode="out-in">
        <div :key="ticketsKey">
          <!-- No Tickets View -->
          <div v-if="tickets.length === 0" class="text-center py-16">
            <div class="inline-flex p-4 rounded-full bg-gray-50 text-gray-400 mb-3">
              <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
              </svg>
            </div>
            <p class="text-gray-800 font-semibold">No se encontraron tickets</p>
            <p class="text-gray-400 text-sm mt-1">Prueba cambiando los filtros o la búsqueda.</p>
          </div>

          <!-- Table content -->
          <div v-else>
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-150">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sucursal</th>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Técnico</th>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Historial Transf.</th>
                <th class="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado</th>
                <th class="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-100">
              <tr v-for="ticket in tickets" :key="ticket.id" class="hover:bg-slate-50/50 transition-colors">
                <!-- ID -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                  #{{ ticket.id }}
                </td>

                <!-- Cliente -->
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <div class="font-medium text-gray-800">
                    {{ ticket.contacto?.nombre || 'Cliente WhatsApp' }}
                  </div>
                  <div class="text-xs text-gray-400">{{ formatPhone(ticket.numeroCliente) }}</div>
                </td>

                <!-- Sucursal -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {{ ticket.contacto?.sucursal || 'Sin especificar' }}
                </td>

                <!-- Estado -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <BaseBadge :variant="getStatusVariant(ticket.estado)">
                    <span class="capitalize">{{ ticket.estado }}</span>
                  </BaseBadge>
                </td>

                <!-- Técnico -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  <div class="flex items-center gap-2">
                    <span v-if="!ticket.tecnicoAsignado" class="italic text-gray-400">Sin asignar</span>
                    <span v-else class="font-medium text-gray-700">{{ ticket.tecnicoAsignado.nombre }}</span>
                    
                    <!-- Read-only locks -->
                    <span 
                      v-if="ticket.tecnicoAsignado && ticket.tecnicoAsignado.id !== authStore.user?.id && ticket.estado !== 'nuevo'"
                      title="Solo lectura (No eres propietario)"
                      class="text-gray-400 hover:text-gray-600"
                    >
                      <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    </span>
                  </div>
                  <!-- Transferencia Pendiente Badge -->
                  <div v-if="ticket.solicitudTransferenciaTecnicoId" class="mt-1">
                    <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                      ⏳ Transf. Pendiente
                      <span v-if="ticket.solicitudTransferenciaTecnico?.nombre">
                        a {{ ticket.solicitudTransferenciaTecnico.nombre }}
                      </span>
                    </span>
                  </div>
                </td>

                <!-- Transferido -->
                <td class="px-6 py-4 whitespace-nowrap text-sm">
                  <BaseBadge v-if="ticket.transferido" variant="purple">✔ Transferido</BaseBadge>
                  <span v-else class="text-xs text-gray-400">-</span>
                </td>

                <!-- Creado -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {{ formatDate(ticket.creadoEn) }}
                </td>

                <!-- Acciones -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <router-link
                    :to="`/tickets/${ticket.id}`"
                    class="inline-flex items-center px-3 py-1.5 bg-gray-50 hover:bg-primary hover:text-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition-all duration-200"
                  >
                    Atender
                    <svg class="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Paginación -->
        <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div class="text-xs text-gray-500 font-medium">
            Mostrando pág. <b>{{ pagination.page }}</b> de <b>{{ pagination.totalPages || 1 }}</b> (Total: <b>{{ pagination.total }}</b> tickets)
          </div>
          <div class="flex items-center gap-2">
            <BaseButton
              variant="secondary"
              class="!py-1.5 !px-3 text-xs"
              :disabled="pagination.page <= 1"
              @click="changePage(pagination.page - 1)"
            >
              Anterior
            </BaseButton>
            <BaseButton
              variant="secondary"
              class="!py-1.5 !px-3 text-xs"
              :disabled="pagination.page >= pagination.totalPages"
              @click="changePage(pagination.page + 1)"
            >
              Siguiente
            </BaseButton>
          </div>
        </div>
      </div>
      </div>
      </transition>
    </BaseCard>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'

const authStore = useAuthStore()

const tickets = ref([])
const loading = ref(false)
const errorMsg = ref('')
const searchQuery = ref('')
const selectedStatus = ref('todos')

const pagination = ref({
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1
})

// Computed key to force transition redraw on filter, pagination or search changes
const ticketsKey = computed(() => `${selectedStatus.value}_${pagination.value.page}_${searchQuery.value}`)

const tabs = [
  { label: 'Todos activos', value: 'todos' },
  { label: 'Nuevos', value: 'nuevo' },
  { label: 'Asignados', value: 'asignado' },
  { label: 'Esperando respuesta', value: 'esperando' },
  { label: 'Resueltos', value: 'resuelto' },
  { label: 'Cerrados', value: 'cerrado' }
]

const fetchTickets = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      buscar: searchQuery.value || undefined
    }

    // Si el tab seleccionado es distinto de 'todos', se envía el filtro de estado.
    if (selectedStatus.value !== 'todos') {
      params.estado = selectedStatus.value
    }
    
    const response = await api.get('/tickets', { params })
    if (response.data && response.data.success) {
      tickets.value = response.data.data
      pagination.value = response.data.pagination
    } else {
      errorMsg.value = response.data?.error || 'No se pudieron recuperar los tickets.'
    }
  } catch (error) {
    console.error('Error fetching tickets:', error)
    errorMsg.value = error.response?.data?.error || 'Error de conexión con la API.'
  } finally {
    loading.value = false
  }
}

// Búsqueda con debounce rudimentario
let searchTimeout = null
const handleSearchInput = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.value.page = 1
    fetchTickets()
  }, 400)
}

const handleTabChange = (status) => {
  selectedStatus.value = status
  pagination.value.page = 1
  fetchTickets()
}

const changePage = (newPage) => {
  pagination.value.page = newPage
  fetchTickets()
}

const getStatusVariant = (estado) => {
  const norm = (estado || '').toLowerCase()
  const variants = {
    'nuevo': 'blue',
    'asignado': 'green',
    'esperando': 'yellow',
    'resuelto': 'green',
    'cerrado': 'gray'
  }
  return variants[norm] || 'gray'
}

const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace('@c.us', '')
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  fetchTickets()
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>