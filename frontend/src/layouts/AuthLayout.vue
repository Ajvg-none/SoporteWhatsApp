<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-blue-50/30 flex items-center justify-center p-4 relative overflow-hidden">
    <!-- Optical Lens Glow elements -->
    <div class="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-sky-200/20 blur-3xl pointer-events-none"></div>
    <div class="absolute -bottom-45 -right-45 w-[500px] h-[500px] rounded-full bg-cyan-200/25 blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md animate-fadeIn relative z-10">
      <!-- Logo y Título -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-sky-100 shadow-md shadow-sky-100/50 mb-4 text-primary">
          <!-- Premium Glasses/Lens SVG Icon -->
          <svg class="w-9 h-9" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-slate-900 tracking-tight">Soporte<span class="text-primary font-bold">WhatsApp</span></h1>
        <p class="text-slate-505 text-sm mt-1.5 font-medium">Gestión de Tickets • Sector Óptico</p>
      </div>

      <!-- Contenedor Blanco para el Formulario -->
      <div class="bg-white/95 backdrop-blur-md rounded-3xl border border-slate-100/80 shadow-2xl shadow-sky-900/10 p-8 md:p-10">
        <router-view />
      </div>

      <div class="text-center mt-8 text-slate-400 text-xs font-semibold">
        &copy; 2026 SoporteWhatsApp. Claridad visual y soporte técnico premium.
      </div>
    </div>
  </div>
</template>