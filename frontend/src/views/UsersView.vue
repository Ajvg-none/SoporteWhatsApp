<template>
  <div class="animate-fadeIn">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Gestión de Usuarios</h1>
        <p class="text-gray-600 dark:text-slate-400 mt-1">Administra los técnicos del sistema</p>
      </div>
      <BaseButton variant="primary">
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Nuevo Técnico
      </BaseButton>
    </div>

    <BaseCard>
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
          <thead class="bg-gray-50 dark:bg-slate-800">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Nombre</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Rol</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-700">
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{{ user.nombre }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">{{ user.email }}</td>
              <td class="px-6 py-4 whitespace-nowrap">
                <BaseBadge :variant="user.rol === 'supervisor' ? 'purple' : 'blue'">
                  {{ user.rol }}
                </BaseBadge>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button class="text-primary hover:text-primary-dark dark:text-primary dark:hover:text-primary/80 mr-3">Editar</button>
                <button class="text-danger hover:text-red-600 dark:text-danger dark:hover:text-red-500">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </BaseCard>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'

// TODO: En Sprint 1, conectar con la API real
const users = ref([
  { id: 1, nombre: 'Juan Pérez', email: 'juan@empresa.com', rol: 'tecnico' },
  { id: 2, nombre: 'María López', email: 'maria@empresa.com', rol: 'tecnico' },
  { id: 3, nombre: 'Carlos Ruiz', email: 'carlos@empresa.com', rol: 'supervisor' }
])
</script>
