<template>
  <div class="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
    <div class="w-full max-w-md animate-fadeIn">
      <!-- Logo y Título -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2 tracking-tight">SoporteWhatsApp</h1>
        <p class="text-blue-100 text-sm">Sistema de Gestión de Tickets</p>
      </div>

      <!-- Contenedor Blanco para el Formulario -->
      <div class="bg-white rounded-2xl shadow-2xl p-8">
        <router-view />
      </div>

      <div class="text-center mt-6 text-blue-100 text-xs opacity-80">
        &copy; 2026 SoporteWhatsApp. Todos los derechos reservados.
      </div>
    </div>
  </div>
</template>