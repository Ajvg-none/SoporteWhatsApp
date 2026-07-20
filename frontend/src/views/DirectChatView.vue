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
                
                <p class="whitespace-pre-wrap break-words leading-relaxed font-medium text-sm">
                  {{ msg.contenido }}
                </p>
                
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
              <textarea
                v-model="messageText"
                :placeholder="`Escribe tu respuesta para ${getSelectedChatName()}...`"
                rows="1"
                class="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary text-slate-900 dark:text-white transition-all duration-200 placeholder-slate-400 min-h-[40px] max-h-[120px] resize-none"
                @input="autoResize"
                @keydown.enter.prevent="handleEnterKey"
              ></textarea>
              <button
                type="submit"
                :disabled="!messageText.trim() || sendLoading"
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
import { 
  getDirectChatNumbers, 
  getMessagesByNumber, 
  sendDirectMessage 
} from '@/services/directChatService'
import socketService from '@/services/socketService'

const router = useRouter()
const authStore = useAuthStore()

// Estados
const chatNumbers = ref([])
const selectedNumber = ref(null)
const selectedChatMessages = ref([])
const loading = ref(false)
const messageText = ref('')
const sendLoading = ref(false)
const chatContainer = ref(null)

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

// Enviar mensaje
const handleSendMessage = async () => {
  if (!messageText.value.trim() || !selectedNumber.value) return
  
  sendLoading.value = true
  try {
    const response = await sendDirectMessage({
      numeroRemitente: selectedNumber.value,
      contenido: messageText.value.trim()
    })
    
    if (response.success) {
      messageText.value = ''
      // Recargar mensajes
      await loadMessages(selectedNumber.value)
      // Recargar números para actualizar último mensaje
      await loadChatNumbers()
    } else {
      alert(response.error || 'Error al enviar mensaje')
    }
  } catch (error) {
    console.error('Error sending message:', error)
    alert(error.response?.data?.error || 'Error de conexión')
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
  if (messageText.value.trim() && !sendLoading.value && selectedNumber.value) {
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