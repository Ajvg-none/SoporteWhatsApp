<template>
  <div class="animate-fadeIn space-y-6">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Gestión de Tickets</h1>
        <p class="text-slate-405 dark:text-slate-400 text-sm mt-1 font-medium">Monitorea y atiende los chats de soporte técnico.</p>
      </div>
      <div class="flex items-center gap-2.5">
        <BaseButton variant="primary" @click="openNewTicketModal">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Ticket
        </BaseButton>
        <div class="bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-xs border border-slate-100 dark:border-slate-800 self-start md:self-auto flex items-center gap-2.5">
          <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">Sesión activa como: <b class="text-slate-800 dark:text-white capitalize">{{ authStore.user?.rol }}</b></span>
        </div>
      </div>
    </div>

    <!-- 🟣 Transferencias Pendientes -->
    <TransferenciasPendientes />

    <!-- Filtros y Búsqueda -->
    <BaseCard class="border border-slate-100/80 dark:border-slate-800/80 shadow-sm">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1 relative">
          <span class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            v-model="searchQuery"
            @input="handleSearchInput"
            placeholder="Buscar por número, nombre de cliente o sucursal..."
            type="text"
            class="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white dark:focus:bg-slate-800 transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-500"
          />
          <button
            v-if="searchQuery"
            @click="searchQuery = ''; handleSearchInput()"
            class="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-650 dark:hover:text-slate-300 cursor-pointer"
          >
            <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

<!-- Tabs de Estado -->
<div class="mt-5 pt-4 border-t border-slate-100/80 dark:border-slate-800/80">
  <nav class="flex space-x-2 overflow-x-auto pb-1">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      @click="handleTabChange(tab.value)"
      class="py-2 px-3.5 rounded-xl font-bold text-[11px] tracking-wider uppercase whitespace-nowrap transition-all duration-200 border cursor-pointer flex items-center gap-2"
      :class="selectedStatus === tab.value
        ? 'bg-sky-50 dark:bg-sky-950/40 text-primary border-sky-100 dark:border-sky-900/30 shadow-xs shadow-sky-100/50'
        : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50/60 dark:hover:bg-slate-800/50'"
    >
      <span>{{ tab.label }}</span>
      <!-- Badge con contador -->
      <span
        v-if="tab.showCount && getCountForTab(tab) > 0"
        class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-black"
        :class="selectedStatus === tab.value
          ? 'bg-primary text-white'
          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'"
      >
        {{ getCountForTab(tab) }}
      </span>
    </button>
  </nav>
</div>
    </BaseCard>

    <!-- Tabla de Tickets -->
    <BaseCard class="border border-slate-100/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
      <!-- Dynamic content with fade transition for loading / error / table states -->
      <transition name="fade" mode="out-in">
        <!-- Loading indicator -->
        <div v-if="loading" key="loading" class="flex flex-col items-center justify-center py-20">
          <svg class="animate-spin h-8 w-8 text-primary mb-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-xs font-semibold text-slate-400 dark:text-slate-500">Cargando tickets...</span>
        </div>

        <!-- Error Alert -->
        <div v-else-if="errorMsg" key="error" class="p-6 text-center">
          <div class="inline-flex p-3 rounded-full bg-red-55 text-red-500 mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <p class="text-red-700 dark:text-red-400 font-bold mb-2">Ha ocurrido un error</p>
          <p class="text-red-500 dark:text-red-300 text-xs mb-4 font-semibold">{{ errorMsg }}</p>
          <BaseButton variant="outline" @click="fetchTickets">Intentar de nuevo</BaseButton>
        </div>

        <!-- Table content -->
        <div v-else :key="ticketsKey">
          <!-- No Tickets View -->
          <div v-if="tickets.length === 0" class="text-center py-16 animate-fadeIn">
            <div class="inline-flex p-4 rounded-full bg-slate-55/40 text-slate-400 dark:text-slate-500 border border-slate-100 dark:border-slate-800 mb-3">
              <svg class="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
              </svg>
            </div>
            <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">No se encontraron tickets</p>
            <p class="text-slate-400 dark:text-slate-500 text-xs font-semibold mt-1">Prueba cambiando los filtros o la búsqueda.</p>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-100/40 dark:divide-slate-800/60">
              <thead class="bg-slate-50/50 dark:bg-slate-900/50">
                <tr>
                  <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">ID</th>
                  <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Cliente</th>
                  <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Sucursal</th>
                  <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Estado</th>
                  <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Técnico</th>
                  <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Historial Transf.</th>
                  <th class="px-6 py-4 text-left text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Creado</th>
                  <th class="px-6 py-4 text-right text-[10px] font-extrabold text-slate-400 dark:text-slate-300 uppercase tracking-wider">Acción</th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-slate-900 divide-y divide-slate-100/40 dark:divide-slate-800/60">
                <tr v-for="ticket in tickets" :key="ticket.id" class="hover:bg-sky-50/10 dark:hover:bg-sky-950/10 transition-colors duration-150">
                  <!-- ID -->
                  <td class="px-6 py-4.5 whitespace-nowrap text-sm font-extrabold text-slate-900 dark:text-white">
                    #{{ ticket.id }}
                  </td>

                  <!-- Cliente -->
                  <td class="px-6 py-4.5 whitespace-nowrap text-sm">
                    <div class="font-bold text-slate-800 dark:text-white">
                      {{ ticket.contacto?.nombre || 'Cliente WhatsApp' }}
                    </div>
                    <div class="text-xs font-semibold text-slate-400 dark:text-slate-300 font-mono mt-0.5">{{ formatPhone(ticket.numeroCliente) }}</div>
                  </td>

                  <!-- Sucursal -->
                  <td class="px-6 py-4.5 whitespace-nowrap text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {{ ticket.contacto?.sucursal || 'Sin especificar' }}
                  </td>

                  <!-- Estado -->
                  <td class="px-6 py-4.5 whitespace-nowrap">
                    <BaseBadge :variant="getStatusVariant(ticket.estado)">
                      <span class="capitalize">{{ ticket.estado }}</span>
                    </BaseBadge>
                  </td>

                  <!-- Técnico -->
                  <td class="px-6 py-4.5 whitespace-nowrap text-sm text-slate-650 dark:text-slate-300">
                    <div class="flex items-center gap-2">
                      <span v-if="!ticket.tecnicoAsignado" class="italic font-medium text-slate-400 dark:text-slate-500">Sin asignar</span>
                      <span v-else class="font-bold text-slate-700 dark:text-white">{{ ticket.tecnicoAsignado.nombre }}</span>
                      
                      <!-- Read-only locks -->
                      <span 
                        v-if="ticket.tecnicoAsignado && ticket.tecnicoAsignado.id !== authStore.user?.id && ticket.estado !== 'nuevo'"
                        title="Solo lectura (No eres propietario)"
                        class="text-slate-405 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </span>
                    </div>
                    <!-- Transferencia Pendiente Badge -->
                    <div v-if="ticket.solicitudTransferenciaTecnicoId" class="mt-1">
                      <span class="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40 tracking-wide uppercase">
                        ⏳ Transf. Pendiente
                        <span v-if="ticket.solicitudTransferenciaTecnico?.nombre" class="ml-1 text-[9px] opacity-90 font-medium lowercase">
                          a {{ ticket.solicitudTransferenciaTecnico.nombre }}
                        </span>
                      </span>
                    </div>
                  </td>

                  <!-- Transferido -->
                  <td class="px-6 py-4.5 whitespace-nowrap text-sm">
                    <BaseBadge v-if="ticket.transferido" variant="purple">✔ Transferido</BaseBadge>
                    <span v-else class="text-xs text-slate-300 dark:text-slate-500 font-bold">-</span>
                  </td>

                  <!-- Creado -->
                  <td class="px-6 py-4.5 whitespace-nowrap text-xs font-semibold text-slate-400 dark:text-slate-300">
                    {{ formatDate(ticket.creadoEn) }}
                  </td>

                  <!-- Acciones -->
                  <td class="px-6 py-4.5 whitespace-nowrap text-right text-sm font-medium">
                    <router-link
                      :to="`/tickets/${ticket.id}`"
                      class="inline-flex items-center px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-primary dark:hover:bg-primary hover:text-white border border-slate-100 dark:border-slate-700 hover:border-transparent rounded-xl text-xs font-bold text-slate-700 dark:text-white transition-all duration-200 shadow-xs cursor-pointer"
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
          <div v-if="tickets.length > 0" class="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100/40 dark:border-slate-800/40 flex items-center justify-between">
            <div class="text-xs text-slate-400 dark:text-slate-500 font-semibold">
              Mostrando pág. <b class="text-slate-800 dark:text-white font-bold">{{ pagination.page }}</b> de <b class="text-slate-800 dark:text-white font-bold">{{ pagination.totalPages || 1 }}</b> (Total: <b class="text-slate-800 dark:text-white font-bold">{{ pagination.total }}</b> tickets)
            </div>
            <div class="flex items-center gap-2">
              <BaseButton
                variant="secondary"
                class="!py-1.5 !px-3.5 !rounded-xl text-xs font-bold shadow-xs border-slate-100 dark:border-slate-800 cursor-pointer"
                :disabled="pagination.page <= 1"
                @click="changePage(pagination.page - 1)"
              >
                Anterior
              </BaseButton>
              <BaseButton
                variant="secondary"
                class="!py-1.5 !px-3.5 !rounded-xl text-xs font-bold shadow-xs border-slate-100 dark:border-slate-800 cursor-pointer"
                :disabled="pagination.page >= pagination.totalPages"
                @click="changePage(pagination.page + 1)"
              >
                Siguiente
              </BaseButton>
            </div>
          </div>
        </div>
      </transition>
    </BaseCard>

    <!-- Modal: Nuevo Ticket a un contacto registrado -->
    <BaseModal v-model="showNewTicketModal" title="Nuevo Ticket" size="md">
      <div class="space-y-4">
        <p class="text-xs text-slate-500 dark:text-slate-400 font-semibold">
          Selecciona un contacto registrado para crear un ticket (p. ej. escribirle a la tienda). El ticket quedará asignado a ti.
        </p>
        <div class="relative">
          <svg class="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            v-model="contactSearch"
            @input="searchContacts"
            type="text"
            placeholder="Buscar contacto por nombre o número..."
            class="w-full pl-11 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200"
          />
        </div>

        <!-- Lista de contactos -->
        <div v-if="searchLoading" class="flex justify-center py-8">
          <svg class="animate-spin h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
        </div>
        <div v-else-if="contactOptions.length === 0" class="text-center py-8">
          <p class="text-slate-500 dark:text-slate-400 text-sm font-semibold">No se encontraron contactos registrados</p>
          <p class="text-xs text-slate-400 mt-1">Agrégalos desde el apartado Contáctos (supervisor)</p>
        </div>
        <div v-else class="max-h-72 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-xl divide-y divide-slate-100/40 dark:divide-slate-800/60">
          <button
            v-for="c in contactOptions"
            :key="c.numero_telefono"
            @click="selectContact(c)"
            class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-sky-50/60 dark:hover:bg-sky-950/20 transition-colors cursor-pointer"
            :class="selectedContact?.numero_telefono === c.numero_telefono ? 'bg-sky-50 dark:bg-sky-950/30' : ''"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-primary flex items-center justify-center text-sm font-bold uppercase shrink-0">
                {{ initials(c.nombre || c.numero_telefono) }}
              </div>
              <div class="min-w-0">
                <div class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ c.nombre || 'Sin nombre' }}</div>
                <div class="text-xs font-mono text-slate-400">{{ formatPhone(c.numero_telefono) }}</div>
              </div>
            </div>
            <svg v-if="selectedContact?.numero_telefono === c.numero_telefono" class="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </div>
      <div v-if="createError" class="mt-3 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-xs font-semibold text-red-600 dark:text-red-400">
        {{ createError }}
      </div>
      <template #footer>
        <div class="flex gap-3 justify-end">
          <BaseButton variant="secondary" @click="showNewTicketModal = false" :disabled="createLoading">
            Cancelar
          </BaseButton>
          <BaseButton variant="primary" :loading="createLoading" :disabled="!selectedContact" @click="handleCreateTicket">
            Crear Ticket
          </BaseButton>
        </div>
      </template>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import TransferenciasPendientes from '@/components/TransferenciasPendientes.vue'
import socketService from '@/services/socketService'
import { getContacts } from '@/services/contactService'
import { createManualTicket } from '@/services/ticketService'

const authStore = useAuthStore()
const router = useRouter()

const tickets = ref([]) 
const loading = ref(false)
const errorMsg = ref('')
const searchQuery = ref('')
const selectedStatus = ref('todos')
const ticketCounts = ref({
  nuevos: 0,
  asignados: 0,
  esperando: 0,
  resueltos: 0,
  cerrados: 0,
  misAsignados: 0
})

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
  { label: 'Nuevos', value: 'nuevo', showCount: true, countKey: 'nuevos' },
  { label: 'Mi Asignación', value: 'mis_asignados', showCount: true, countKey: 'misAsignados' },
  { label: 'Asignados', value: 'asignado' },
  { label: 'Esperando respuesta', value: 'esperando' },
  { label: 'Resueltos', value: 'resuelto' },
  { label: 'Cerrados', value: 'cerrado' }
]

// ============================================================
// FUNCIONES
// ============================================================

const fetchTickets = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const params = {
      page: pagination.value.page,
      limit: pagination.value.limit,
      buscar: searchQuery.value || undefined
    }

    // Si el tab seleccionado es 'mis_asignados', enviar filtro especial
    if (selectedStatus.value === 'mis_asignados') {
      params.mis_tickets = 'true'
    } else if (selectedStatus.value !== 'todos') {
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

const fetchTicketCounts = async () => {
  try {
    const response = await api.get('/tickets/counts')
    if (response.data && response.data.success) {
      ticketCounts.value = response.data.data
    }
  } catch (error) {
    console.error('Error fetching ticket counts:', error)
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


const getCountForTab = (tab) => {
  if (!tab.countKey) return 0
  return ticketCounts.value[tab.countKey] || 0
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
  return String(phone).replace(/@c\.us|@g\.us|@lid/gi, '').replace(/[\s\-\(\)]/g, '')
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

// ============================================================
// NUEVO TICKET (manual a un contacto registrado)
// ============================================================
const showNewTicketModal = ref(false)
const contactSearch = ref('')
const contactOptions = ref([])
const selectedContact = ref(null)
const searchLoading = ref(false)
const createLoading = ref(false)
const createError = ref('')

const openNewTicketModal = () => {
  showNewTicketModal.value = true
  contactSearch.value = ''
  selectedContact.value = null
  createError.value = ''
  searchContacts()
}

let contactSearchTimeout = null
const searchContacts = () => {
  if (contactSearchTimeout) clearTimeout(contactSearchTimeout)
  contactSearchTimeout = setTimeout(async () => {
    searchLoading.value = true
    try {
      const res = await getContacts({ buscar: contactSearch.value || undefined, limit: 50 })
      contactOptions.value = (res && res.data) || []
    } catch (e) {
      console.error('Error cargando contactos:', e)
      contactOptions.value = []
    } finally {
      searchLoading.value = false
    }
  }, 250)
}

const selectContact = (c) => {
  selectedContact.value = selectedContact.value?.numero_telefono === c.numero_telefono ? null : c
}

const initials = (name) => {
  const str = String(name || '').trim()
  if (!str) return '?'
  const parts = str.split(/\s+/)
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase()
}

const handleCreateTicket = async () => {
  if (!selectedContact.value || createLoading.value) return
  createLoading.value = true
  createError.value = ''
  try {
    const res = await createManualTicket(selectedContact.value.numero_telefono)
    const ticketId = res?.data?.ticket?.id
    const yaExistente = res?.data?.yaExistente
    showNewTicketModal.value = false
    if (!ticketId) {
      createError.value = res?.message || 'No se pudo crear el ticket.'
      showNewTicketModal.value = true
      return
    }
    if (yaExistente) {
      await fetchTickets()
      await fetchTicketCounts()
    }
    router.push(`/tickets/${ticketId}`)
  } catch (error) {
    createError.value = error.response?.data?.error || 'Error al crear el ticket.'
    showNewTicketModal.value = false
    // Re-abrir para mostrar el error
    showNewTicketModal.value = true
  } finally {
    createLoading.value = false
  }
}

// ============================================================
// CICLO DE VIDA
// ============================================================

onMounted(() => {
  fetchTickets()
  fetchTicketCounts()
  
  // Escuchar eventos de actualización de tickets
  // Cuando se acepte o rechace una transferencia, se recarga la tabla
  window.addEventListener('ticket-updated', fetchTickets)

  // Tiempo real: mensajes nuevos de clientes recargan la lista
  if (!socketService.isConnected()) {
    socketService.connect()
  }
  socketService.on('nuevo_mensaje_ticket', () => {
    fetchTickets()
    fetchTicketCounts()
  })
})

onUnmounted(() => {
  window.removeEventListener('ticket-updated', fetchTickets)
  socketService.off('nuevo_mensaje_ticket')
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