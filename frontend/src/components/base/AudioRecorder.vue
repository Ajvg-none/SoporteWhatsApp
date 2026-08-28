<template>
  <div class="inline-flex items-center gap-2">
    <button
      type="button"
      @mousedown="startRecording"
      @mouseup="stopRecording"
      @mouseleave="stopRecording"
      @touchstart="startRecording"
      @touchend="stopRecording"
      @touchcancel="stopRecording"
      class="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200"
      :class="{
        'bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/30': !isRecording,
        'bg-danger text-white animate-pulse shadow-lg shadow-danger/40': isRecording
      }"
      :disabled="!isSupported"
      :title="!isSupported ? 'Micrófono no soportado' : (isRecording ? 'Soltar para enviar' : 'Mantener presionado para grabar')"
    >
      <svg v-if="!isRecording" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
      <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <rect x="6" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2" />
        <rect x="14" y="4" width="4" height="16" rx="1" stroke="currentColor" stroke-width="2" />
      </svg>
    </button>

    <span v-if="isRecording" class="text-xs font-mono font-bold text-danger tabular-nums">
      {{ formattedTime }}
    </span>

    <div v-if="isRecording" class="flex items-center gap-0.5 h-6">
      <span v-for="i in 5" :key="i" class="w-1 bg-primary rounded-full animate-wave" :style="{ animationDelay: `${i * 0.1}s` }"></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useToastStore } from '@/stores/toast'

const emit = defineEmits(['audio-recorded'])
const toast = useToastStore()

const isRecording = ref(false)
const mediaRecorder = ref(null)
const audioChunks = ref([])
const startTime = ref(0)
const elapsed = ref(0)
let timerInterval = null

const isSupported = ref(!!navigator.mediaDevices?.getUserMedia)

const formattedTime = computed(() => {
  const totalSec = Math.floor(elapsed.value / 1000)
  const mins = String(Math.floor(totalSec / 60)).padStart(2, '0')
  const secs = String(totalSec % 60).padStart(2, '0')
  return `${mins}:${secs}`
})

const startRecording = async () => {
  if (!isSupported.value || isRecording.value) return

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder.value = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    })

    audioChunks.value = []
    mediaRecorder.value.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.value.push(event.data)
    }

    mediaRecorder.value.onstop = () => {
      stream.getTracks().forEach(track => track.stop())
      const blob = new Blob(audioChunks.value, { type: 'audio/webm' })
      if (blob.size > 0) {
        emit('audio-recorded', blob)
      }
      audioChunks.value = []
      elapsed.value = 0
      clearInterval(timerInterval)
      timerInterval = null
    }

    mediaRecorder.value.start()
    isRecording.value = true
    startTime.value = Date.now()
    elapsed.value = 0

    timerInterval = setInterval(() => {
      elapsed.value = Date.now() - startTime.value
    }, 100)

  } catch (error) {
    console.error('Error al acceder al micrófono:', error)
    toast.error('No se pudo acceder al micrófono. Verifica los permisos.')
  }
}

const stopRecording = () => {
  if (!isRecording.value) return
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    mediaRecorder.value.stop()
  }
  isRecording.value = false
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
  if (mediaRecorder.value && mediaRecorder.value.state === 'recording') {
    mediaRecorder.value.stop()
  }
})
</script>

<style scoped>
@keyframes wave {
  0%, 100% { height: 4px; }
  50% { height: 16px; }
}
.animate-wave {
  animation: wave 0.8s ease-in-out infinite;
}
</style>
