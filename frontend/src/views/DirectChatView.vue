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

    <!-- Info Banner -->
    <div v-if="mensajes.length === 0 && !loading" class="p-4 bg-sky-50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40 rounded-2xl mb-4 shrink-0">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-sky-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div class="text-xs text-sky-800 dark:text-sky-300 leading-relaxed">
          <p class="font-bold uppercase tracking-wide mb-1">💡 ¿Cómo funciona?</p>
          <ul class="list-disc list-inside space-y-0.5">
            <li>Los mensajes de números configurados como "chat_privado" llegan aquí</li>
            <li>No generan tickets en el sistema</li>
            <li>Todos los supervisores ven la misma conversación</li>
            <li>Puedes responder directamente desde este chat</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <svg class="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
      </svg>
    </div>

    <!-- Área de chat -->
    <div v-else class="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 shadow-sm flex flex-col overflow-hidden min-h-0">
      <!-- Lista de mensajes -->
      <div ref="chatContainer" class="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30 dark:bg-slate-950/20 min-h-0">
        <div v-if="mensajes.length === 0" class="text-center py-16">
          <div class="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
            <svg class="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p class="text-slate-700 dark:text-slate-300 font-bold text-sm">Sin mensajes aún</p>
          <p class="text-slate-400 text-xs font-semibold mt-1">Los mensajes del número VIP aparecerán aquí</p>
        </div>

        <div
          v-for="msg in mensajes"
          :key="msg.id"
          class="flex"
          :class="msg.remitente === 'supervisor' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[75%] rounded-2xl px-4 py-3 shadow-xs"
            :class="msg.remitente === 'supervisor'
              ? 'bg-gradient-to-tr from-primary to-primary-hover text-white rounded-tr-none'
              : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-slate-800 dark:text-white rounded-tl-none'"
          >
            <div class="text-[10px] font-extrabold tracking-wider uppercase mb-1.5 opacity-75">
              {{ msg.remitente === 'supervisor' ? (msg.supervisorNombre || 'Supervisor') : 'Número VIP' }}
            </div>
            
            <p class="whitespace-pre-wrap break-words leading-relaxed font-medium text-sm">
              {{ msg.contenido }}
            </p>
            
            <div class="text-[10px] text-right mt-1.5 font-bold uppercase tracking-wider opacity-60">
              {{ formatTime(msg.enviadoEn) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Input de respuesta -->
      <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
        <form @submit.prevent="handleSendMessage" class="flex items-end gap-2">
          <textarea
            v-model="messageText"
            placeholder="Escribe tu respuesta al número VIP..."
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getDirectMessages, sendDirectMessage } from '@/services/directChatService'
import socketService from '@/services/socketService'

const router = useRouter()
const authStore = useAuthStore()

const mensajes = ref([])
const loading = ref(false)
const messageText = ref('')
const sendLoading = ref(false)
const chatContainer = ref(null)

onMounted(async () => {
  if (!authStore.isSupervisor) {
    router.push('/')
    return
  }
  
  await fetchMessages()
  
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

const fetchMessages = async () => {
  loading.value = true
  try {
    const response = await getDirectMessages()
    if (response.success) {
      mensajes.value = response.data || []
      scrollToBottom()
    }
  } catch (error) {
    console.error('Error fetching direct messages:', error)
  } finally {
    loading.value = false
  }
}

const handleNewMessage = () => {
  fetchMessages()
}

const handleEnterKey = () => {
  if (messageText.value.trim() && !sendLoading.value) {
    handleSendMessage()
  }
}

const handleSendMessage = async () => {
  if (!messageText.value.trim()) return
  
  sendLoading.value = true
  try {
    const response = await sendDirectMessage({
      numeroRemitente: mensajes.value[0]?.numeroRemitente || '',
      contenido: messageText.value.trim()
    })
    
    if (response.success) {
      messageText.value = ''
      await fetchMessages()
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

const autoResize = (event) => {
  const el = event.target
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>