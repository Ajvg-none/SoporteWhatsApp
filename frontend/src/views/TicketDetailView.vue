<template>
  <div class="animate-fadeIn space-y-6">
    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 shrink-0">
      <div>
        <div class="flex items-center gap-3">
  <h1 class="text-xl font-black text-slate-800 dark:text-white">Ticket #{{ $route.params.id }}</h1>
  
  <!-- Badge de estado (siempre visible) -->
  <BaseBadge v-if="ticket" :variant="getStatusVariant(ticket.estado)">
    <span class="capitalize">{{ ticket.estado }}</span>
  </BaseBadge>
  
  <!-- Dropdown de cambio de estado (solo si se puede cambiar) -->
  <div v-if="canChangeStatus" class="relative">
    <BaseDropdown
      v-model="selectedStatus"
      :options="availableStatusOptions"
      placeholder="Cambiar estado..."
      :disabled="statusLoading"
      @update:modelValue="handleChangeStatus"
      class="w-48"
    />
    <svg 
      v-if="statusLoading" 
      class="animate-spin absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 text-primary pointer-events-none" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
  </div>
</div>
        <p class="text-slate-450 dark:text-slate-400 text-xs mt-1 font-semibold">Detalle del ticket y historial de conversación</p>
      </div>
      <button
        @click="$router.back()"
        class="inline-flex items-center px-3.5 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-105 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-700/50 rounded-xl transition-all duration-200 cursor-pointer">
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver a la lista
      </button>
    </div>

    <div v-if="loading" class="flex flex-col items-center justify-center py-24">
      <svg class="animate-spin h-10 w-10 text-primary mb-3" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span class="text-sm font-semibold text-slate-400 dark:text-slate-300">Cargando detalles del ticket...</span>
    </div>

    <div v-else-if="errorMsg" class="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-red-100/80 dark:border-red-900/30 shadow-md">
      <div class="inline-flex p-3 rounded-full bg-red-55 text-danger mb-2">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <p class="text-red-700 dark:text-red-400 font-bold mb-1">Error al cargar el ticket</p>
      <p class="text-red-500 dark:text-red-300 text-xs mb-4 font-semibold">{{ errorMsg }}</p>
      <BaseButton variant="outline" @click="fetchTicketDetails">Reintentar</BaseButton>
    </div>

    <div v-else-if="ticket" class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch h-[calc(100vh-12rem)] min-h-0">
      
      <div class="space-y-6 lg:col-span-1 flex flex-col h-full overflow-hidden min-h-0">
        
        <BaseCard class="border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
          <template #header>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">Información del Cliente</h3>
          </template>
          
          <div class="space-y-4">
            <div>
              <label class="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Nombre</label>
              <p class="text-sm font-bold text-slate-800 dark:text-white mt-0.5">{{ contacto?.nombre || 'Cliente sin registrar' }}</p>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Teléfono / WhatsApp</label>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5">{{ formatPhone(contacto?.numero_telefono || ticket.numeroCliente) }}</p>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Sucursal</label>
              <p class="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">{{ contacto?.sucursal || 'Sin sucursal asignada' }}</p>
            </div>
            <div>
              <label class="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Creado el</label>
              <p class="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{{ formatDate(ticket.creadoEn) }}</p>
            </div>
          </div>
        </BaseCard>

        <BaseCard class="border border-slate-100 dark:border-slate-800 shadow-sm shrink-0">
          <template #header>
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400">Responsable y Estado</h3>
          </template>
          
          <div class="space-y-4">
            <div>
          <label class="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Técnico Asignado</label>
          <div class="flex items-center gap-2 mt-1.5">
            <span class="w-2 h-2 rounded-full animate-pulse" :class="ticket.tecnicoAsignadoId ? 'bg-sky-500' : 'bg-slate-300 dark:bg-slate-700'"></span>
            <span class="text-xs font-bold text-slate-700 dark:text-white">
              {{ tecnicoAsignado?.nombre || 'Sin asignar' }}
            </span>
          </div>
          <!-- Badge: Transferencia pendiente (si existe solicitud) -->
          <div v-if="ticket.solicitudTransferenciaTecnicoId" class="mt-2 flex items-center gap-2">
            <BaseBadge variant="yellow">
              <span class="flex items-center gap-1">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Transf. Pendiente
              </span>
            </BaseBadge>
          </div>
        </div>
        <div v-if="ticket.estado === 'nuevo'">
              <BaseButton
                variant="primary"
                class="w-full flex items-center justify-center shadow-md shadow-primary/20"
                :loading="actionLoading"
                @click="handleTakeCase"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Tomar Caso
              </BaseButton>
            </div>

            <div v-else-if="!isReadOnly && ticket.estado !== 'cerrado'" class="mt-3">
              <BaseTooltip :text="!canRequestTransfer ? transferDisabledTooltip : ''" position="top">
                <BaseButton
                  variant="secondary"
                  class="w-full flex items-center justify-center border-slate-200/80 dark:border-slate-700/60 cursor-pointer text-xs font-bold shadow-xs"
                  :disabled="!canRequestTransfer"
                  @click="handleTransferCase"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                  Transferir Ticket
                </BaseButton>
              </BaseTooltip>
            </div>

            <!-- Botón Reasignar (solo supervisores) - S2-A05 -->
            <div v-if="canForceAssign" class="mt-3">
              <BaseButton
                variant="outline"
                class="w-full flex items-center justify-center text-xs font-bold shadow-xs"
                @click="handleForceAssignCase"
              >
                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Reasignar (Supervisor)
              </BaseButton>
            </div>

<!-- Botón Cerrar Ticket (solo propietario + estados permitidos) -->
<div v-if="canCloseTicket" class="mt-3">
  <BaseButton
    variant="danger"
    class="w-full flex items-center justify-center text-xs font-bold shadow-xs"
    :loading="closeLoading"
    @click="openCloseConfirm"
  >
    <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
    Cerrar Ticket
  </BaseButton>
</div>

<div v-if="ticket.transferido" class="pt-2 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
  <BaseBadge variant="purple">✔ Transferido</BaseBadge>
  <span>Caso transferido anteriormente</span>
</div>
          </div>
        </BaseCard>

        <div class="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div class="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/30 shrink-0">
            <h3 class="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-white">Bitácora de Auditoría</h3>
          </div>
          
          <div v-if="auditoria.length === 0" class="text-center py-6 text-xs text-slate-400 dark:text-slate-400 font-semibold italic shrink-0">
            Sin registros de auditoría aún.
          </div>
          
          <div v-else class="p-5 flex-1 overflow-y-auto scroll-smooth min-h-0">
            <div class="flow-root">
              <ul role="list" class="-mb-5">
                <li v-for="(item, idx) in auditoria" :key="item.id">
                  <div class="relative pb-5">
                    <span v-if="idx !== auditoria.length - 1" class="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100 dark:bg-slate-800" aria-hidden="true"></span>
                    <div class="relative flex space-x-3.5">
                      <div>
                        <span class="h-8 w-8 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100/50 dark:border-sky-900/30 flex items-center justify-center ring-4 ring-white dark:ring-slate-900 text-xs">
                          🔧
                        </span>
                      </div>
                      <div class="flex-1 min-w-0 pt-1 flex justify-between space-x-4">
                        <div>
                          <p class="text-xs font-semibold text-slate-500 dark:text-slate-300">
                            Acción: <b class="text-slate-800 dark:text-white capitalize font-bold">{{ formatAuditAction(item.accion) }}</b> por <span class="font-bold text-slate-700 dark:text-white">{{ item.usuarioNombre }}</span>
                          </p>
                          <p class="text-[10px] font-medium text-slate-400 dark:text-slate-400 mt-1">
                            {{ formatAuditDetails(item) }}
                          </p>
                        </div>
                        <div class="text-right text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 whitespace-nowrap">
                          {{ formatDate(item.fechaHora) }}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="flex flex-col gap-6 lg:col-span-2 h-full min-h-0 overflow-hidden">
        <div v-if="isReadOnly" class="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl flex items-start gap-3.5 text-amber-900 dark:text-amber-300 text-sm shrink-0">
<svg class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
<div>
  <p class="font-bold text-xs tracking-wide uppercase text-amber-850 dark:text-amber-400">Modo Solo Lectura</p>
  <p class="text-xs text-amber-705 dark:text-amber-450 mt-1 font-semibold leading-relaxed">
    Este ticket está siendo atendido por <b>{{ tecnicoAsignado?.nombre || 'otro técnico' }}</b>. Solo el técnico asignado puede enviar mensajes o realizar modificaciones.
  </p>
</div>
</div>

<!-- Banner: Solicitud de transferencia pendiente (solo si eres el destino) -->
<div v-if="isTransferDestination" class="p-4 bg-purple-50/70 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 rounded-2xl shrink-0">
<div class="flex items-start gap-3.5">
  <div class="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
    <svg class="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  </div>
  <div class="flex-1 min-w-0">
    <p class="font-bold text-xs tracking-wide uppercase text-purple-800 dark:text-purple-400">
      Solicitud de Transferencia
    </p>
    <p class="text-xs text-purple-700 dark:text-purple-300 mt-1 font-semibold leading-relaxed">
      <b>{{ transferRequestFromName }}</b> quiere transferirte este ticket. ¿Aceptas?
    </p>
    <div class="flex gap-2 mt-3">
      <BaseButton
        variant="primary"
        class="!py-2 !px-4 text-xs font-bold"
        :loading="acceptLoading"
        @click="handleAcceptTransfer"
      >
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Aceptar
      </BaseButton>
      <BaseButton
        variant="danger"
        class="!py-2 !px-4 text-xs font-bold"
        :loading="rejectLoading"
        @click="openRejectConfirm"
      >
        <svg class="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
        Rechazar
      </BaseButton>
    </div>
  </div>
</div>
</div>

<div class="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col flex-1 min-h-0 overflow-hidden">
          <div class="px-6 py-4.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/30 flex items-center justify-between shrink-0">
            <h3 class="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">Historial de Conversación</h3>
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-100/60 dark:border-emerald-900/30 rounded-lg text-[10px] font-extrabold uppercase tracking-wider">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              WhatsApp Activo
            </span>
          </div>

          <div ref="chatContainer" class="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 dark:bg-slate-950/10 scroll-smooth min-h-0">
            <div
              v-for="msg in mensajes"
              :key="msg.id"
              class="flex"
              :class="msg.remitente === 'tecnico' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[75%] rounded-2xl px-4 py-3 shadow-xs text-sm"
                :class="msg.remitente === 'tecnico' 
                  ? 'bg-gradient-to-tr from-primary to-primary-hover text-white rounded-tr-none' 
                  : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 text-slate-800 dark:text-white rounded-tl-none'"
              >
                <div class="text-[9px] font-extrabold tracking-wider uppercase mb-1.5 opacity-75 flex items-center gap-1">
                  <span>{{ msg.remitente === 'tecnico' ? (msg.tecnicoNombre || 'Técnico') : (contacto?.nombre || 'Cliente') }}</span>
                </div>

                <p v-if="msg.contenido && (!msg.urlAdjunto || !msg.contenido.startsWith('[Archivo: '))" class="whitespace-pre-wrap break-words leading-relaxed font-medium text-xs md:text-sm">{{ msg.contenido }}</p>

                <div v-if="msg.urlAdjunto" class="mt-2.5 pt-2 border-t" :class="msg.remitente === 'tecnico' ? 'border-white/15' : 'border-slate-100 dark:border-slate-700/70'">
                  
                  <!-- Imagen -->
                  <div v-if="msg.tipo === 'imagen'" class="overflow-hidden rounded-xl border border-black/5 dark:border-white/5 mt-1 max-w-[280px]">
                    <img
                      :src="getAttachmentUrl(msg.urlAdjunto)"
                      class="w-full max-h-60 object-cover cursor-pointer transition-all duration-300 hover:scale-102 hover:brightness-95"
                      alt="Imagen adjunta"
                      @click="openLightbox(getAttachmentUrl(msg.urlAdjunto))"
                    />
                  </div>

                  <!-- Audio (Nota de Voz) -->
                  <div v-else-if="msg.tipo === 'audio'" class="w-72 sm:w-80 max-w-full mt-1.5">
                    <div 
                      class="flex items-center gap-3.5 p-3 rounded-2xl border transition-all duration-200"
                      :class="msg.remitente === 'tecnico'
                        ? 'bg-white/10 border-white/20 text-white'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-white'"
                    >
                      <!-- Elemento de audio HTML5 invisible -->
                      <audio 
                        :ref="el => { if (el) msg._audioEl = el }"
                        :src="getAttachmentUrl(msg.urlAdjunto)"
                        @play="msg._isPlaying = true"
                        @pause="msg._isPlaying = false"
                        @timeupdate="msg._currentTime = msg._audioEl ? msg._audioEl.currentTime : 0; msg._duration = msg._audioEl ? msg._audioEl.duration : 0"
                        @loadedmetadata="msg._duration = msg._audioEl ? msg._audioEl.duration : 0"
                        class="hidden"
                      ></audio>

                      <!-- Botón de Reproducción/Pausa -->
                      <button 
                        type="button"
                        @click="msg._isPlaying ? msg._audioEl?.pause() : msg._audioEl?.play()"
                        class="flex items-center justify-center w-9 h-9 rounded-full shrink-0 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm"
                        :class="msg.remitente === 'tecnico' ? 'bg-white text-primary' : 'bg-primary text-white'"
                      >
                        <!-- Icono Play -->
                        <svg v-if="!msg._isPlaying" class="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                        <!-- Icono Pause -->
                        <svg v-else class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                        </svg>
                      </button>

                      <!-- Seekbar y Tiempos -->
                      <div class="flex-1 min-w-0 flex flex-col gap-1">
                        <input 
                          type="range"
                          min="0"
                          :max="msg._duration || 100"
                          :value="msg._currentTime || 0"
                          @input="e => { if (msg._audioEl) msg._audioEl.currentTime = parseFloat(e.target.value) }"
                          class="w-full h-1 rounded-lg appearance-none cursor-pointer accent-current opacity-85 hover:opacity-100 transition-opacity outline-none"
                          :class="msg.remitente === 'tecnico' ? 'bg-white/30 text-white' : 'bg-slate-200 dark:bg-slate-700 text-primary'"
                        />
                        <div class="flex justify-between items-center text-[9px] font-bold font-mono tracking-wider">
                          <span :class="msg.remitente === 'tecnico' ? 'text-white/70' : 'text-slate-400 dark:text-slate-400'">
                            {{ formatAudioTime(msg._currentTime || 0) }}
                          </span>
                          <span :class="msg.remitente === 'tecnico' ? 'text-white/70' : 'text-slate-400 dark:text-slate-400'">
                            {{ formatAudioTime(msg._duration || 0) }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Video -->
                  <div v-else-if="msg.tipo === 'video'" class="overflow-hidden rounded-xl border border-black/5 dark:border-white/5 mt-1 max-w-[280px]">
                    <video controls class="w-full max-h-60 object-cover transition-all duration-300 hover:brightness-95">
                      <source :src="getAttachmentUrl(msg.urlAdjunto)" />
                      Tu navegador no soporta la reproducción de video.
                    </video>
                  </div>

                  <!-- Documento -->
                  <div v-else class="mt-1">
                    <a
                      :href="getAttachmentUrl(msg.urlAdjunto)"
                      target="_blank"
                      download
                      class="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 border w-full max-w-[280px] shadow-xs hover:shadow-sm"
                      :class="msg.remitente === 'tecnico' 
                        ? 'bg-white/10 border-white/20 text-white hover:bg-white/15' 
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200/70 dark:border-slate-700/70 text-slate-700 dark:text-white hover:bg-slate-100/80 dark:hover:bg-slate-700/80'"
                    >
                      <!-- Icono de documento -->
                      <div 
                        class="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                        :class="msg.remitente === 'tecnico' ? 'bg-white/15' : 'bg-primary/10 text-primary'"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      
                      <!-- Detalles del archivo -->
                      <div class="flex-1 min-w-0 text-left">
                        <p 
                          class="text-xs font-bold truncate"
                          :class="msg.remitente === 'tecnico' ? 'text-white' : 'text-slate-800 dark:text-white'"
                        >
                          {{ msg.contenido && msg.contenido.startsWith('[Archivo: ') && msg.contenido.endsWith(']') ? msg.contenido.slice(10, -1) : msg.urlAdjunto.split('/').pop().replace(/^\d+-/, '') }}
                        </p>
                        <p 
                          class="text-[10px] font-semibold mt-0.5"
                          :class="msg.remitente === 'tecnico' ? 'text-white/60' : 'text-slate-400 dark:text-slate-400'"
                        >
                          Haga clic para descargar
                        </p>
                      </div>

                      <!-- Botón de descarga -->
                      <div 
                        class="flex items-center justify-center w-7 h-7 rounded-full shrink-0 transition-colors"
                        :class="msg.remitente === 'tecnico' ? 'text-white hover:bg-white/10' : 'text-slate-400 dark:text-slate-400 hover:text-primary dark:hover:text-primary hover:bg-slate-200/55 dark:hover:bg-slate-700/60'"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      </div>
                    </a>
                  </div>
                </div>

                <div class="text-[9px] text-right mt-1.5 font-bold uppercase tracking-wider" :class="msg.remitente === 'tecnico' ? 'text-white/60' : 'text-slate-400 dark:text-slate-400'">
                  {{ formatTime(msg.enviadoEn) }}
                </div>
              </div>
            </div>
          </div>

          <div class="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
            <div v-if="selectedFile" class="mb-3.5 p-2 bg-slate-50 dark:bg-slate-800/40 border border-slate-150 dark:border-slate-700/60 rounded-xl flex items-center justify-between">
              <div class="flex items-center gap-2 overflow-hidden mr-2">
                <svg class="w-4.5 h-4.5 text-slate-405 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                <span class="text-xs text-slate-700 dark:text-white truncate font-semibold">{{ selectedFile.name }}</span>
                <span class="text-[10px] text-slate-400 dark:text-slate-400 font-mono">({{ formatBytes(selectedFile.size) }})</span>
              </div>
              <button @click="clearSelectedFile" class="text-slate-400 hover:text-danger p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full cursor-pointer">
                <svg class="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form @submit.prevent="handleSendMessage().then(() => { setTimeout(() => fetchTicketDetails(), 300); resetInputHeight(); })" class="flex items-end gap-2">
              <input
                type="file"
                ref="fileInput"
                class="hidden"
                accept="image/*,video/*,audio/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                @change="handleFileChange"
                :disabled="isReadOnly"
              />
              <button
                type="button"
                @click="triggerFileSelect"
                class="inline-flex items-center justify-center p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-slate-400 hover:text-primary dark:hover:text-primary hover:border-primary/30 dark:hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mb-[1px]"
                :disabled="isReadOnly"
                title="Adjuntar archivo"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              
              <textarea
                v-model="messageText"
                @input="autoResizeInput"
                @keydown.enter.prevent="if (!isReadOnly && (messageText.trim() || selectedFile) && !sendLoading) { handleSendMessage().then(() => { setTimeout(() => fetchTicketDetails(), 300); resetInputHeight(); }) }"
                placeholder="Escribe tu mensaje aquí..."
                rows="1"
                style="resize: none; max-height: 120px;"
                class="flex-1 px-4.5 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-250/70 dark:border-slate-700/60 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50 min-h-[40px] align-bottom"
                :disabled="isReadOnly || sendLoading"
              ></textarea>

              <BaseButton
                type="submit"
                variant="primary"
                class="!px-6 shrink-0 shadow-md shadow-primary/20 h-[42px]"
                :loading="sendLoading"
                :disabled="isReadOnly || (!messageText.trim() && !selectedFile)"
              >
                Enviar
              </BaseButton>
            </form>
          </div>
        </div>
      </div>
    </div>

      <div v-if="lightboxUrl" class="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" @click="lightboxUrl = null">
    <img :src="lightboxUrl" class="max-w-full max-h-full rounded-lg shadow-2xl animate-scaleIn" alt="Imagen ampliada" />
    <button class="absolute top-4 right-4 text-white hover:text-gray-300">
      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
    </button>
  </div>

 <!-- Diálogo de confirmación para cerrar ticket -->
<ConfirmDialog
v-model="showCloseConfirm"
title="¿Cerrar este ticket?"
message="Al cerrar el ticket, no se podrán enviar más mensajes ni realizar modificaciones. Esta acción quedará registrada en la auditoría."
confirm-text="Sí, cerrar ticket"
cancel-text="Cancelar"
variant="danger"
@confirm="handleConfirmClose"
/>

<!-- Modal de Transferencia / Reasignación Forzada (S2-A05) -->
<BaseModal
  v-model="showTransferModal"
  :title="modalMode === 'forceAssign' ? 'Reasignar Ticket (Supervisor)' : 'Solicitar Transferencia'"
  size="md"
>
  <div class="space-y-4">
    <p class="text-sm text-slate-600 dark:text-slate-400">
      <template v-if="modalMode === 'forceAssign'">
        Como supervisor, puedes reasignar este ticket directamente a otro técnico
        <b>sin necesidad de su aprobación</b>. La acción quedará registrada en la auditoría.
      </template>
      <template v-else>
        Selecciona el técnico al que deseas transferir este ticket. El técnico destino
        recibirá una notificación y podrá aceptar o rechazar la solicitud.
      </template>
    </p>
    <!-- Buscador -->
    <div class="relative">
      <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        v-model="technicianSearch"
        type="text"
        placeholder="Buscar técnico por nombre o email..."
        class="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/65 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all duration-200 placeholder-slate-400 dark:placeholder-slate-500"
      />
    </div>
    <!-- Lista de técnicos -->
    <div class="max-h-64 overflow-y-auto border border-slate-200/60 dark:border-slate-700/60 rounded-xl">
      <div v-if="filteredTechnicians.length === 0" class="p-6 text-center text-sm text-slate-400 dark:text-slate-500">
        No se encontraron técnicos disponibles.
      </div>
      <button
        v-for="tech in filteredTechnicians"
        :key="tech.id"
        type="button"
        @click="selectedTechnicianId = tech.id"
        class="w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-150 flex items-center justify-between border-b border-slate-100 dark:border-slate-800 last:border-b-0 cursor-pointer"
        :class="{
          'bg-primary/5 dark:bg-primary/10': selectedTechnicianId === tech.id
        }"
      >
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-primary-hover text-white flex items-center justify-center font-bold text-sm shrink-0">
            {{ tech.nombre.charAt(0).toUpperCase() }}
          </div>
          <div class="min-w-0">
            <p class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ tech.nombre }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400 truncate">{{ tech.email }}</p>
          </div>
        </div>
        <svg
          v-if="selectedTechnicianId === tech.id"
          class="w-5 h-5 text-primary shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </button>
    </div>
  </div>
  <template #footer>
    <div class="flex gap-3 justify-end">
      <BaseButton
        variant="secondary"
        @click="showTransferModal = false"
        :disabled="transferLoading || forceAssignLoading"
      >
        Cancelar
      </BaseButton>
      <BaseButton
        :variant="modalMode === 'forceAssign' ? 'danger' : 'primary'"
        :disabled="!selectedTechnicianId"
        :loading="modalMode === 'forceAssign' ? forceAssignLoading : transferLoading"
        @click="modalMode === 'forceAssign' ? handleConfirmForceAssign() : handleConfirmTransfer()"
      >
        <svg v-if="modalMode === 'forceAssign' && !forceAssignLoading" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <svg v-else-if="modalMode !== 'forceAssign' && !transferLoading" class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
        {{ modalMode === 'forceAssign' ? 'Reasignar Forzosamente' : 'Solicitar Transferencia' }}
      </BaseButton>
    </div>
  </template>
</BaseModal>

<!-- Diálogo de confirmación para rechazar transferencia -->
<ConfirmDialog
v-model="showRejectConfirm"
title="¿Rechazar esta transferencia?"
message="Al rechazar la transferencia, el ticket permanecerá con el técnico actual. Esta acción quedará registrada en la auditoría."
confirm-text="Sí, rechazar"
cancel-text="Cancelar"
variant="danger"
@confirm="handleConfirmReject"
/>
</div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'
import BaseCard from '@/components/base/BaseCard.vue'
import BaseButton from '@/components/base/BaseButton.vue'
import BaseBadge from '@/components/base/BaseBadge.vue'
import BaseDropdown from '@/components/base/BaseDropdown.vue'
import ConfirmDialog from '@/components/base/ConfirmDialog.vue'
import BaseModal from '@/components/base/BaseModal.vue'
import BaseTooltip from '@/components/base/BaseTooltip.vue'
import {
  changeStatus,
  closeTicket,
  requestTransfer,
  acceptTransfer,
  rejectTransfer,
  forceAssign,
  getTechnicians
} from '@/services/ticketService'

const autoResizeInput = (event) => {
  const element = event.target;
  element.style.height = 'auto';
  element.style.height = element.scrollHeight + 'px';
};

const resetInputHeight = () => {
  // Busca el elemento textarea para devolverlo a su estado original tras el envío
  const textarea = document.querySelector('textarea[placeholder="Escribe tu mensaje aquí..."]');
  if (textarea) {
    textarea.style.height = 'auto';
  }
};

const route = useRoute()
const authStore = useAuthStore()

const loading = ref(false)
const errorMsg = ref('')
const ticket = ref(null)
const contacto = ref(null)
const tecnicoAsignado = ref(null)
const mensajes = ref([])
const auditoria = ref([])

// Inputs
const messageText = ref('')
const selectedFile = ref(null)
const fileInput = ref(null)

// Loadings
const actionLoading = ref(false)
const sendLoading = ref(false)

// Chat UI Ref
const chatContainer = ref(null)

// Lightbox
const lightboxUrl = ref(null)

// Estado y Cierre (Sprint 2 - Fase 2)
const selectedStatus = ref(null)
const showCloseConfirm = ref(false)
const statusLoading = ref(false)
const closeLoading = ref(false)

// Transiciones válidas según el estado actual (según backend)
const STATUS_TRANSITIONS = {
  'nuevo': [],
  'asignado': ['esperando', 'resuelto'],
  'esperando': ['asignado', 'resuelto'],
  'resuelto': ['cerrado'],
  'cerrado': []
}

const STATUS_LABELS = {
  'nuevo': 'Nuevo',
  'asignado': 'Asignado',
  'esperando': 'Esperando respuesta',
  'resuelto': 'Resuelto',
  'cerrado': 'Cerrado'
}

// Computed: ¿Es el usuario actual el propietario del ticket?
const isOwner = computed(() => {
  if (!ticket.value) return false
  return ticket.value.tecnicoAsignadoId === authStore.user?.id
})

// Computed: Opciones disponibles para el dropdown de estado
const availableStatusOptions = computed(() => {
  if (!ticket.value) return []
  const estadoActual = ticket.value.estado
  const transiciones = STATUS_TRANSITIONS[estadoActual] || []
  return transiciones.map(estado => ({
    value: estado,
    label: STATUS_LABELS[estado] || estado
  }))
})

// Computed: ¿Se puede cambiar el estado? (propietario + no cerrado + hay transiciones)
const canChangeStatus = computed(() => {
  return isOwner.value 
    && ticket.value?.estado !== 'cerrado' 
    && availableStatusOptions.value.length > 0
})

// Computed: ¿Se puede cerrar el ticket?
const canCloseTicket = computed(() => {
  if (!ticket.value) return false
  const estado = ticket.value.estado
  return isOwner.value && ['asignado', 'esperando', 'resuelto'].includes(estado)
})

// ============================================================
// SPRINT 2 - FASE 3: Transferencias
// ============================================================

// Estados para el modal de transferencia
const showTransferModal = ref(false)
const modalMode = ref('transfer')  // ← AGREGAR ESTA LÍNEA ('transfer' | 'forceAssign')
const technicians = ref([])
const selectedTechnicianId = ref(null)
const technicianSearch = ref('')
const transferLoading = ref(false)
const acceptLoading = ref(false)
const rejectLoading = ref(false)
const showRejectConfirm = ref(false)
const showForceAssignModal = ref(false)
const forceAssignLoading = ref(false)

// Computed: ¿Se puede solicitar transferencia?
const canRequestTransfer = computed(() => {
  if (!ticket.value) return false
  return isOwner.value 
    && !ticket.value.transferido 
    && !ticket.value.solicitudTransferenciaTecnicoId
    && ticket.value.estado !== 'cerrado'
})

// Computed: ¿Se puede reasignar forzosamente? (solo supervisores) - S2-A05
const canForceAssign = computed(() => {
  if (!ticket.value) return false
  return authStore.isSupervisor && ticket.value.estado !== 'cerrado'
})

// Computed: Tooltip explicativo cuando el botón está deshabilitado
const transferDisabledTooltip = computed(() => {
  if (!ticket.value) return ''
  if (!isOwner.value) return 'Solo el técnico asignado puede transferir este ticket'
  if (ticket.value.transferido) return 'Este ticket ya fue transferido anteriormente'
  if (ticket.value.solicitudTransferenciaTecnicoId) return 'Ya existe una solicitud de transferencia pendiente'
  if (ticket.value.estado === 'cerrado') return 'No se puede transferir un ticket cerrado'
  return ''
})

// Computed: Lista de técnicos filtrada (excluyendo al actual)
const filteredTechnicians = computed(() => {
  const currentUserId = authStore.user?.id
  let list = technicians.value.filter(t => t.id !== currentUserId)
  
  if (technicianSearch.value.trim()) {
    const search = technicianSearch.value.toLowerCase().trim()
    list = list.filter(t => 
      t.nombre.toLowerCase().includes(search) || 
      t.email.toLowerCase().includes(search)
    )
  }
  
  return list
})

// Computed: ¿El usuario actual es el destino de una solicitud de transferencia pendiente?
const isTransferDestination = computed(() => {
  if (!ticket.value) return false
  return ticket.value.solicitudTransferenciaTecnicoId === authStore.user?.id
})

// Computed: Nombre del técnico que solicita la transferencia
const transferRequestFromName = computed(() => {
  if (!ticket.value || !isTransferDestination.value) return ''
  return tecnicoAsignado.value?.nombre || 'Técnico actual'
})

// Check mode Solo Lectura (Read Only)

// Check mode Solo Lectura (Read Only)
// Si el ticket no es nuevo y el usuario actual no es el asignado ni supervisor
const isReadOnly = computed(() => {
  if (!ticket.value) return true
  if (ticket.value.estado === 'nuevo') return false // cualquiera puede interactuar / autoasignar
  return ticket.value.tecnicoAsignadoId !== authStore.user?.id && authStore.user?.rol !== 'supervisor'
})

const fetchTicketDetails = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const response = await api.get(`/tickets/${route.params.id}`)
    if (response.data && response.data.success) {
      const payload = response.data.data
      ticket.value = payload.ticket
      contacto.value = payload.contacto
      tecnicoAsignado.value = payload.tecnicoAsignado
      mensajes.value = payload.mensajes
      auditoria.value = payload.auditoria
      scrollToBottom()
    } else {
      errorMsg.value = response.data?.error || 'No se pudo obtener el ticket.'
    }
  } catch (error) {
    console.error('Error fetching ticket details:', error)
    errorMsg.value = error.response?.data?.error || 'Error al conectar con la API.'
  } finally {
    loading.value = false
  }
}

const handleTakeCase = async () => {
  if (!ticket.value) return
  actionLoading.value = true
  try {
    // Se envía un objeto vacío {} para forzar el encabezado Content-Type correcto
    const response = await api.post(`/tickets/${ticket.value.id}/assign`, {})
    if (response.data && response.data.success) {
      // Recargar detalles
      await fetchTicketDetails()
    } else {
      alert(response.data?.error || 'Error al tomar el caso')
    }
  } catch (error) {
    console.error('Error taking case:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor.')
  } finally {
      actionLoading.value = false
    }
  }


// ============================================================
// SPRINT 2 - FASE 2: Cambio de estado y cierre
// ============================================================

/**
 * Cambiar el estado del ticket
 */
const handleChangeStatus = async (nuevoEstado) => {
  if (!ticket.value || !nuevoEstado) return
  if (!canChangeStatus.value) return
  
  statusLoading.value = true
  try {
    const response = await changeStatus(ticket.value.id, nuevoEstado)
    if (response.success) {
      // Recargar detalles del ticket
      await fetchTicketDetails()
      // Resetear el dropdown
      selectedStatus.value = null
    } else {
      alert(response.error || 'Error al cambiar el estado')
    }
  } catch (error) {
    console.error('Error changing status:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    statusLoading.value = false
  }
}

/**
 * Abrir diálogo de confirmación para cerrar ticket
 */
const openCloseConfirm = () => {
  if (!canCloseTicket.value) return
  showCloseConfirm.value = true
}

/**
* Confirmar y ejecutar el cierre del ticket
*/
const handleConfirmClose = async () => {
if (!ticket.value) return

closeLoading.value = true
try {
  const response = await closeTicket(ticket.value.id)
  if (response.success) {
    // Recargar detalles del ticket
    await fetchTicketDetails()
  } else {
    alert(response.error || 'Error al cerrar el ticket')
  }
} catch (error) {
  console.error('Error closing ticket:', error)
  alert(error.response?.data?.error || 'Error al conectar con el servidor')
} finally {
  closeLoading.value = false
  showCloseConfirm.value = false
}
}

// ============================================================
// SPRINT 2 - FASE 3: Funciones de Transferencia
// ============================================================

/**
* Cargar la lista de técnicos desde el backend
*/
const loadTechnicians = async () => {
  try {
    const response = await getTechnicians()
    if (response.success) {
      technicians.value = response.data || []
    }
  } catch (error) {
    console.error('Error loading technicians:', error)
    alert('Error al cargar la lista de técnicos')
  }
}

/**
* Abrir modal de solicitud de transferencia
*/
const handleTransferCase = async () => {
  if (!canRequestTransfer.value) return
  
  // Resetear estado del modal
  selectedTechnicianId.value = null
  technicianSearch.value = ''
  
  // Cargar técnicos si aún no se han cargado
  if (technicians.value.length === 0) {
    await loadTechnicians()
  }
  
  showTransferModal.value = true
}

/**
 * S2-A05: Abrir modal de reasignación forzada (solo supervisores)
 */
const handleForceAssignCase = async () => {
  if (!canForceAssign.value) return
  // Resetear estado del modal
  selectedTechnicianId.value = null
  technicianSearch.value = ''
  modalMode.value = 'forceAssign'
  // Cargar técnicos si aún no se han cargado
  if (technicians.value.length === 0) {
    await loadTechnicians()
  }
  showTransferModal.value = true // Reutilizamos el mismo modal
}

/**
 * S2-A05: Confirmar y ejecutar la reasignación forzada
 */
const handleConfirmForceAssign = async () => {
  if (!ticket.value || !selectedTechnicianId.value) return
  forceAssignLoading.value = true
  try {
    const response = await forceAssign(ticket.value.id, selectedTechnicianId.value)
    if (response.success) {
      await fetchTicketDetails()
      showTransferModal.value = false
    } else {
      alert(response.error || 'Error al reasignar el ticket')
    }
  } catch (error) {
    console.error('Error force-assigning ticket:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    forceAssignLoading.value = false
  }
}

/**
* Confirmar y enviar solicitud de transferencia
*/
const handleConfirmTransfer = async () => {
  if (!ticket.value || !selectedTechnicianId.value) return
  
  transferLoading.value = true
  try {
    const response = await requestTransfer(ticket.value.id, selectedTechnicianId.value)
    if (response.success) {
      await fetchTicketDetails()
      showTransferModal.value = false
    } else {
      alert(response.error || 'Error al solicitar transferencia')
    }
  } catch (error) {
    console.error('Error requesting transfer:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    transferLoading.value = false
  }
}

/**
* Aceptar transferencia (solo si eres el destino)
*/
const handleAcceptTransfer = async () => {
  if (!ticket.value || !isTransferDestination.value) return
  
  acceptLoading.value = true
  try {
    const response = await acceptTransfer(ticket.value.id)
    if (response.success) {
      await fetchTicketDetails()
    } else {
      alert(response.error || 'Error al aceptar transferencia')
    }
  } catch (error) {
    console.error('Error accepting transfer:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    acceptLoading.value = false
  }
}

/**
* Abrir diálogo de confirmación para rechazar transferencia
*/
const openRejectConfirm = () => {
  showRejectConfirm.value = true
}

/**
* Confirmar y ejecutar el rechazo de transferencia
*/
const handleConfirmReject = async () => {
  if (!ticket.value) return
  
  rejectLoading.value = true
  try {
    const response = await rejectTransfer(ticket.value.id)
    if (response.success) {
      await fetchTicketDetails()
    } else {
      alert(response.error || 'Error al rechazar transferencia')
    }
  } catch (error) {
    console.error('Error rejecting transfer:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    rejectLoading.value = false
    showRejectConfirm.value = false
  }
}

// File Select handlers

// File Select handlers
const triggerFileSelect = () => {
  fileInput.value?.click()
}

const handleFileChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  
  // Limite de 25MB (26,214,400 bytes)
  const maxSize = 25 * 1024 * 1024
  if (file.size > maxSize) {
    alert('El archivo supera el límite de 25 MB.')
    clearSelectedFile()
    return
  }
  selectedFile.value = file
}

const clearSelectedFile = () => {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const handleSendMessage = async () => {
  if (!messageText.value.trim() && !selectedFile.value) return
  
  sendLoading.value = true
  try {
    // ✅ Crear FormData para enviar archivos
    const formData = new FormData()
    
    // Añadir texto del mensaje
    if (messageText.value.trim()) {
      formData.append('contenido', messageText.value)
    }
    
    // ✅ Añadir archivo si existe
    if (selectedFile.value) {
      formData.append('archivo', selectedFile.value)
    }
    
    // ✅ Enviar como multipart/form-data
    const response = await api.post(`/tickets/${ticket.value.id}/messages`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    if (response.data.success) {
      // Limpiar inputs
      messageText.value = ''
      selectedFile.value = null
      fileName.value = ''
      fileSize.value = 0
      
      // Resetear altura del textarea
      resetInputHeight()
      
      // Recargar mensajes
      await fetchTicketDetails()
    } else {
      alert(response.data.error || 'Error al enviar mensaje')
    }
  } catch (error) {
    console.error('Error sending message:', error)
    alert(error.response?.data?.error || 'Error al conectar con el servidor')
  } finally {
    sendLoading.value = false
  }
}

const getFileType = (mime) => {
  if (mime.startsWith('image/')) return 'imagen'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'documento'
}

const getAttachmentUrl = (urlPath) => {
  if (urlPath.startsWith('blob:')) return urlPath // URL local de vista previa
  // Obtener la URL base del servidor desde variables de entorno
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
  // Quitar '/api' para obtener la raíz del servidor (donde se sirven los archivos)
  const baseServer = baseURL.replace(/\/api$/, '')
  return `${baseServer}${urlPath}`
}

const openLightbox = (url) => {
  lightboxUrl.value = url
}

// Helpers
const scrollToBottom = () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

const getStatusVariant = (estado) => {
  const norm = (estado || '').toLowerCase()
  const variants = {
    'nuevo': 'blue',
    'asignado': 'green',
    'esperando': 'yellow',
    'resuelto': 'green',
    'cerrado': 'gray'
  }
  return variants[norm] || 'gray'
}

const formatPhone = (phone) => {
  if (!phone) return ''
  return phone.replace('@c.us', '')
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatTime = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatAudioTime = (time) => {
  if (isNaN(time) || time === Infinity || !time) return '0:00'
  const mins = Math.floor(time / 60)
  const secs = Math.floor(time % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatAuditAction = (action) => {
  const map = {
    'creacion': 'creación de ticket',
    'asignacion': 'asignación',
    'solicitud_transferencia': 'solicitud de transferencia',
    'aceptacion_transferencia': 'transferencia aceptada',
    'rechazo_transferencia': 'transferencia rechazada',
    'reasignacion_forzada': 'reasignación forzada',
    'respuesta': 'mensaje enviado',
    'cambio_estado': 'cambio de estado',
    'cierre': 'cierre de ticket'
  }
  return map[action] || action
}

const formatAuditDetails = (item) => {
  const det = item.detalle
  if (!det) return ''
  if (item.accion === 'asignacion') {
    return `Asignado por: ${det.asignado_por || 'técnico'}`
  }
  if (item.accion === 'respuesta') {
    return `Mensaje ${det.tiene_archivo ? `con archivo (${det.tipo_archivo})` : 'de texto'}`
  }
  return JSON.stringify(det)
}

onMounted(() => {
  fetchTicketDetails()
})
</script>