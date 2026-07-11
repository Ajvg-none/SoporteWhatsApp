<template>
  <div class="animate-fadeIn space-y-6">
    <div class="flex items-center justify-between border-b border-gray-100 pb-4">
      <div>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">Ticket #{{ $route.params.id }}</h1>
          <BaseBadge v-if="ticket" :variant="getStatusVariant(ticket.estado)">
            <span class="capitalize">{{ ticket.estado }}</span>
          </BaseBadge>
        </div>
        <p class="text-gray-500 text-sm mt-1">Detalle del ticket y historial de conversación</p>
      </div>
      <button
        @click="$router.back()"
        class="inline-flex items-center text-sm font-semibold text-gray-500 hover:text-primary transition-colors">
        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver a la lista
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-24">
      <svg class="animate-spin h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm font-medium text-gray-500">Cargando detalles del ticket...</span>
    </div>

    <div v-else-if="errorMsg" class="p-8 text-center bg-white rounded-2xl shadow-sm border border-red-100">
      <div class="inline-flex p-3 rounded-full bg-red-50 text-red-500 mb-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <p class="text-red-700 font-semibold mb-2">Error al cargar el ticket</p>
      <p class="text-red-500 text-sm mb-4">{{ errorMsg }}</p>
      <BaseButton variant="outline" @click="fetchTicketDetails">Reintentar</BaseButton>
    </div>

    <div v-else-if="ticket" class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch h-[calc(100vh-12rem)] min-h-0">
      
      <div class="space-y-6 lg:col-span-1 flex flex-col h-full overflow-hidden min-h-0">
        
        <BaseCard class="border border-gray-100 shadow-sm shrink-0">
          <template #header>
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400">Información del Cliente</h3>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="text-xs text-gray-400 font-medium">Nombre</label>
              <p class="text-base font-semibold text-gray-800">{{ contacto?.nombre || 'Cliente sin registrar' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-400 font-medium">Teléfono / WhatsApp</label>
              <p class="text-sm font-medium text-gray-600 font-mono">{{ formatPhone(contacto?.numero_telefono || ticket.numeroCliente) }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-400 font-medium">Sucursal</label>
              <p class="text-sm font-medium text-gray-600">{{ contacto?.sucursal || 'Sin sucursal asignada' }}</p>
            </div>
            <div>
              <label class="text-xs text-gray-400 font-medium">Creado el</label>
              <p class="text-sm text-gray-500">{{ formatDate(ticket.creadoEn) }}</p>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="border border-gray-100 shadow-sm shrink-0">
          <template #header>
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400">Responsable y Estado</h3>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="text-xs text-gray-400 font-medium">Técnico Asignado</label>
              <div class="flex items-center gap-2 mt-1">
                <span class="w-2.5 h-2.5 rounded-full" :class="ticket.tecnicoAsignadoId ? 'bg-indigo-500' : 'bg-gray-300'"></span>
                <span class="text-sm font-semibold text-gray-700">
                  {{ tecnicoAsignado?.nombre || 'Sin asignar' }}
                </span>
              </div>
            </div>

            <div v-if="ticket.estado === 'nuevo'">
              <BaseButton
                variant="primary"
                class="w-full flex items-center justify-center"
                :loading="actionLoading"
                @click="handleTakeCase"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Tomar Caso
              </BaseButton>
            </div>

            <div v-else-if="!isReadOnly && ticket.estado !== 'cerrado'" class="mt-3">
              <BaseButton
                variant="secondary"
                class="w-full flex items-center justify-center"
                @click="handleTransferCase"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                Transferir Ticket
              </BaseButton>
            </div>

            <div v-if="ticket.transferido" class="pt-2 mt-4 border-t border-gray-100 flex items-center gap-2 text-xs font-semibold text-purple-700">
              <BaseBadge variant="purple">✔ Transferido</BaseBadge>
              <span>Caso transferido anteriormente</span>
            </div>
          </div>
        </BaseCard>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <h3 class="text-sm font-bold uppercase tracking-wider text-gray-700">Bitácora de Auditoría</h3>
          </div>
          
          <div v-if="auditoria.length === 0" class="text-center py-4 text-sm text-gray-400 italic shrink-0">
            Sin registros de auditoría aún.
          </div>
          
          <div v-else class="p-5 flex-1 overflow-y-auto scroll-smooth min-h-0">
            <div class="flow-root">
              <ul role="list" class="-mb-5">
                <li v-for="(item, idx) in auditoria" :key="item.id">
                  <div class="relative pb-5">
                    <span v-if="idx !== auditoria.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-100" aria-hidden="true"></span>
                    <div class="relative flex space-x-3">
                      <div>
                        <span class="h-8 w-8 rounded-full bg-slate-50 border flex items-center justify-center ring-8 ring-white text-xs">
                          🔧
                        </span>
                      </div>
                      <div class="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p class="text-xs text-gray-500">
                            Acción: <b class="text-gray-800 capitalize">{{ formatAuditAction(item.accion) }}</b> por <span class="font-medium text-gray-700">{{ item.usuarioNombre }}</span>
                          </p>
                          <p class="text-[11px] text-gray-400 mt-0.5">
                            {{ formatAuditDetails(item) }}
                          </p>
                        </div>
                        <div class="text-right text-[10px] whitespace-nowrap text-gray-400">
                          {{ formatDate(item.fechaHora) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-6 lg:col-span-2 h-full min-h-0 overflow-hidden">
        <div v-if="isReadOnly" class="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-800 text-sm shrink-0">
          <svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          <div>
            <p class="font-bold">Modo Solo Lectura</p>
            <p class="text-xs text-amber-700 mt-0.5">
              Este ticket está siendo atendido por <b>{{ tecnicoAsignado?.nombre || 'otro técnico' }}</b>. Solo el técnico asignado puede enviar mensajes o realizar modificaciones.
            </p>
          </div>
        </div>

        <div class="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between shrink-0">
            <h3 class="text-base font-bold text-gray-800">Historial de Conversación</h3>
            <span class="text-xs text-gray-400">Canal: WhatsApp</span>
          </div>

          <div ref="chatContainer" class="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/40 scroll-smooth min-h-0">
            <div
              v-for="msg in mensajes"
              :key="msg.id"
              class="flex"
              :class="msg.remitente === 'tecnico' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] rounded-2xl px-4 py-3 shadow-sm border text-sm"
                :class="msg.remitente === 'tecnico' 
                  ? 'bg-primary border-primary/20 text-white rounded-br-none' 
                  : 'bg-white border-gray-100 text-gray-800 rounded-bl-none'"
              >
                <div class="text-[10px] font-semibold mb-1 opacity-75 capitalize flex items-center gap-1">
                  <span>{{ msg.remitente === 'tecnico' ? (msg.tecnicoNombre || 'Técnico') : (contacto?.nombre || 'Cliente') }}</span>
                </div>

                <p class="whitespace-pre-wrap leading-relaxed">{{ msg.contenido }}</p>

                <div v-if="msg.urlAdjunto" class="mt-2.5 pt-2 border-t" :class="msg.remitente === 'tecnico' ? 'border-white/20' : 'border-gray-100'">
                  
                  <div v-if="msg.tipo === 'imagen'">
                    <img
                      :src="getAttachmentUrl(msg.urlAdjunto)"
                      class="max-h-48 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      alt="Imagen adjunta"
                      @click="openLightbox(getAttachmentUrl(msg.urlAdjunto))"
                    />
                  </div>

                  <div v-else-if="msg.tipo === 'audio'">
                    <audio controls class="w-full max-w-[240px] h-10 mt-1">
                      <source :src="getAttachmentUrl(msg.urlAdjunto)" />
                      Tu navegador no soporta reproducción de audio.
                    </audio>
                  </div>

                  <div v-else-if="msg.tipo === 'video'">
                    <video controls class="max-h-48 rounded-lg mt-1 w-full">
                      <source :src="getAttachmentUrl(msg.urlAdjunto)" />
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  </div>

                  <div v-else>
                    <a
                      :href="getAttachmentUrl(msg.urlAdjunto)"
                      target="_blank"
                      download
                      class="inline-flex items-center gap-2 text-xs font-semibold hover:underline"
                      :class="msg.remitente === 'tecnico' ? 'text-white' : 'text-primary'"
                    >
                      <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span>Descargar Documento</span>
                    </a>
                  </div>
                </div>

                <div class="text-[9px] text-right mt-1.5 opacity-60">
                  {{ formatTime(msg.enviadoEn) }}
                </div>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-gray-100 bg-white shrink-0">
            <div v-if="selectedFile" class="mb-3 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div class="flex items-center gap-2 overflow-hidden mr-2">
                <svg class="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span class="text-xs text-gray-600 truncate font-medium">{{ selectedFile.name }}</span>
                <span class="text-[10px] text-gray-400 font-mono">({{ formatBytes(selectedFile.size) }})</span>
              </div>
              <button @click="clearSelectedFile" class="text-gray-400 hover:text-red-500 p-0.5 rounded-full">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form @submit.prevent="handleSendMessage" class="flex gap-2">
              <input
                type="file"
                ref="fileInput"
                class="hidden"
                accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                @change="handleFileChange"
                :disabled="isReadOnly"
              />
              <button
                type="button"
                @click="triggerFileSelect"
                class="inline-flex items-center justify-center p-2.5 rounded-lg border border-gray-200 text-gray-400 hover:text-primary hover:border-primary/30 transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isReadOnly"
                title="Adjuntar archivo"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              
              <input
                v-model="messageText"
                placeholder="Escribe tu mensaje aquí..."
                class="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder-gray-400 disabled:opacity-50"
                :disabled="isReadOnly || sendLoading"
              />

              <BaseButton
                type="submit"
                variant="primary"
                class="!px-5 shrink-0"
                :loading="sendLoading"
                :disabled="isReadOnly || (!messageText.trim() && !selectedFile)"
              >
                Enviar
              </BaseButton>
            </form>
          </div>
        </div>
      </div>
    </div>

    <div v-if="lightboxUrl" class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" @click="lightboxUrl = null">
      <img :src="lightboxUrl" class="max-w-full max-h-full rounded-lg shadow-2xl animate-scaleIn" alt="Imagen ampliada" />
      <button class="absolute top-4 right-4 text-white hover:text-gray-300">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const errorMsg = ref('')
const ticket = ref(null)
const contacto = ref(null)
const tecnicoAsignado = ref(null)
const mensajes = ref([])
const auditoria = ref([])

// Inputs
const messageText = ref('')
const selectedFile = ref(null)
const fileInput = ref(null)

// Loadings
const actionLoading = ref(false)
const sendLoading = ref(false)

// Chat UI Ref
const chatContainer = ref(null)

// Lightbox
const lightboxUrl = ref(null)

// Check mode Solo Lectura (Read Only)
// Si el ticket no es nuevo y el usuario actual no es el asignado ni supervisor
const isReadOnly = computed(() => {
  if (!ticket.value) return true
  if (ticket.value.estado === 'nuevo') return false // cualquiera puede interactuar / autoasignar
  return ticket.value.tecnicoAsignadoId !== authStore.user?.id && authStore.user?.rol !== 'supervisor'
})

const fetchTicketDetails = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const response = await api.get(`/tickets/${route.params.id}`)
    if (response.data && response.data.success) {
      const payload = response.data.data
      ticket.value = payload.ticket
      contacto.value = payload.contacto
      tecnicoAsignado.value = payload.tecnicoAsignado
      mensajes.value = payload.mensajes
      auditoria.value = payload.auditoria
      scrollToBottom()
    } else {
      errorMsg.value = response.data?.error || 'No se pudo obtener el ticket.'
    }
  } catch (error) {
    console.error('Error fetching ticket details:', error)
    errorMsg.value = error.response?.data?.error || 'Error al conectar con la API.'
  } finally {
    loading.value = false
  }
}

const handleTakeCase = async () => {
  if (!ticket.value) return
  actionLoading.value = true
  try {
    // Se envía un objeto vacío {} para forzar el encabezado Content-Type correcto
    const response = await api.post(`/tickets/${ticket.value.id}/assign`, {})
    if (response.data && response.data.success) {
      // Recargar detalles
      await fetchTicketDetails()
    } else {
      alert(response.data?.error || 'Error al tomar el caso')
    }
  } catch (error) {
    console.error('Error taking case:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor.')
  } finally {
      actionLoading.value = false
    }
  }

  const handleTransferCase = () => {
    // Lógica provisional para conectar en el Sprint 2
    alert('Funcionalidad de transferencia de técnico en desarrollo.');
  }

// File Select handlers
const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  // Limite de 25MB (26,214,400 bytes)
  const maxSize = 25 * 1024 * 1024
  if (file.size > maxSize) {
    alert('El archivo supera el límite de 25 MB.')
    clearSelectedFile()
    return
  }
  selectedFile.value = file
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// Send message
const handleSendMessage = async () => {
  if (isReadOnly.value) return
  if (!messageText.value.trim() && !selectedFile.value) return

  sendLoading.value = true
  
  // Optimistic UI Append
  const tempMsgId = `temp_${Date.now()}`
  const optimisticMsg = {
    id: tempMsgId,
    remitente: 'tecnico',
    tecnicoNombre: authStore.user?.nombre || 'Técnico',
    contenido: messageText.value || (selectedFile.value ? `[Archivo: ${selectedFile.value.name}]` : ''),
    tipo: selectedFile.value ? getFileType(selectedFile.value.type) : 'texto',
    urlAdjunto: selectedFile.value ? URL.createObjectURL(selectedFile.value) : null,
    enviadoEn: new Date().toISOString()
  }
  
  mensajes.value.push(optimisticMsg)
  scrollToBottom()

  try {
    const formData = new FormData()
    if (messageText.value.trim()) {
      formData.append('contenido', messageText.value.trim())
    }
    if (selectedFile.value) {
      formData.append('archivo', selectedFile.value)
    }

    const response = await api.post(`/tickets/${ticket.value.id}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    if (response.data && response.data.success) {
      // Reemplazar mensaje optimista con el real
      const realMsg = response.data.data.mensaje
      const idx = mensajes.value.findIndex(m => m.id === tempMsgId)
      if (idx !== -1) {
        mensajes.value[idx] = {
          id: realMsg.id,
          ticketId: realMsg.ticketId,
          remitente: realMsg.remitente,
          tecnicoNombre: realMsg.tecnico,
          contenido: realMsg.contenido,
          tipo: realMsg.tipo,
          urlAdjunto: realMsg.urlAdjunto,
          enviadoEn: realMsg.enviadoEn
        }
      }
      
      // Limpiar inputs
      messageText.value = ''
      clearSelectedFile()

      // Si el ticket era nuevo, ahora es asignado o esperando
      if (ticket.value.estado === 'nuevo') {
        fetchTicketDetails()
      }
    } else {
      alert(response.data?.error || 'Error al enviar mensaje')
      // Remover optimista si falló
      mensajes.value = mensajes.value.filter(m => m.id !== tempMsgId)
    }
  } catch (error) {
    console.error('Error sending message:', error)
    alert(error.response?.data?.error || 'Error al conectar con la API para enviar mensaje.')
    mensajes.value = mensajes.value.filter(m => m.id !== tempMsgId)
  } finally {
    sendLoading.value = false
    scrollToBottom()
  }
}

const getFileType = (mime) => {
  if (mime.startsWith('image/')) return 'imagen'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'documento'
}

const getAttachmentUrl = (urlPath) => {
  if (urlPath.startsWith('blob:')) return urlPath // URL local de vista previa
  // Obtener la URL base del servidor desde variables de entorno
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  // Quitar '/api' para obtener la raíz del servidor (donde se sirven los archivos)
  const baseServer = baseURL.replace(/\/api$/, '')
  return `${baseServer}${urlPath}`
}

const openLightbox = (url) => {
  lightboxUrl.value = url
}

// Helpers
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
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
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatAuditAction = (action) => {
  const map = {
    'creacion': 'creación de ticket',
    'asignacion': 'asignación',
    'solicitud_transferencia': 'solicitud de transferencia',
    'aceptacion_transferencia': 'transferencia aceptada',
    'rechazo_transferencia': 'transferencia rechazada',
    'reasignacion_forzada': 'reasignación forzada',
    'respuesta': 'mensaje enviado',
    'cambio_estado': 'cambio de estado',
    'cierre': 'cierre de ticket'
  }
  return map[action] || action
}

const formatAuditDetails = (item) => {
  const det = item.detalle
  if (!det) return ''
  if (item.accion === 'asignacion') {
    return `Asignado por: ${det.asignado_por || 'técnico'}`
  }
  if (item.accion === 'respuesta') {
    return `Mensaje ${det.tiene_archivo ? `con archivo (${det.tipo_archivo})` : 'de texto'}`
  }
  return JSON.stringify(det)
}

onMounted(() => {
  fetchTicketDetails()
})
</script>