<!-- frontend/src/views/DirectChatView.vue -->

<template>
  <div class="animate-fadeIn h-[calc(100vh-8rem)] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4 shrink-0">
      <div>
        <h1 class="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
          💬 Chat Privado VIP
        </h1>
        <p class="text-slate-500 dark:text-slate-400 mt-1 text-sm font-semibold">
          Canal directo con números configurados como chat privado
        </p>
      </div>
      <div class="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl">
        <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span class="text-xs font-bold text-emerald-700 dark:text-emerald-300">
          En vivo
        </span>
      </div>
    </div>

    <!-- Chat con Sidebar -->
    <div class="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 shadow-sm flex overflow-hidden min-h-0">
      
      <!-- Sidebar: Lista de números VIP -->
      <aside class="w-64 border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0 bg-slate-50/30 dark:bg-slate-950/20">
        <!-- Header del sidebar -->
        <div class="p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div class="flex items-center justify-between">
            <span class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">
              Conversaciones
            </span>
            <span class="text-xs font-bold text-slate-400 dark:text-slate-500">
              {{ chatNumbers.length }}
            </span>
          </div>
        </div>

        <!-- Lista de números -->
        <div class="flex-1 overflow-y-auto">
          <div
            v-for="chat in chatNumbers"
            :key="chat.numero"
            @click="selectChat(chat.numero)"
            class="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150 border-b border-slate-100 dark:border-slate-800"
            :class="{
              'bg-sky-50 dark:bg-sky-950/30 border-l-4 border-l-primary': selectedNumber === chat.numero,
              'border-l-4 border-l-transparent': selectedNumber !== chat.numero
            }"
          >
            <div class="flex items-start gap-2.5">
              <!-- Avatar -->
              <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                :class="selectedNumber === chat.numero 
                  ? 'bg-primary text-white' 
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'"
              >
                <span class="font-bold text-sm">
                  {{ getInitials(chat.nombre || chat.numero) }}
                </span>
              </div>

              <!-- Info del chat -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-slate-800 dark:text-white truncate">
                    {{ chat.nombre || chat.numero }}
                  </span>
                  <span class="text-[10px] font-semibold text-slate-400 dark:text-slate-500 whitespace-nowrap ml-2">
                    {{ formatTime(chat.ultimoEnvio) }}
                  </span>
                </div>
                <div class="flex items-center justify-between mt-0.5">
                  <span class="text-xs text-slate-500 dark:text-slate-400 truncate flex-1">
                    {{ chat.ultimoMensaje || 'Sin mensajes' }}
                  </span>
                  <!-- Badge de no leídos -->
                  <span
                    v-if="chat.noLeidos > 0"
                    class="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-black"
                  >
                    {{ chat.noLeidos }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Empty state del sidebar -->
          <div v-if="chatNumbers.length === 0" class="text-center py-12">
            <svg class="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p class="text-sm font-bold text-slate-500 dark:text-slate-400">Sin chats privados</p>
            <p class="text-xs text-slate-400 dark:text-slate-500 mt-1">Agrega números como "Chat Privado"</p>
          </div>
        </div>
      </aside>

      <!-- Área de chat principal -->
      <main class="flex-1 flex flex-col min-h-0">
        <!-- Chat seleccionado -->
        <template v-if="selectedNumber">
          <!-- Header del chat -->
          <div class="px-6 py-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-primary-hover text-white flex items-center justify-center font-bold text-sm">
              {{ getInitials(getSelectedChatName()) }}
            </div>
            <div>
              <div class="text-sm font-bold text-slate-800 dark:text-white">
                {{ getSelectedChatName() }}
              </div>
              <div class="text-[10px] text-slate-400 dark:text-slate-400 font-semibold">
                {{ selectedChatMessages.length }} mensajes
              </div>
            </div>
          </div>

          <!-- Lista de mensajes -->
          <div ref="chatContainer" class="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 dark:bg-slate-950/10">
            <div
              v-for="msg in selectedChatMessages"
              :key="msg.id"
              class="flex"
              :class="msg.remitente === 'supervisor' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[75%] rounded-2xl px-4 py-3 shadow-xs text-sm"
                :class="msg.remitente === 'supervisor'
                  ? 'bg-gradient-to-tr from-primary to-primary-hover text-white rounded-tr-none'
                  : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-slate-800 dark:text-white rounded-tl-none'"
              >
                <div class="text-[10px] font-extrabold tracking-wider uppercase mb-1.5" :class="msg.remitente === 'supervisor' ? 'text-white/75' : 'text-slate-400 dark:text-slate-400'">
                  {{ msg.remitente === 'supervisor' ? (msg.supervisorNombre || 'Tú') : (msg.alias || 'VIP') }}
                </div>
                
                <p
                  v-if="msg.contenido && (!msg.urlAdjunto || !msg.contenido.startsWith('[Archivo: '))"
                  class="whitespace-pre-wrap break-words leading-relaxed font-medium text-sm"
                >
                  {{ msg.contenido }}
                </p>

                <!-- Adjunto -->
                <div
                  v-if="msg.urlAdjunto"
                  class="mt-2.5 overflow-hidden rounded-xl border"
                  :class="msg.remitente === 'supervisor' ? 'border-white/15' : 'border-slate-100 dark:border-slate-700/70'"
                >
                  <img
                    v-if="msg.tipo === 'imagen'"
                    :src="getAttachmentUrl(msg.urlAdjunto)"
                    class="w-full max-h-60 object-cover cursor-pointer transition-all duration-300 hover:scale-102 hover:brightness-95"
                    alt="Imagen adjunta"
                  />
                  <a
                    v-else
                    :href="getAttachmentUrl(msg.urlAdjunto)"
                    target="_blank"
                    rel="noopener"
                    class="flex items-center gap-2.5 px-3.5 py-3"
                    :class="msg.remitente === 'supervisor' ? 'text-white/90' : 'text-primary'"
                  >
                    <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span class="text-xs font-semibold break-all">{{ msg.tipo || 'Archivo' }}</span>
                  </a>
                </div>
                
                <div class="text-[10px] text-right mt-1.5 font-bold uppercase tracking-wider" :class="msg.remitente === 'supervisor' ? 'text-white/50' : 'text-slate-400 dark:text-slate-400'">
                  {{ formatTime(msg.enviadoEn) }}
                </div>
              </div>
            </div>

            <!-- Mensaje de "sin mensajes" -->
            <div v-if="selectedChatMessages.length === 0" class="text-center py-16">
              <div class="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
                <svg class="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">Sin mensajes</p>
              <p class="text-slate-400 text-xs font-semibold mt-1">Este chat está vacío</p>
            </div>
          </div>

          <!-- Input de respuesta -->
          <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <form @submit.prevent="handleSendMessage" class="flex items-end gap-2">
              <input
                ref="fileInput"
                type="file"
                class="hidden"
                @change="handleFileSelect"
              />
              <button
                type="button"
                @click="fileInput?.click()"
                title="Adjuntar archivo"
                class="inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/10 transition-all cursor-pointer"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <AudioRecorder @audio-recorded="handleAudioRecorded" class="mb-[1px]" />

              <div class="flex-1 flex flex-col gap-1.5">
                <div
                  v-if="selectedFile"
                  class="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-lg"
                >
                  <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  <span class="truncate max-w-[220px]">{{ selectedFile.name }}</span>
                  <button
                    type="button"
                    @click="clearSelectedFile"
                    class="ml-auto hover:opacity-70 cursor-pointer"
                    title="Quitar archivo"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <textarea
                  v-model="messageText"
                  :placeholder="`Escribe tu respuesta para ${getSelectedChatName()}...`"
                  rows="1"
                  class="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 dark:text-white transition-all duration-200 placeholder-slate-400 min-h-[40px] max-h-[120px] resize-none"
                  @input="autoResize"
                  @keydown.enter.prevent="handleEnterKey"
                ></textarea>
              </div>
              <button
                type="submit"
                :disabled="(!messageText.trim() && !selectedFile) || sendLoading"
                class="inline-flex items-center justify-center px-5 py-2.5 bg-primary text-white rounded-xl font-semibold shadow-md shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <svg v-if="sendLoading" class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <svg v-else class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Enviar
              </button>
            </form>
          </div>
        </template>

        <!-- No chat seleccionado -->
        <template v-else>
          <div class="flex-1 flex items-center justify-center flex-col p-8 text-center">
            <svg class="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 class="text-lg font-bold text-slate-700 dark:text-slate-300">Selecciona un chat</h3>
            <p class="text-sm text-slate-400 dark:text-slate-500 mt-1">Elige una conversación del panel izquierdo</p>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { 
  getDirectChatNumbers, 
  getMessagesByNumber, 
  sendDirectMessage 
} from '@/services/directChatService'
import socketService from '@/services/socketService'
import AudioRecorder from '@/components/base/AudioRecorder.vue'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

// Estados
const chatNumbers = ref([])
const selectedNumber = ref(null)
const selectedChatMessages = ref([])
const loading = ref(false)
const messageText = ref('')
const sendLoading = ref(false)
const chatContainer = ref(null)
const fileInput = ref(null)
const selectedFile = ref(null)

// Computed: Obtener nombre del chat seleccionado
const getSelectedChatName = () => {
  const chat = chatNumbers.value.find(c => c.numero === selectedNumber.value)
  return chat?.nombre || chat?.numero || 'Chat'
}

// Computed: Iniciales para avatar
const getInitials = (name) => {
  if (!name) return '?'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
}

// Cargar lista de números
const loadChatNumbers = async () => {
  try {
    const response = await getDirectChatNumbers()
    if (response.success) {
      chatNumbers.value = response.data || []
      
      // Si hay números y no hay selección, seleccionar el primero
      if (chatNumbers.value.length > 0 && !selectedNumber.value) {
        selectedNumber.value = chatNumbers.value[0].numero
        await loadMessages(selectedNumber.value)
      }
    }
  } catch (error) {
    console.error('Error loading chat numbers:', error)
  }
}

// Cargar mensajes de un número específico
const loadMessages = async (numero) => {
  if (!numero) return
  
  loading.value = true
  try {
    const response = await getMessagesByNumber(numero)
    if (response.success) {
      selectedChatMessages.value = response.data || []
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error loading messages:', error)
  } finally {
    loading.value = false
  }
}

// Seleccionar un chat
const selectChat = async (numero) => {
  if (selectedNumber.value === numero) return
  
  selectedNumber.value = numero
  await loadMessages(numero)
}

// Seleccionar archivo adjunto
const handleFileSelect = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  const maxSize = 25 * 1024 * 1024 // 25 MB
  if (file.size > maxSize) {
    toast.error('El archivo supera el límite de 25 MB.')
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  selectedFile.value = file
  if (fileInput.value) fileInput.value.value = ''
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// URL absoluta del adjunto servido desde el backend
const getAttachmentUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  return base.replace(/\/api\/?$/, '') + url
}

const handleAudioRecorded = async (blob) => {
  const file = new File([blob], `nota-voz-${Date.now()}.webm`, { type: 'audio/webm' })
  selectedFile.value = file
  await handleSendMessage()
}

// Enviar mensaje
const handleSendMessage = async () => {
  if ((!messageText.value.trim() && !selectedFile.value) || !selectedNumber.value) return

  sendLoading.value = true
  try {
    const formData = new FormData()
    formData.append('numeroRemitente', selectedNumber.value)
    if (messageText.value.trim()) {
      formData.append('contenido', messageText.value.trim())
    }
    if (selectedFile.value) {
      formData.append('archivo', selectedFile.value)
    }

    const response = await sendDirectMessage(formData)

    if (response.success) {
      messageText.value = ''
      clearSelectedFile()

      // Si OpenWA no pudo entregar, avisar al supervisor
      if (response.data?.enviado === false) {
        toast.warning('No se pudo enviar por WhatsApp: ' + (response.data?.error || 'destino no resuelto por WhatsApp'))
      }

      // Recargar mensajes
      await loadMessages(selectedNumber.value)
      // Recargar números para actualizar último mensaje
      await loadChatNumbers()
    } else {
      toast.error(response.error || 'Error al enviar mensaje')
    }
  } catch (error) {
    console.error('Error sending message:', error)
    toast.error(error.response?.data?.error || 'Error de conexión')
  } finally {
    sendLoading.value = false
  }
}

// Auto-resize del textarea
const autoResize = (event) => {
  const el = event.target
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

const handleEnterKey = () => {
  if ((messageText.value.trim() || selectedFile.value) && !sendLoading.value && selectedNumber.value) {
    handleSendMessage()
  }
}

// Scroll al fondo del chat
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// Formatear hora
const formatTime = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Manejador de nuevos mensajes (WebSocket)
const handleNewMessage = (data) => {
  // Si el mensaje es del número seleccionado, recargar mensajes
  if (data.numeroRemitente === selectedNumber.value) {
    loadMessages(selectedNumber.value)
  }
  // Recargar lista de números para actualizar último mensaje y contador
  loadChatNumbers()
}

// Watch: cuando cambia el número seleccionado, recargar mensajes
watch(selectedNumber, (newVal) => {
  if (newVal) {
    loadMessages(newVal)
  }
})

// Ciclo de vida
onMounted(async () => {
  if (!authStore.isSupervisor) {
    router.push('/')
    return
  }
  
  await loadChatNumbers()
  
  if (!socketService.isConnected()) {
    socketService.connect()
  }
  
  socketService.on('nuevo_mensaje_directo', handleNewMessage)
  socketService.on('respuesta_directa_enviada', handleNewMessage)
})

onUnmounted(() => {
  socketService.off('nuevo_mensaje_directo', handleNewMessage)
  socketService.off('respuesta_directa_enviada', handleNewMessage)
})
</script>

<style scoped>
/* Estilos adicionales si son necesarios */
</style>