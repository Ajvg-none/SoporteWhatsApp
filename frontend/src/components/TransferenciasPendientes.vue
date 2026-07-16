<template>
  <!-- Solo mostrar si hay transferencias pendientes -->
  <div v-if="transferencias.length > 0" class="mb-4">
    <!-- Tarjeta con borde morado -->
    <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border-l-4 border-l-purple-500 border border-slate-100/80 dark:border-slate-800/80 overflow-hidden">
      
      <!-- Header de la tarjeta -->
      <div class="px-5 py-3 bg-purple-50/50 dark:bg-purple-950/20 border-b border-purple-100/50 dark:border-purple-900/30 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Icono -->
          <div class="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center">
            <svg class="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          
          <div>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-400">
              Transferencias Pendientes
            </h3>
          </div>
          
          <!-- Badge contador -->
          <span class="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 text-xs font-bold">
            {{ transferencias.length }}
          </span>
        </div>

        <!-- Botón actualizar -->
        <button
          @click="fetchTransferencias"
          class="text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors p-1 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/20 cursor-pointer"
          :disabled="loading"
          title="Actualizar"
        >
          <svg v-if="loading" class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <!-- Lista de transferencias -->
      <div class="divide-y divide-purple-100/30 dark:divide-purple-900/30">
        <div
          v-for="ticket in transferencias"
          :key="ticket.id"
          class="px-5 py-3.5 hover:bg-purple-50/30 dark:hover:bg-purple-950/10 transition-colors duration-150"
        >
          <div class="flex items-center justify-between gap-4">
            <!-- Información izquierda -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <span class="text-sm font-bold text-slate-800 dark:text-white">
                  Ticket #{{ ticket.id }}
                </span>
                <BaseBadge :variant="getStatusVariant(ticket.estado)" class="!text-[10px]">
                  {{ ticket.estado }}
                </BaseBadge>
                <span class="text-xs text-slate-500 dark:text-slate-400">
                  {{ ticket.contacto?.nombre || 'Cliente sin registrar' }}
                </span>
              </div>
              
              <div class="mt-1 flex items-center gap-4 flex-wrap text-xs">
                <span class="text-slate-500 dark:text-slate-400 font-mono">
                  {{ formatPhone(ticket.numeroCliente) }}
                </span>
                <span v-if="ticket.contacto?.sucursal" class="text-slate-500 dark:text-slate-400">
                  🏢 {{ ticket.contacto.sucursal }}
                </span>
                <span class="text-purple-600 dark:text-purple-400 font-semibold">
                  👤 Solicita: {{ ticket.solicitante?.nombre || 'Técnico' }}
                </span>
                <span class="text-slate-400 dark:text-slate-500">
                  {{ formatDate(ticket.actualizadoEn) }}
                </span>
              </div>
            </div>

            <!-- Acciones derecha -->
            <div class="flex items-center gap-2 shrink-0">
              <BaseButton
                variant="primary"
                class="!py-1 !px-3.5 !text-xs font-bold shadow-sm"
                :loading="loadingAccept === ticket.id"
                @click="handleAccept(ticket.id)"
              >
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Aceptar
              </BaseButton>
              
              <BaseButton
                variant="danger"
                class="!py-1 !px-3.5 !text-xs font-bold shadow-sm"
                :loading="loadingReject === ticket.id"
                @click="handleReject(ticket.id)"
              >
                <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
                Rechazar
              </BaseButton>
              
              <router-link
                :to="`/tickets/${ticket.id}`"
                class="text-purple-500 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 p-1.5 rounded-lg hover:bg-purple-100/50 dark:hover:bg-purple-900/20 transition-colors cursor-pointer"
                title="Ver ticket"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </router-link>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import { getTransferenciasPendientes, acceptTransfer, rejectTransfer } from '@/services/ticketService'
import socketService from '@/services/socketService'

const authStore = useAuthStore()
const transferencias = ref([])
const loading = ref(false)
const loadingAccept = ref(null)
const loadingReject = ref(null)

const fetchTransferencias = async () => {
  loading.value = true
  try {
    console.log('📥 Obteniendo transferencias pendientes...')
    const response = await getTransferenciasPendientes()
    console.log('📥 Respuesta:', response)
    if (response.success) {
      transferencias.value = response.data || []
      console.log(`✅ ${transferencias.value.length} transferencias pendientes encontradas`)
    } else {
      console.error('❌ Error en respuesta:', response.error)
    }
  } catch (error) {
    console.error('❌ Error fetching transferencias:', error)
    console.error('❌ Detalles:', error.response?.data)
  } finally {
    loading.value = false
  }
}

const handleAccept = async (ticketId) => {
  loadingAccept.value = ticketId
  try {
    const response = await acceptTransfer(ticketId)
    if (response.success) {
      await fetchTransferencias()
      window.dispatchEvent(new CustomEvent('ticket-updated'))
    } else {
      alert(response.error || 'Error al aceptar la transferencia')
    }
  } catch (error) {
    console.error('Error accepting transfer:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    loadingAccept.value = null
  }
}

const handleReject = async (ticketId) => {
  if (!confirm('¿Estás seguro de rechazar esta transferencia?')) return
  
  loadingReject.value = ticketId
  try {
    const response = await rejectTransfer(ticketId)
    if (response.success) {
      await fetchTransferencias()
      window.dispatchEvent(new CustomEvent('ticket-updated'))
    } else {
      alert(response.error || 'Error al rechazar la transferencia')
    }
  } catch (error) {
    console.error('Error rejecting transfer:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    loadingReject.value = null
  }
}

const getStatusVariant = (estado) => {
  const variants = {
    'nuevo': 'blue',
    'asignado': 'green',
    'esperando': 'yellow',
    'resuelto': 'green',
    'cerrado': 'gray'
  }
  return variants[estado] || 'gray'
}

const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace('@c.us', '')
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
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
  console.log('🔄 Componente TransferenciasPendientes montado')
  fetchTransferencias()

  // Intentar conectar WebSocket si no está conectado
  if (!socketService.isConnected()) {
    console.log('🔌 Intentando conectar WebSocket...')
    socketService.connect()
  }

  // Listeners de Socket.IO (solo si está conectado)
  if (socketService.isConnected()) {
    const onTransferenciaNueva = (data) => {
      console.log('📨 Nueva solicitud de transferencia:', data)
      if (data.destino_tecnico_id === authStore.user?.id) {
        fetchTransferencias()
      }
    }

    const onTransferenciaActualizada = () => {
      console.log('📨 Transferencia actualizada')
      fetchTransferencias()
    }

    socketService.on('solicitud_transferencia', onTransferenciaNueva)
    socketService.on('transferencia_aceptada', onTransferenciaActualizada)
    socketService.on('transferencia_rechazada', onTransferenciaActualizada)

    // Cleanup
    onUnmounted(() => {
      socketService.off('solicitud_transferencia', onTransferenciaNueva)
      socketService.off('transferencia_aceptada', onTransferenciaActualizada)
      socketService.off('transferencia_rechazada', onTransferenciaActualizada)
    })
  }
})
</script>