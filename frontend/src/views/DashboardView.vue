<template>
  <div class="animate-fadeIn">
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p class="text-gray-600 mt-1">Estadísticas y métricas del sistema</p>
    </div>

    <!-- Métricas Principales -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <BaseCard>
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-primary/10 rounded-lg p-3">
            <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Tickets Hoy</p>
            <p class="text-2xl font-semibold text-gray-900">24</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-green-100 rounded-lg p-3">
            <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Resueltos Hoy</p>
            <p class="text-2xl font-semibold text-gray-900">18</p>
          </div>
        </div>
      </BaseCard>

      <BaseCard>
        <div class="flex items-center">
          <div class="flex-shrink-0 bg-yellow-100 rounded-lg p-3">
            <svg class="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-gray-500">Tickets Abiertos</p>
            <p class="text-2xl font-semibold text-gray-900">42</p>
          </div>
        </div>
      </BaseCard>
    </div>

    <!-- Gráficos (Placeholder) -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BaseCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900">Tickets por Técnico</h3>
        </template>
        <div class="h-64 flex items-center justify-center text-gray-400">
          <p>Gráfico de barras (Chart.js)</p>
        </div>
      </BaseCard>

      <BaseCard>
        <template #header>
          <h3 class="text-lg font-semibold text-gray-900">Mensajes por Día</h3>
        </template>
        <div class="h-64 flex items-center justify-center text-gray-400">
          <p>Gráfico de líneas (Chart.js)</p>
        </div>
      </BaseCard>
    </div>
  </div>
</template>

<script setup>
import BaseCard from '@/components/base/BaseCard.vue'
</script>
