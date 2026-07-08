<template>
  <div class="animate-fadeIn">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-3xl font-bold text-gray-900">Gestión de Tickets</h1>
      <p class="text-gray-600 mt-1">Administra todos los tickets de soporte</p>
    </div>

    <!-- Filtros y Búsqueda -->
    <BaseCard class="mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex-1">
          <BaseInput
            v-model="searchQuery"
            placeholder="Buscar por número, nombre o sucursal..."
            type="search"
          />
        </div>
        <BaseButton variant="primary">
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Buscar
        </BaseButton>
      </div>

      <!-- Tabs de Estado -->
      <div class="mt-4 border-b border-gray-200">
        <nav class="-mb-px flex space-x-8">
          <button
            v-for="tab in tabs"
            :key="tab.value"
            @click="selectedStatus = tab.value"
            class="py-2 px-1 border-b-2 font-medium text-sm transition-colors"
            :class="selectedStatus === tab.value
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
    </BaseCard>

    <!-- Tabla de Tickets -->
    <BaseCard>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Técnico</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transferido</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Creado</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="ticket in tickets" :key="ticket.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{{ ticket.id }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ ticket.cliente }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ ticket.sucursal }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <BaseBadge :variant="getStatusVariant(ticket.estado)">
                  {{ ticket.estado }}
                </BaseBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ ticket.tecnico }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <BaseBadge v-if="ticket.transferido" variant="purple">✔ Sí</BaseBadge>
                <span v-else class="text-gray-400">-</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{{ ticket.fecha }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <router-link 
                  :to="`/tickets/${ticket.id}`"
                  class="text-primary hover:text-primary-dark font-medium"
                >
                  Ver Detalle
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mensaje si no hay tickets -->
      <div v-if="tickets.length === 0" class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="mt-2 text-gray-500">No se encontraron tickets</p>
      </div>
    </BaseCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseInput from '@/components/base/BaseInput.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'

const searchQuery = ref('')
const selectedStatus = ref('todos')

const tabs = [
  { label: 'Todos', value: 'todos' },
  { label: 'Nuevos', value: 'nuevo' },
  { label: 'Asignados', value: 'asignado' },
  { label: 'Esperando', value: 'esperando' },
  { label: 'Resueltos', value: 'resuelto' },
  { label: 'Cerrados', value: 'cerrado' }
]

// TODO: En Sprint 1, conectar con la API real
const tickets = ref([
  { id: 101, cliente: '+52 555 123 4567', sucursal: 'Sucursal Norte', estado: 'Nuevo', tecnico: 'Sin asignar', transferido: false, fecha: '2024-01-15' },
  { id: 102, cliente: '+52 555 987 6543', sucursal: 'Sucursal Sur', estado: 'Asignado', tecnico: 'Juan Pérez', transferido: true, fecha: '2024-01-14' },
  { id: 103, cliente: '+52 555 456 7890', sucursal: 'Sucursal Centro', estado: 'Esperando', tecnico: 'María López', transferido: false, fecha: '2024-01-13' }
])

const getStatusVariant = (estado) => {
  const variants = {
    'Nuevo': 'blue',
    'Asignado': 'green',
    'Esperando': 'yellow',
    'Resuelto': 'green',
    'Cerrado': 'gray'
  }
  return variants[estado] || 'gray'
}
</script>
