# ANÁLISIS DE INTEGRACIÓN: OPENWA ↔ CRM WEB (Helpdesk de Soporte)

> **Proyectos analizados:**
> - **OpenWA** v0.23.3 — Open Source WhatsApp API Gateway (`C:\Users\Sistemas\Desktop\OpenWA`)
> - **SoporteWhatsApp** (CRM) — Backend Express 5 + Prisma + Socket.IO, Frontend Vue 3 (`C:\Users\Sistemas\Desktop\SoporteWhatsApp`)
> **Fecha del análisis:** 2026-08-25
> **Autor:** Departamento de Sistemas — Arquitectura de Integración

---

## 1. Resumen Ejecutivo

Este documento define la arquitectura para conectar **OpenWA** (gateway de WhatsApp) con el **CRM web propio (SoporteWhatsApp)**, donde cada mensaje entrante de una tienda genera un *ticket* que un agente de soporte resuelve.

**Conclusión principal (revisión v2 con análisis del CRM):**

1. **OpenWA ya es un gateway completo**: sesiones multi-número, envío/recepción (texto y media), QR, API Keys, webhooks con **HMAC + reintentos + dedup**, Socket.IO, dashboard y Swagger. **No requiere modificar su código fuente.**

2. **El CRM ya tiene un esqueleto de integración**, pero contiene **errores bloqueantes** que impiden que funcione con la API real de OpenWA:
   - El webhook del CRM lee el payload en **formato plano** (`from`, `body`, `mediaUrl`) cuando OpenWA entrega un **envelope anidado** (`data.from`, `data.body`, `data.media`). **El primer mensaje real fallaría con 400.**
   - El servicio de envío manda `{ to, text }` cuando OpenWA exige `{ chatId, text }`, y no añade el sufijo `@c.us`.
   - El envío de media usa nombres de campo incorrectos (`mimeType`/`fileName` vs `mimetype`/`filename`).
   - Usa un `OPENWA_INSTANCE_ID` por defecto (`'default'`) que no corresponde a una sesión real (las sesiones de OpenWA son UUID).
   - El webhook es **público sin verificación HMAC**.
   - No existe push Socket.IO para mensajes de tickets (solo para chat directo).

3. **El trabajo de integración se concentra en corregir y completar el adaptador del CRM** (backend), no en OpenWA. Este documento entrega el diagnóstico puntual por archivo y el código corregido.

**Canal recomendado:** **Webhook HTTP con firma HMAC** como ingesta principal (garantías de entrega ya resueltas por OpenWA), **Socket.IO del CRM** para el frontend, y opcionalmente el **Socket.IO nativo de OpenWA** (`/events`) para QR y estado de sesión hacia el backend del CRM.

---

## 2. Diagnóstico Actual del Proyecto OpenWA

### 2.1 Estructura de archivos encontrada

OpenWA es un proyecto **NestJS 11** (TypeScript 6) con estructura de monorepo:

```
OpenWA/
├── src/                          # Código fuente del API (NestJS)
│   ├── main.ts                   # Entry point (bootstrap, HTTPS, CORS, Swagger)
│   ├── app.module.ts             # Módulo raíz
│   ├── config/                   # Configuración por entorno (.env / data/.env.generated)
│   ├── common/                   # Utilidades compartidas (cache, storage, seguridad, logs)
│   ├── core/                     # Sistema de plugins y hooks
│   ├── engine/                   # Abstracción de motores de WhatsApp
│   │   ├── whatsapp-web-js.adapter.ts   # Motor 1: WhatsApp Web real (Chromium/Puppeteer)
│   │   └── baileys.adapter.ts           # Motor 2: Protocolo multi-dispositivo (Baileys)
│   └── modules/                  # Módulos de negocio (33 módulos)
│       ├── auth/                 # API Keys (roles + scope por sesión)
│       ├── session/              # Gestión de sesiones (crear, iniciar, QR, logout)
│       ├── message/              # Envío de mensajes (texto, media, bulk, reply)
│       ├── webhook/              # Webhooks (HMAC, retry, outbox, dedup, filtros)
│       ├── events/               # Gateway Socket.IO (/events)
│       └── ...                   # group, contact, label, profile, status, etc.
├── dashboard/                    # Dashboard web (React + Vite) — se sirve en el puerto 2785
├── sdk/                          # SDKs oficiales (javascript, python, php, go, java)
├── docs/                         # 31 documentos de diseño y operación
├── docker-compose.yml            # Producción (SQLite/Postgres/Redis/MinIO)
├── package.json                  # Dependencias
└── openapi.json                  # Especificación OpenAPI versionada
```

### 2.2 Dependencias actuales (package.json)

| Capa | Tecnología | Versión |
|---|---|---|
| Runtime | Node.js | >= 22.13 (LTS) |
| Framework | NestJS (core, config, swagger, throttler, socket.io) | ^11.x |
| ORM | TypeORM | ^1.1.0 |
| Base de datos | SQLite / PostgreSQL | better-sqlite3 ^13 / pg ^8 |
| Cache/Colas | Redis / BullMQ (opcional) | ioredis ^6 / bullmq ^6 |
| WhatsApp Engine 1 | whatsapp-web.js | 1.34.7 |
| WhatsApp Engine 2 | @whiskeysockets/baileys | 7.0.0-rc14 |
| Tiempo real | socket.io | ^4.8.3 |
| Media | sharp, qrcode, audio-decode | — |
| Almacenamiento | Local / S3 / MinIO | — |

### 2.3 Qué funciona (ya resuelto por OpenWA)

| Capacidad | Estado | Evidencia |
|---|---|---|
| REST API completa bajo `/api` | ✅ | `src/modules/*` (33 módulos) |
| Multi-sesión (varios números simultáneos) | ✅ | `POST /api/sessions` |
| Autenticación por API Key con roles | ✅ | `src/modules/auth` (VIEWER/OPERATOR/ADMIN + scope por sesión) |
| Envío de texto, media, bulk, reply, react | ✅ | `src/modules/message` |
| Recepción de mensajes (texto y media) | ✅ | Evento `message.received` |
| QR para vincular número | ✅ | `GET /api/sessions/:id/qr` → PNG data URL |
| Webhooks con HMAC, retry, outbox, dedup | ✅ | `src/modules/webhook` |
| Socket.IO en tiempo real (`/events`) | ✅ | `src/modules/events/events.gateway.ts` |
| Dashboard web administrativo | ✅ | `/` en puerto 2785 (servido por el API) |
| Documentación Swagger | ✅ | `/api/docs` (off en producción salvo `ENABLE_SWAGGER=true`) |
| Salud, rate limiting, audit log, métricas | ✅ | `health`, `throttler`, `audit`, `metrics` |
| SDK oficial JS/TS | ✅ | `sdk/javascript` |

### 2.4 Qué falta (para la integración con el CRM)

**Del lado de OpenWA: no falta código.** Solo configuración operativa: crear la sesión del número de soporte, vincularlo con QR, generar una API Key dedicada y registrar el webhook hacia el CRM.

---

## 3. Diagnóstico del Proyecto CRM (SoporteWhatsApp)

### 3.1 Arquitectura

| Capa | Tecnología | Puertos | Detalle |
|---|---|---|---|
| Backend | Express 5 + Prisma + Socket.IO | 3000 | CommonJS (`require`), rutas en `backend/src/routes/`, lógica en `controllers/` y `services/` |
| Frontend | Vue 3 `<script setup>` + Pinia + Vue Router + Tailwind 4 | 5173 | `@` alias → `src`; `VITE_API_URL` default `http://localhost:3000/api` |
| Base de datos | PostgreSQL | 5432 | Esquema definido en `backend/prisma/schema.prisma` |
| Autenticación | JWT en localStorage | — | Roles `supervisor` / `tecnico`; `checkSupervisorRole` |

### 3.2 Mapa de archivos relevante para la integración

```
backend/src/
├── app.js                          # Entry: Express + HTTP server + Socket.IO + rutas
├── routes/webhook.js               # POST /api/webhooks/whatsapp (público, SIN HMAC)
├── controllers/webhookController.js# Receptor del webhook de OpenWA
├── controllers/ticketController.js # sendMessage → openwaService (envío agente)
├── controllers/directChatController.js # sendDirectMessage → openwaService
├── controllers/excludedNumberController.js # esNumeroExcluido/obtenerTipoExclusion/obtenerAliasNumero
├── services/openwaService.js       # Cliente HTTP hacia OpenWA
├── services/socketService.js       # Socket.IO del CRM (JWT en handshake.auth.token)
├── services/ticketService.js       # findOrCreateOpenTicket + ESTADOS_ABIERTOS
└── services/contactService.js      # findOrCreateContact

frontend/src/
├── services/socketService.js       # Cliente Socket.IO (escucha nuevo_mensaje_directo, respuesta_directa_enviada)
└── views/TicketsView.vue           # Recarga con evento window 'ticket-updated' (NO socket)
```

### 3.3 Modelo de datos (esquema Prisma)

| Tabla | Campos clave | Notas |
|---|---|---|
| `contactos` | `numero_telefono` (PK, VarChar 20), `nombre`, `sucursal` | El PK guarda el número **con** `@c.us` cuando viene del webhook |
| `tickets` | `numero_cliente`, `estado`, `tecnico_asignado_id`, `transferido`, `categoria`, `cerrado_en` | Estados: `nuevo, asignado, esperando, resuelto, cerrado`. `ESTADOS_ABIERTOS = nuevo/asignado/esperando/resuelto` |
| `mensajes` | `ticket_id`, `remitente` (`cliente`\|`tecnico`), `contenido`, `tipo` (`texto`\|`imagen`\|`audio`\|`documento`...), `url_adjunto`, `whatsapp_message_id` (**UNIQUE**, dedup), `enviado_en` | |
| `numeros_excluidos` | `numero` (**UNIQUE**), `tipo` (`excluido`\|`chat_privado`), `nombre` (alias) | El número se normaliza **sin** `@c.us` |
| `mensajes_directos` | `numero_remitente`, `contenido`, `remitente` (`cliente`\|`supervisor`), `whatsapp_message_id` (UNIQUE), `leido` | Solo supervisores |
| `auditoria` | `ticket_id`, `usuario_id`, `accion`, `detalle` (JSON) | Trazabilidad |

**Inconsistencia detectada:** los tickets/contactos guardan el número **con** `@c.us` (`5215512345678@c.us`), pero `numeros_excluidos` lo guarda **sin** sufijo. La comparación en el webhook sí funciona porque `excludedNumberController.normalizarNumero` quita el sufijo antes de buscar.

### 3.4 Estado actual de la integración (lo que ya existe)

| Pieza | Archivo | Estado |
|---|---|---|
| Variables de entorno | `backend/.env` (`OPENWA_API_URL`, `OPENWA_API_KEY`, `OPENWA_INSTANCE_ID`) | ⚠️ Existen, pero `OPENWA_INSTANCE_ID` default `'default'` no coincide con una sesión real de OpenWA |
| Webhook receptor | `routes/webhook.js` + `controllers/webhookController.js` | ⚠️ **Incompatible**: lee payload plano, no valida HMAC |
| Envío de texto | `services/openwaService.js` → `sendMessage` | ⚠️ **Incompatible**: `{ to, text }` sin `@c.us` |
| Envío de media | `services/openwaService.js` → `sendMedia` | ⚠️ **Incompatible**: campos `mimeType`/`fileName` y `media` anidado |
| Reglas de negocio (excluidos, chat privado, ticket) | `webhookController.js` + `ticketService.js` + `excludedNumberController.js` | ✅ Lógica correcta y reutilizable |
| Socket.IO del CRM | `services/socketService.js` | ✅ Funciona; solo faltan eventos para tickets |
| Descarga de media entrante | `webhookController.js` (axios a `mediaUrl`) | ⚠️ `mediaUrl` no existe en OpenWA (ver B6) |

### 3.5 Tiempo real actual (Socket.IO del CRM)

- El backend crea Socket.IO sobre el servidor HTTP (`app.js:167`), autentica con JWT (`handshake.auth.token`) y usa salas `user_<id>`.
- Eventos emitidos hoy: `nuevo_mensaje_directo` y `respuesta_directa_enviada` (solo chat directo).
- **Los mensajes de tickets NO se emiten por Socket.IO**: `TicketsView` recarga con un evento `window` local (`ticket-updated`) lanzado por el propio componente. Un mensaje nuevo de la tienda no aparece en vivo.

---

## 4. Brechas de Integración Bloqueantes

Diagnóstico puntual: archivo → problema → fix.

| # | Severidad | Archivo | Problema | Fix |
|---|---|---|---|---|
| **B1** | 🔴 CRÍTICA | `webhookController.js:40-49` | Lee payload plano (`message.from`, `message.body`, `message.mediaUrl`). OpenWA entrega envelope anidado `{ event, sessionId, idempotencyKey, data: { id, from, body, type, isGroup, hasMedia, media } }`. `from`/`id` quedan `undefined` → **400 "Faltan campos obligatorios"** en todo mensaje real | Leer `req.body.data.*`; mapear `data.isGroup`, `data.media`, etc. (snippet §7.3) |
| **B2** | 🔴 CRÍTICA | `openwaService.js:15-35` | Envía `{ to, text }`; OpenWA exige `{ chatId, text }`. Además `formatPhoneNumber` devuelve solo dígitos (`5215512345678`) **sin** `@c.us` → send-text rechazado con 400 | Payload `{ chatId, text }` con chatId `+ '@c.us'` (snippet §7.4) |
| **B3** | 🔴 ALTA | `openwaService.js:52-100` | `sendMedia` manda `{ to, text, media: { url, mimeType, fileName } }`; OpenWA espera plano `{ chatId, url, mimetype, filename, caption }`. Nombres distintos (`mimeType`≠`mimetype`, `fileName`≠`filename`) | DTO plano con nombres exactos de OpenWA (snippet §7.4) |
| **B4** | 🔴 ALTA | `openwaService.js:8` | `OPENWA_INSTANCE_ID` default `'default'`; las sesiones de OpenWA son **UUID** creadas vía `POST /api/sessions` → apunta a sesión inexistente | Setear `OPENWA_INSTANCE_ID` con el UUID real de la sesión de soporte |
| **B5** | 🟠 ALTA | `routes/webhook.js:11` | Webhook **público sin verificación HMAC**; cualquiera puede forjar tickets/mensajes | Middleware que valida `X-OpenWA-Signature` (snippet §7.6) |
| **B6** | 🟠 ALTA | `webhookController.js:99-135,242-278` | Descarga `mediaUrl`, campo que OpenWA **no envía**. OpenWA manda `data.media.data` (base64, ≤1 MiB por defecto) o el marcador `{ omitted: true, sizeBytes }` | Usar `data.media.data` base64 o descargar vía `GET /api/sessions/:id/messages/:chatId/:messageId/media` (snippet §7.3) |
| **B7** | 🟠 MEDIA | `ticketController.js:500-513` | Envío de media del agente: OpenWA hace fetch server-side de `http://<CRM>/uploads/...` y **el guard SSRF lo bloquea** si el CRM es IP privada/loopback | Añadir el host del CRM a `SSRF_ALLOWED_HOSTS` en el `.env` de OpenWA (o enviar base64) |
| **B8** | 🟡 MEDIA | `webhookController.js` + `socketService.js` | No hay push Socket.IO para mensajes de tickets → los agentes no ven mensajes nuevos en vivo | Emitir `nuevo_mensaje_ticket` (y `ticket_actualizado`) tras guardar (snippet §7.5) |
| **B9** | 🟢 BAJA | `webhookController.js:180` | Ignora `data.pushName` → contactos sin nombre | Pasar `pushName` a `findOrCreateContact` como `nombre` |
| **B10** | 🟢 BAJA | `webhookController.js` | Solo maneja `message.received`; ignora el envelope y otros eventos (`session.status`, `session.qr`, `message.ack`) | Registrar `event`/`sessionId`/`idempotencyKey`; handler para eventos de sesión (opcional) |

---

## 5. Arquitectura de Integración Propuesta (Actualizada)

### 5.1 Diagrama de flujo con los archivos reales del CRM

```
  Tienda (WhatsApp)
        │
        │  mensaje entrante
        ▼
  ┌────────────────────────┐   QR scan (vincular)   ┌────────────────────┐
  │        OpenWA          │ ◄────────────────────► │  Dashboard OpenWA  │
  │   (API Gateway)        │  POST /api/sessions,   │  puerto 2785       │
  │   puerto 2785          │  GET  /api/sessions/   │                    │
  └───────────┬────────────┘       :id/qr           └────────────────────┘
              │
              │  1) Webhook POST https://<CRM>/api/webhooks/whatsapp
              │     Headers: X-OpenWA-Signature (sha256=…), X-OpenWA-Idempotency-Key,
              │              X-OpenWA-Event, X-OpenWA-Retry-Count
              │     Body:    { event, sessionId, idempotencyKey, deliveryId, data:{…} }
              │  2) Opcional: Socket.IO /events (QR, session.status) hacia el backend CRM
              ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │  BACKEND del CRM (Express, puerto 3000)                                 │
  │                                                                         │
  │  routes/webhook.js  →  express.raw → webhookController.receiveWebhook   │
  │      │ 1. Verificar X-OpenWA-Signature (HMAC)              (§7.6)        │
  │      │ 2. Leer req.body.data.* (from, body, type, isGroup) (§7.3)        │
  │      │ 3. Dedup por whatsappMessageId (UNIQUE) + idempotencyKey          │
  │      │ 4. ¿Grupo?  → ignorar (RF-07.1)                                   │
  │      │ 5. ¿Excluido/chat_privado? → excludedNumberController →           │
  │      │      mensajeDirecto + emit 'nuevo_mensaje_directo'                │
  │      │ 6. contactService.findOrCreateContact(from)                       │
  │      │ 7. ticketService.findOrCreateOpenTicket(from)  → ticket           │
  │      │ 8. Media: data.media.data base64 → /uploads/ (o endpoint media)   │
  │      │ 9. prisma.mensaje.create (remitente 'cliente')                    │
  │      │10. socketService → 'nuevo_mensaje_ticket'  → Frontend (en vivo)   │
  │                                                                          │
  │  controllers/ticketController.sendMessage (agente responde)              │
  │      │ → services/openwaService.sendMessage({ chatId: num+'@c.us', text })│
  │      │ → prisma.mensaje.create (remitente 'tecnico') → estado 'esperando' │
  └───────────────┬─────────────────────────────────────────────────────────┘
                  │
                  │  5) POST /api/sessions/{sessionId}/messages/send-text
                  │     X-API-Key, { chatId: "5215512345678@c.us", text }
                  ▼
  ┌────────────────────────┐
  │        OpenWA          │──► WhatsApp ──► Tienda
  └────────────────────────┘
```

**Flujo numerado:**
1. La tienda escribe al número de soporte; OpenWA entrega `message.received` al webhook del CRM con firma HMAC.
2. (Opcional) El backend del CRM se suscribe a `/events` de OpenWA para QR y estado de sesión.
3. `webhookController` valida firma, deduplica, y crea/actualiza contacto + ticket + mensaje.
4. El backend emite `nuevo_mensaje_ticket` por su Socket.IO → el frontend del agente actualiza en vivo.
5. El agente responde; `ticketController.sendMessage` llama a `openwaService` → OpenWA → tienda.
6. (Los mensajes del técnico también pueden rastrearse con `message.ack` si se desea confirmar entrega.)

### 5.2 Justificación de la tecnología de comunicación

| Opción | Ventajas | Desventajas | Veredicto |
|---|---|---|---|
| **Webhook HTTP + HMAC** (recomendado) | Entrega garantizada (outbox + reintentos + dedup + idempotencia), firma HMAC, cola BullMQ opcional, tolerante a caídas del CRM | Una petición HTTP por evento; el CRM debe ser alcanzable desde OpenWA | ✅ **Ingesta principal** |
| Socket.IO nativo de OpenWA (`/events`) | Baja latencia, push bidireccional, QR/presencia/tipeo en vivo | Fire-and-forget: eventos perdidos si el backend cae; sin dedup | ✅ **Complemento** (QR, estado de sesión) |
| REST API + polling | Simple | Latencia, carga innecesaria | ❌ Solo operaciones puntuales |

**Decisión:** los mensajes de soporte **no pueden perderse**. OpenWA ya resuelve la entrega confiable vía webhooks. El Socket.IO de OpenWA se reserva para lo "en vivo por naturaleza" (QR, estado). El frontend del CRM consume **su propio** Socket.IO (el del backend), nunca el de OpenWA directamente.

### 5.3 Contrato del webhook (headers + body)

**Headers que envía OpenWA** (verificado en `src/modules/webhook/webhook-delivery.service.ts`):

```
X-OpenWA-Event:            message.received
X-OpenWA-Idempotency-Key:  msg_<session>_<id>_<uuid>
X-OpenWA-Delivery-Id:      dlv_<uuid>
X-OpenWA-Retry-Count:      0
X-OpenWA-Signature:        sha256=<hmac-sha256-hex sobre el body EXACTO>
Content-Type:              application/json
```

**Body (message.received):**

```json
{
  "event": "message.received",
  "timestamp": "2026-08-25T10:30:00Z",
  "sessionId": "8f3c2b1a-9d4e-4c7a-8b2f-1e6d5a4c3b2a",
  "idempotencyKey": "msg_..._ABC123_DEF456_<uuid>",
  "deliveryId": "dlv_<uuid>",
  "data": {
    "id": "ABC123_DEF456",
    "from": "5215512345678@c.us",
    "to": "5215587654321@c.us",
    "body": "Buenos días, se descompuso la lectora de la óptica",
    "type": "text",
    "timestamp": 1724596200,
    "isGroup": false,
    "author": null,
    "hasMedia": false,
    "media": null,
    "pushName": "Óptica Centro",
    "senderPhone": "5215512345678"
  }
}
```

**Media entrante** (`data.media`): si `hasMedia=true`, `media = { mimetype, filename?, data? (base64), omitted?, sizeBytes? }`. El `data` (base64) solo viene hasta el tope `WEBHOOK_MEDIA_INLINE_MAX_BYTES` (default **1 MiB**); por encima llega `{ omitted: true, sizeBytes }` y el archivo se obtiene con `GET /api/sessions/:sessionId/messages/:chatId/:messageId/media` (usa `data.from` como `chatId` y `data.id` como `messageId`, con `X-API-Key`).

---

## 6. Componentes a Crear / Corregir (por archivo del CRM)

| # | Archivo | Acción | Esfuerzo |
|---|---|---|---|
| 1 | `services/openwaService.js` | **Corregir** `sendMessage` (chatId + @c.us) y `sendMedia` (DTO plano) | Bajo |
| 2 | `routes/webhook.js` | **Cambiar** a `express.raw({ type: 'application/json' })` para poder verificar HMAC sobre bytes exactos | Bajo |
| 3 | `controllers/webhookController.js` | **Corregir** parseo anidado (`req.body.data.*`), media vía base64/endpoint, dedup, `pushName`, push Socket.IO | Medio |
| 4 | `controllers/ticketController.js` | Añadir `SSRF_ALLOWED_HOSTS` en OpenWA (operativo) + fallback a base64 para media del agente (opcional) | Bajo |
| 5 | `services/socketService.js` | **Añadir** método de broadcast a técnicos/supervisores con datos del ticket (reutilizar `notifyAllTechs`/`notifyAllSupervisors`) | Bajo |
| 6 | `frontend/src/views/TicketsView.vue` + `TicketDetailView.vue` | **Suscribirse** a `nuevo_mensaje_ticket` / `ticket_actualizado` para recargar en vivo | Medio |
| 7 | `frontend/src/services/socketService.js` | Ya soporta `on()/off()` genéricos; sin cambios | — |
| 8 | `backend/.env` | Fijar `OPENWA_INSTANCE_ID` (UUID real de la sesión) y añadir secret del webhook (p.ej. `OPENWA_WEBHOOK_SECRET`) | Bajo |
| 9 | `.env` de OpenWA | `AUTO_START_SESSIONS=true`, `SSRF_ALLOWED_HOSTS=<host CRM>` (B7), `RESOLVE_LID_TO_PHONE=true` (senderPhone) | Bajo |
| 10 | (Opcional) Nuevo servicio `services/openwaSocketService.js` | Bridge Socket.IO hacia `/events` de OpenWA para QR/estado de sesión → re-emitir por el socket del CRM | Medio |

---

## 7. Snippets de Código Base (Corregidos)

> Los ejemplos corrigen las brechas B1–B10 y usan la API real de OpenWA (v0.23.3). Base URL: `http://localhost:2785/api`. Auth: header `X-API-Key`.

### 7.1 Levantar OpenWA

```bash
# Docker (recomendado)
cd C:\Users\Sistemas\Desktop\OpenWA
docker compose up -d

# Local
npm ci
npm run dev          # API en :2785, dashboard dev en :2886

curl http://localhost:2785/api/health
```

Configuración mínima en `.env` de OpenWA (producción, PostgreSQL):

```env
NODE_ENV=production
PORT=2785
DATABASE_TYPE=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=openwa
DATABASE_USERNAME=openwa
DATABASE_PASSWORD=<contraseña_fuerte>
DATABASE_SYNCHRONIZE=false
AUTO_START_SESSIONS=true          # re-vincula el número al reiniciar
ENGINE_TYPE=whatsapp-web.js       # menor riesgo de ban; ~300-500 MB RAM/sesión
SSRF_ALLOWED_HOSTS=localhost,mi-crm.local   # B7: permitir que OpenWA descargue media del CRM
RESOLVE_LID_TO_PHONE=true         # añade senderPhone (nº) cuando llega como @lid
```

### 7.2 Crear sesión y obtener el QR (vincular el número)

```bash
# 1) Crear la sesión (el ID que resulta se usa como OPENWA_INSTANCE_ID)
curl -X POST http://localhost:2785/api/sessions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: owa_k1_..." \
  -d '{"name": "soporte-nacional"}'
# → { "id": "8f3c2b1a-9d4e-4c7a-8b2f-1e6d5a4c3b2a", ... }  ← GUARDAR este UUID

# 2) Iniciar la sesión
curl -X POST http://localhost:2785/api/sessions/<sessionId>/start \
  -H "X-API-Key: owa_k1_..."

# 3) QR (PNG data URL) — escanear con el WhatsApp del número de soporte
curl http://localhost:2785/api/sessions/<sessionId>/qr \
  -H "X-API-Key: owa_k1_..."
# → { "qrCode": "data:image/png;base64,iVBORw0KGgoAAA...", "status": "qr_ready" }
```

### 7.3 Webhook receptor del CRM (corregido: parseo anidado + dedup + media + socket)

**`routes/webhook.js`** — usar `express.raw` para poder verificar HMAC sobre los bytes exactos:

```javascript
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Raw body (Buffer) para poder verificar la firma sobre el body EXACTO de OpenWA
router.post('/whatsapp', express.raw({ type: 'application/json' }), webhookController.receiveWebhook);

module.exports = router;
```

**`controllers/webhookController.js`** — parte central corregida (B1, B6, B9, B10):

```javascript
exports.receiveWebhook = async (req, res) => {
  try {
    // 0. El body llega como Buffer (express.raw). Parsear a objeto.
    const payload = JSON.parse(req.body.toString('utf8'));
    const { event, sessionId, idempotencyKey, data } = payload;

    res.status(200).json({ status: 'ok' }); // acuse de recibo rápido a OpenWA

    // Solo procesamos mensajes entrantes (B10)
    if (event !== 'message.received') return;

    // B1: leer campos del ENVELOPE anidado `data.*`
    const {
      id: whatsappMessageId,
      from,            // "5215512345678@c.us"
      body,
      type,            // "text" | "image" | "video" | "audio" | "document" | ...
      timestamp,
      isGroup,
      hasMedia,
      media,           // { mimetype, filename?, data?, omitted?, sizeBytes? } | null
      pushName
    } = data;

    // RF-07.1: ignorar grupos
    if (isGroup || from?.includes('@g.us')) return;

    // Excluidos / chat privado (lógica existente, se mantiene)
    const { esNumeroExcluido, obtenerTipoExclusion, obtenerAliasNumero } =
      require('./excludedNumberController');
    if (await esNumeroExcluido(from)) {
      const tipo = await obtenerTipoExclusion(from);
      if (tipo === 'chat_privado') {
        const alias = await obtenerAliasNumero(from);
        const urlAdjunto = await descargarMedia(media, `direct-${Date.now()}`);
        await prisma.mensajeDirecto.create({ data: {
          numeroRemitente: from.replace(/@c\.us|@g\.us/gi, ''),
          contenido: body || '[Archivo/Imagen]',
          tipo: mapTipo(type),
          urlAdjunto,
          remitente: 'cliente',
          whatsappMessageId,
          enviadoEn: new Date(parseInt(timestamp) * 1000)
        }});
        require('../services/socketService').notifyAllSupervisors('nuevo_mensaje_directo', {
          numeroRemitente: from, alias, contenido: body || '[Archivo/Imagen]', timestamp: new Date()
        });
        return;
      }
      return; // excluido normal
    }

    // Contacto (B9: aprovechar pushName)
    const { findOrCreateContact } = require('../services/contactService');
    const contacto = await findOrCreateContact(from, { nombre: pushName || undefined });

    // Ticket abierto
    const { findOrCreateOpenTicket } = require('../services/ticketService');
    const ticket = await findOrCreateOpenTicket(from);

    // Media entrante (B6)
    const urlAdjunto = await descargarMedia(media, `msg-${Date.now()}`);

    // Guardar mensaje (dedup por whatsappMessageId UNIQUE)
    const result = await prisma.mensaje.createMany({
      data: {
        ticketId: ticket.id,
        remitente: 'cliente',
        tecnicoId: null,
        contenido: body || `[Archivo: ${media?.filename || mapTipo(type)}]`,
        tipo: mapTipo(type),
        urlAdjunto,
        whatsappMessageId,
        enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
      },
      skipDuplicates: true
    });
    if (result.count === 0) return; // duplicado (reintento de OpenWA)

    // B8: push en vivo a los agentes
    require('../services/socketService').notifyAllTechs('nuevo_mensaje_ticket', {
      ticketId: ticket.id,
      numeroCliente: ticket.numeroCliente,
      contenido: body || '[Archivo/Imagen]',
      tipo: mapTipo(type),
      urlAdjunto,
      remitente: 'cliente',
      enviadoEn: new Date()
    });

  } catch (error) {
    console.error('❌ Error en webhook:', error);
    // No responder 500 aquí: ya se hizo el acuse; registrar y seguir
  }
};

/** B6: obtiene el archivo entrante (base64 inline o endpoint media de OpenWA). */
async function descargarMedia(media, prefijo) {
  if (!media || media.omitted) {
    // El archivo está disponible en:
    //   GET /api/sessions/:sessionId/messages/:chatId/:messageId/media
    // (requiere X-API-Key; chatId = from, messageId = data.id)
    return null; // se puede descargar bajo demanda con el endpoint media
  }
  if (media.data) {
    // base64 inline (≤ WEBHOOK_MEDIA_INLINE_MAX_BYTES, 1 MiB por defecto)
    const buffer = Buffer.from(media.data, 'base64');
    const ext = media.filename ? path.extname(media.filename) : '';
    const nombre = `${prefijo}-${Math.round(Math.random() * 1E9)}${ext}`;
    fs.writeFileSync(path.join(__dirname, '../../uploads', nombre), buffer);
    return `/uploads/${nombre}`;
  }
  return null;
}

/** Traduce el tipo de OpenWA al tipo del CRM. */
function mapTipo(t) {
  const mapa = { text: 'texto', image: 'imagen', video: 'video',
    audio: 'audio', voice: 'audio', document: 'documento', sticker: 'imagen' };
  return mapa[(t || '').toLowerCase()] || 'texto';
}
```

> **Nota B6 + media grande:** si el archivo viene como `{ omitted: true }`, conviene guardar una referencia y descargarlo bajo demanda con `GET /api/sessions/:sessionId/messages/:chatId/:messageId/media` (requiere `X-API-Key` de OpenWA). La lógica de `findOrCreateContact`, `findOrCreateOpenTicket`, auditoría de creación y `createMany` del CRM original se conserva.

### 7.4 `services/openwaService.js` (corregido: chatId + @c.us + DTO plano)

```javascript
const axios = require('axios');

class OpenWAService {
  constructor() {
    this.baseURL = process.env.OPENWA_API_URL || 'http://localhost:2785';
    this.apiKey = process.env.OPENWA_API_KEY;
    this.sessionId = process.env.OPENWA_INSTANCE_ID; // B4: debe ser el UUID real
  }

  /** Convierte un número (con o sin sufijo) en un chatId válido para OpenWA. */
  toChatId(numero) {
    const limpio = String(numero).replace(/@c\.us|@g\.us/gi, '').replace(/[\s\-\(\)]/g, '');
    return `${limpio}@c.us`; // B2: OpenWA exige el sufijo @c.us
  }

  /** B2: enviar texto. OpenWA espera { chatId, text }. */
  async sendMessage(to, text, options = {}) {
    const payload = { chatId: this.toChatId(to), text: text || '', ...options };
    const res = await axios.post(
      `${this.baseURL}/api/sessions/${this.sessionId}/messages/send-text`,
      payload,
      { headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    // Respuesta 201: { messageId, timestamp } — NO es confirmación de entrega
    return res.data;
  }

  /** B3: enviar media. OpenWA espera DTO plano { chatId, url, mimetype, filename, caption }. */
  async sendMedia(to, text, media) {
    const endpoint = media.mimetype?.startsWith('image/') ? 'send-image'
      : media.mimetype?.startsWith('video/') ? 'send-video'
      : media.mimetype?.startsWith('audio/') ? 'send-audio'
      : 'send-document';

    const payload = {
      chatId: this.toChatId(to),
      url: media.url,
      mimetype: media.mimetype,   // ← correcto: mimetype (no mimeType)
      filename: media.fileName,   // ← correcto: filename (no fileName)
      caption: text || undefined
    };

    const res = await axios.post(
      `${this.baseURL}/api/sessions/${this.sessionId}/messages/${endpoint}`,
      payload,
      { headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' }, timeout: 30000 }
    );
    return res.data;
  }
}

module.exports = new OpenWAService();
```

**En `controllers/ticketController.js`** (líneas ~500-513) y `directChatController.js`, cambiar la lectura del ID de respuesta de `openwaResponse?.id` a `openwaResponse?.messageId` (OpenWA devuelve `{ messageId, timestamp }`):

```javascript
whatsappMessageId = openwaResponse?.messageId || `msg_${Date.now()}`;
```

### 7.5 Push Socket.IO para mensajes de tickets (B8)

**`services/socketService.js`** — añadir un método de broadcast a técnicos (o reutilizar los existentes):

```javascript
/**
 * Notificar a todos los técnicos y supervisores conectados.
 * Más fiable que iterar connectedUsers: emite a todas las salas user_* conectadas.
 */
notifyAllTechs(event, data) {
  if (!this.io) { console.warn('⚠️ Socket.IO no inicializado'); return; }
  this.io.emit(event, data); // broadcast a todos los sockets autenticados
  console.log(`📨 Broadcast: ${event}`);
}
```

**`frontend/src/views/TicketsView.vue`** — suscribirse al evento para recargar en vivo:

```javascript
import socketService from '@/services/socketService';

onMounted(() => {
  fetchTickets(); fetchTicketCounts();
  socketService.on('nuevo_mensaje_ticket', () => { fetchTickets(); fetchTicketCounts(); });
  window.addEventListener('ticket-updated', fetchTickets);
});
onUnmounted(() => {
  socketService.off('nuevo_mensaje_ticket');
  window.removeEventListener('ticket-updated', fetchTickets);
});
```

### 7.6 Middleware de verificación HMAC (B5)

OpenWA firma el **body exacto** con HMAC-SHA256 y el `secret` del webhook; el header es `X-OpenWA-Signature: sha256=<hex>`.

```javascript
// backend/src/middlewares/verificarFirmaOpenWA.js
const crypto = require('crypto');

/**
 * Verifica X-OpenWA-Signature sobre el body crudo (Buffer).
 * Debe ejecutarse después de express.raw({ type: 'application/json' }).
 */
function verificarFirmaOpenWA(req, res, next) {
  const secreto = process.env.OPENWA_WEBHOOK_SECRET;
  if (!secreto) return next(); // secret no configurado → se acepta (solo desarrollo)

  const firma = req.headers['x-openwa-signature'];
  if (!firma) return res.status(401).json({ error: 'Firma ausente' });

  const esperado = `sha256=${crypto.createHmac('sha256', secreto).update(req.body).digest('hex')}`;

  try {
    const a = Buffer.from(firma);
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Firma inválida' });
    }
  } catch {
    return res.status(401).json({ error: 'Firma inválida' });
  }
  next();
}

module.exports = verificarFirmaOpenWA;
```

```javascript
// routes/webhook.js
const verificarFirmaOpenWA = require('../middlewares/verificarFirmaOpenWA');
router.post('/whatsapp', express.raw({ type: 'application/json' }), verificarFirmaOpenWA, webhookController.receiveWebhook);
```

### 7.7 (Opcional) Bridge Socket.IO hacia OpenWA para QR / estado de sesión

```javascript
// backend/src/services/openwaSocketService.js
const { io } = require('socket.io-client');
const socketService = require('./socketService');

let socket = null;

function conectar() {
  socket = io(`${process.env.OPENWA_API_URL}/events`, {
    auth: { apiKey: process.env.OPENWA_API_KEY },
  });

  socket.on('connect', () => {
    socket.emit('message', {
      type: 'subscribe',
      sessionId: process.env.OPENWA_INSTANCE_ID, // o '*' para todas
      events: ['session.qr', 'session.status'],
    });
  });

  socket.on('message', (msg) => {
    if (msg.type !== 'event') return;
    const { event, sessionId, data } = msg.payload;
    if (event === 'session.qr') {
      // data.qrCode → PNG data URL; notificar a supervisores para re-vincular
      socketService.notifyAllSupervisors('openwa_qr', { sessionId, qrCode: data.qrCode });
    }
    if (event === 'session.status') {
      socketService.notifyAllSupervisors('openwa_estado', { sessionId, status: data.status });
    }
  });
}

module.exports = { conectar };
// En app.js, tras inicializar el socket del CRM: require('./services/openwaSocketService').conectar();
```

---

## 8. Roadmap de Implementación

| # | Tarea | Esfuerzo | Prioridad |
|---|---|---|---|
| 1 | Levantar OpenWA (Docker) y verificar `/api/health` | Bajo | 🔴 Alta |
| 2 | Crear sesión de soporte, escanear QR y fijar `OPENWA_INSTANCE_ID` con el UUID real (B4) | Bajo | 🔴 Alta |
| 3 | Generar API Key dedicada (OPERATOR, scoped a la sesión) y guardarla en `backend/.env` | Bajo | 🔴 Alta |
| 4 | Registrar webhook en OpenWA hacia `https://<CRM>/api/webhooks/whatsapp` con secret HMAC | Bajo | 🔴 Alta |
| 5 | **B1**: corregir `webhookController` (parseo `data.*`) | Medio | 🔴 Alta |
| 6 | **B2/B3/B4**: corregir `openwaService` (chatId + @c.us + DTO plano + sesión real) | Bajo | 🔴 Alta |
| 7 | **B5**: middleware HMAC + `express.raw` en la ruta webhook | Bajo | 🔴 Alta |
| 8 | **B7**: `SSRF_ALLOWED_HOSTS` con el host del CRM en `.env` de OpenWA | Bajo | 🔴 Alta |
| 9 | **B6**: media entrante (base64 / endpoint media) | Medio | 🟡 Media |
| 10 | **B8**: push `nuevo_mensaje_ticket` por Socket.IO + suscripción en el frontend | Medio | 🟡 Media |
| 11 | **B9**: pasar `pushName` al contacto | Bajo | 🟢 Normal |
| 12 | **B10**: registrar `event`/`idempotencyKey`; handler de `session.status`/`session.qr` | Bajo | 🟢 Normal |
| 13 | UI de estado del número (QR de re-vinculación, sesión caída) para el admin | Medio | 🟢 Normal |
| 14 | Monitoreo + alertas (sesión caída, mensajes fallidos, `message.ack`) | Bajo | 🟢 Normal |
| 15 | Pruebas de punta a punta: tienda → ticket → respuesta → tienda | Medio | 🔴 Alta |

**Orden sugerido:** 1-4 (infra) → 5-8 (bloqueantes) → 9-10 (media y tiempo real) → 11-15 (endurecimiento y verificación).

---

## 9. Consideraciones Técnicas y Riesgos

### 9.1 Reconexiones y sesiones caídas

- **Motor:** `whatsapp-web.js` (menor riesgo de ban, ~300-500 MB RAM/sesión con Chromium). Para un número único de soporte es la elección correcta; el ban de un número de soporte es inaceptable. `baileys` pesa 30-80 MB pero es más detectable.
- **Auto-reinicio:** `AUTO_START_SESSIONS=true` re-vincula las sesiones autenticadas al arrancar.
- **Reconexión configurable:** `PATCH /api/sessions/:id/config` con `maxReconnectAttempts` y `reconnectBaseDelay`.
- **Watchdog:** el backend del CRM debería monitorear `session.status` (webhook o Socket.IO) y alertar si el número pasa a `disconnected`/`qr`. Guardar el QR de re-vinculación para mostrarlo al administrador.
- **Redundancia:** NO correr dos réplicas de OpenWA sobre la misma sesión (riesgo de logout forzado/ban).

### 9.2 Rate limits y bans de WhatsApp

- OpenWA trae rate limiting (`RATE_LIMIT_MEDIUM_*`, default 100 req/min) y send pacing anti-ban (`SEND_PACING_*`). Para soporte (respuestas a quien ya escribió) el riesgo es bajo; **actívalo**.
- `SIMULATE_TYPING=true` (default) hace más humano el envío.
- **No hacer cold blasts.** Si el CRM hace "avisos masivos" (p.ej. notificaciones a tiendas), úsalo con moderación y reconsidera el caso de uso.
- El `201` de `send-text` **no garantiza entrega real**. Para confirmar, suscribirse a `message.ack` (`sent` → `delivered` → `read`/`failed`).

### 9.3 Seguridad

- **API Key de OpenWA:** clave dedicada, rol **OPERATOR**, **scoped** a la sesión de soporte (`allowedSessions`) y con `allowedIps` = IP del backend del CRM. Se muestra **una vez** al crearla: guardarla en `backend/.env`.
- **Nunca** exponer OpenWA a internet sin reverse proxy TLS. Sin HTTPS la API Key viaja en claro.
- **HMAC:** verificar `X-OpenWA-Signature` siempre (B5). El `secret` del webhook debe ser largo (OpenWA exige ≥16 caracteres) y vivir en `backend/.env` como `OPENWA_WEBHOOK_SECRET`.
- **SSRF:** OpenWA bloquea por defecto webhooks y descargas de media hacia IPs privadas/loopback. Configurar `SSRF_ALLOWED_HOSTS` con el host del CRM (B7) y `TRUSTED_PROXIES` si hay proxy delante.
- **Dedup:** el `whatsapp_message_id` UNIQUE del CRM ya deduplica reintentos; adicionalmente se puede persistir `idempotencyKey` de OpenWA.
- **Frontend:** la API Key de OpenWA nunca debe llegar al navegador.

### 9.4 Escalabilidad y monitoreo

- **Escalado vertical primero:** una instancia única con multi-sesión cubre una cadena de ópticas. Horizontal no se recomienda hasta decenas de números.
- **PostgreSQL** en producción (`DATABASE_TYPE=postgres`, `DATABASE_SYNCHRONIZE=false`) + backups (incluir las credenciales de sesión de `data/sessions`).
- **Monitoreo:** `GET /api/health`, Prometheus en `/api/metrics` (con `METRICS_TOKEN`), logs JSON.
- **Recursos:** 1 instancia con `whatsapp-web.js` ≈ 500 MB RAM + Chromium. Ajustar `OPENWA_MEM_LIMIT`/`OPENWA_PIDS_LIMIT`.
- **El CRM ya usa `skipDuplicates` y `whatsappMessageId` único** → los reintentos de OpenWA son seguros en producción.

---

## 10. Recomendaciones Finales

- **No forkear OpenWA.** Personalizar en el CRM.
- **Despliegue:** Docker Compose con perfil `postgres` (+ Redis opcional). PM2 solo si bare-metal.
- **Número dedicado** de soporte; plan B (SMS/email/Cloud API oficial) para lo crítico.
- **Calentamiento:** los primeros días el número debe comportarse como humano.
- **Prueba E2E antes de producción:** enviar mensaje de prueba desde el dashboard de OpenWA → verificar ticket en el CRM → responder desde el CRM → confirmar entrega en la tienda.
- **Guardar en el repo del CRM la documentación** de las variables (`OPENWA_API_URL`, `OPENWA_API_KEY`, `OPENWA_INSTANCE_ID`, `OPENWA_WEBHOOK_SECRET`) y el procedimiento de re-vinculación de QR.
- **Priorizar los fixes B1-B8 antes de activar el webhook en producción.**

---

## 11. Información Pendiente del CRM

Con el análisis profundo del código, la mayoría de los datos quedaron resueltos. Solo falta confirmar lo siguiente para terminar la integración:

1. **`OPENWA_INSTANCE_ID` real:** el UUID de la sesión de soporte creada en OpenWA (paso 8.2).
2. **Host/IP del CRM** (donde corre `backend`, puerto 3000) para:
   - `SSRF_ALLOWED_HOSTS` en `.env` de OpenWA (media del agente).
   - `allowedIps` de la API Key de OpenWA.
   - `url` del webhook registrado (¿`http://localhost:3000` en dev o un host público/proxy en producción?).
3. **¿Los agentes envían media?** Si sí, además de `SSRF_ALLOWED_HOSTS` conviene decidir entre URL pública (`/uploads/...`) o base64.
4. **¿Se requiere confirmación de entrega?** Si se quiere saber cuándo llega el mensaje a la tienda, suscribirse a `message.ack`.
5. **Números con `@lid`:** si algún cliente aparece como `@lid` en lugar de número, activar `RESOLVE_LID_TO_PHONE=true` en OpenWA.
6. **¿Hay varias sesiones (varios números de soporte)?** El CRM asume una sola (`OPENWA_INSTANCE_ID`). Para multi-número habría que mapear sesión por tienda/región.

---

## Anexo A — Referencia rápida de la API de OpenWA

### Sesiones
| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/sessions` | Crear sesión |
| POST | `/api/sessions/:id/start` | Iniciar conexión WhatsApp |
| GET | `/api/sessions/:id/qr` | QR (PNG data URL) |
| GET | `/api/sessions/:id` | Estado de la sesión |
| POST | `/api/sessions/:id/stop` | Detener |
| POST | `/api/sessions/:id/logout` | Desvincular número |
| PATCH | `/api/sessions/:id/config` | Reintentos, auto-rechazo de llamadas |

### Mensajes (rol OPERATOR)
| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/sessions/:id/messages/send-text` | Texto (`chatId`, `text`) |
| POST | `/api/sessions/:id/messages/reply` | Responder citando un mensaje |
| POST | `/api/sessions/:id/messages/send-image` / `send-video` / `send-audio` / `send-document` / `send-sticker` | Media (`url` o `base64` + `mimetype`/`filename`) |
| POST | `/api/sessions/:id/messages/send-bulk` | Envío masivo (máx. 100) |
| GET | `/api/sessions/:id/messages?chatId=...` | Listar mensajes de un chat |
| GET | `/api/sessions/:id/messages/:chatId/:messageId/media` | Descargar media entrante (bytes) |

### Webhooks
| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/sessions/:id/webhooks` | Registrar webhook (`url`, `events[]`, `secret`) |
| GET | `/api/sessions/:id/webhooks` | Listar |
| POST | `/api/sessions/:id/webhooks/:id/test` | Probar envío |
| PUT / DELETE | `/api/sessions/:id/webhooks/:id` | Actualizar / eliminar |

### Auth
| Método | Endpoint | Uso |
|---|---|---|
| POST | `/api/auth/api-keys` | Crear API Key (requiere clave ADMIN, sin scope) |
| POST | `/api/auth/validate` | Validar clave propia |

### Eventos webhook/socket (resumen)
`message.received`, `message.sent`, `message.ack`, `message.revoked`, `message.reaction`, `message.edited`, `session.status`, `session.qr`, `session.authenticated`, `session.disconnected`, `session.restriction`, `call.received`, `status.received`, `group.*`.

---

## Anexo B — Correspondencia de campos OpenWA ↔ CRM

| OpenWA (`data.*`) | Tipo | CRM (destino) | Notas |
|---|---|---|---|
| `data.id` | string | `mensajes.whatsapp_message_id` | Dedup (UNIQUE) |
| `data.from` | `phone@c.us` | `tickets.numero_cliente`, `contactos.numero_telefono` | Con sufijo |
| `data.body` | string | `mensajes.contenido` | Fallback `[Archivo: ...]` si media |
| `data.type` | `text\|image\|video\|audio\|voice\|document\|sticker` | `mensajes.tipo` (`texto\|imagen\|video\|audio\|documento`) | Traducción en `mapTipo` |
| `data.timestamp` | unix s | `mensajes.enviado_en` | `new Date(ts*1000)` |
| `data.isGroup` | boolean | — (descartar) | RF-07.1 |
| `data.hasMedia` | boolean | `mensajes.url_adjunto` | |
| `data.media.data` | base64 | archivo en `/uploads/` | ≤ 1 MiB inline |
| `data.media.filename` | string | `mensajes.contenido` (fallback) | |
| `data.pushName` | string | `contactos.nombre` | B9 |
| `data.senderPhone` | string | (opcional) | Requiere `RESOLVE_LID_TO_PHONE=true` |
| `idempotencyKey` | string | (opcional, para dedup adicional) | Header `X-OpenWA-Idempotency-Key` |
| `deliveryId` | string | (trazabilidad) | Header `X-OpenWA-Delivery-Id` |
| `event` | string | routing del webhook | `message.received` → ticket |

### Envío (CRM → OpenWA)

| OpenWA (campo esperado) | Valor del CRM | Corrección aplicada |
|---|---|---|
| `chatId` | `ticket.contacto.numero_telefono + '@c.us'` | B2 |
| `text` | `contenido` | B2 |
| `url` / `base64` | `/uploads/...` o base64 | B7 (SSRF_ALLOWED_HOSTS) |
| `mimetype` | `archivo.mimetype` | B3 |
| `filename` | `archivo.originalname` | B3 |
| `caption` | `contenido` (texto del agente) | B3 |

> Fuente verificada en el código real: `backend/src/**` del CRM y `src/modules/*` + `docs/*` de OpenWA (v0.23.3). Contrato HMAC verificado en `src/modules/webhook/webhook-delivery.service.ts`.
