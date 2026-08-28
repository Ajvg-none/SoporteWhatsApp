<template>
  <div class="min-h-screen bg-gradient-to-br from-surface dark:from-surface via-primary-light/40 to-primary-light/30 dark:via-primary-deep/20 dark:to-primary-deep/40 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Optical Lens Glow elements -->
    <div class="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/20 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-45 -right-45 w-[500px] h-[500px] rounded-full bg-primary/15 blur-3xl pointer-events-none"></div>
    
    <div class="w-full max-w-md animate-fadeIn relative z-10">
      <!-- Logo y Título -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-card border border-edge shadow-md shadow-primary-light/50 mb-4 text-primary">
          <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-body tracking-tight">Soporte<span class="text-primary font-bold">WhatsApp</span></h1>
        <p class="text-secondary text-sm mt-1.5 font-medium">Gestión de Tickets • Sector Óptico</p>
      </div>
      
      <!-- Contenedor para el Formulario -->
      <div class="bg-surface-card/95 dark:bg-surface-card backdrop-blur-md rounded-3xl border border-edge shadow-2xl shadow-primary-dark/10 p-8 md:p-10">
        <router-view />
      </div>
      
      <div class="text-center mt-8 text-muted text-xs font-semibold">
        &copy; 2026 SoporteWhatsApp. Claridad visual y soporte técnico premium.
      </div>
    </div>
  </div>
</template>