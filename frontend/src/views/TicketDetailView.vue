<template>
  <div class="p-8">
    <h1 class="text-3xl font-bold text-gray-800 mb-4">Detalle Ticket #{{ $route.params.id }}</h1>
    <p class="text-gray-600">Historial de mensajes, auditoría y controles de acción.</p>
    <router-link to="/" class="mt-4 inline-block text-blue-600 hover:underline">
      Volver a la lista
    </router-link>
  </div>
</template>