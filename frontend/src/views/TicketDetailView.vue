<template>
  <div class="animate-fadeIn">
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Ticket #{{ $route.params.id }}</h1>
        <p class="text-gray-600 mt-1">Detalle del ticket y historial de conversación</p>
      </div>
      <router-link to="/" class="text-primary hover:text-primary-dark">
        ← Volver a la lista
      </router-link>
    </div>

    <!-- Info del Ticket -->
    <BaseCard class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="text-sm font-medium text-gray-500 mb-2">Información del Cliente</h3>
          <p class="text-lg font-semibold text-gray-900">+52 555 123 4567</p>
          <p class="text-gray-600">Cliente Ejemplo</p>
          <p class="text-gray-600">Sucursal Norte</p>
        </div>
        <div>
          <h3 class="text-sm font-medium text-gray-500 mb-2">Estado del Ticket</h3>
          <div class="flex items-center gap-2">
            <BaseBadge variant="blue">Nuevo</BaseBadge>
            <span class="text-gray-600">•</span>
            <span class="text-gray-600">Sin asignar</span>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Historial de Mensajes -->
    <BaseCard class="mb-6">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900">Historial de Mensajes</h3>
      </template>

      <div class="space-y-4">
        <!-- Mensaje del Cliente -->
        <div class="flex items-start gap-3">
          <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-semibold">
            C
          </div>
          <div class="flex-1 bg-gray-100 rounded-lg p-4">
            <p class="text-sm font-medium text-gray-900 mb-1">Cliente</p>
            <p class="text-gray-700">Hola, tengo un problema con mi sistema</p>
            <p class="text-xs text-gray-500 mt-2">Hace 2 horas</p>
          </div>
        </div>

        <!-- Mensaje del Técnico -->
        <div class="flex items-start gap-3 flex-row-reverse">
          <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-semibold text-white">
            T
          </div>
          <div class="flex-1 bg-primary/10 rounded-lg p-4">
            <p class="text-sm font-medium text-gray-900 mb-1">Técnico</p>
            <p class="text-gray-700">Claro, ¿podrías darme más detalles?</p>
            <p class="text-xs text-gray-500 mt-2">Hace 1 hora</p>
          </div>
        </div>
      </div>
    </BaseCard>

    <!-- Zona de Envío -->
    <BaseCard>
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900">Enviar Mensaje</h3>
      </template>

      <div class="space-y-4">
        <textarea
          v-model="newMessage"
          rows="4"
          class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Escribe tu mensaje aquí..."
        ></textarea>

        <div class="flex items-center justify-between">
          <button class="flex items-center text-gray-600 hover:text-primary">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Adjuntar archivo
          </button>

          <BaseButton 
            variant="primary"
            :disabled="!newMessage.trim()"
          >
            Enviar Mensaje
          </BaseButton>
        </div>
      </div>
    </BaseCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'

const newMessage = ref('')
</script>
