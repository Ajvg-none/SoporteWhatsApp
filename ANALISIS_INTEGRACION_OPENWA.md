# ANÁLISIS DE INTEGRACIÓN: OPENWA ↔ CRM WEB (Helpdesk de Soporte)

> **Proyectos analizados:**
> - **OpenWA** v0.23.3 — Open Source WhatsApp API Gateway (`C:\Users\Sistemas\Desktop\OpenWA`)
> - **SoporteWhatsApp** (CRM) — Backend Express 5 + Prisma + Socket.IO, Frontend Vue 3 (`C:\Users\Sistemas\Desktop\SoporteWhatsApp`)
> **Fecha del análisis:** 2026-08-25 (rev. 3 — incluye incidente 400 RecipientUnreachable)
> **Autor:** Departamento de Sistemas — Arquitectura de Integración

---

## 1. Resumen Ejecutivo

Este documento define la arquitectura para conectar **OpenWA** (gateway de WhatsApp) con el **CRM web propio (SoporteWhatsApp)**, donde cada mensaje entrante de una tienda genera un *ticket* que un agente de soporte resuelve.

**Conclusión principal (revisión v3 con análisis del CRM y del incidente 400):**

1. **OpenWA ya es un gateway completo**: sesiones multi-número, envío/recepción (texto y media), QR, API Keys, webhooks con **HMAC + reintentos + dedup**, Socket.IO, dashboard y Swagger. **No requiere modificar su código fuente.**

2. **El CRM ya tiene un esqueleto de integración**, pero contenía **errores bloqueantes** que impedían que funcionara con la API real de OpenWA:
   - El webhook del CRM leía el payload en **formato plano** (`from`, `body`, `mediaUrl`) cuando OpenWA entrega un **envelope anidado** (`data.from`, `data.body`, `data.media`).
   - El servicio de envío mandaba `{ to, text }` cuando OpenWA exige `{ chatId, text }`, sin el sufijo `@c.us`.
   - El envío de media usaba nombres de campo incorrectos (`mimeType`/`fileName` vs `mimetype`/`filename`).
   - Usaba un `OPENWA_INSTANCE_ID` por defecto (`'default'`) que no corresponde a una sesión real (UUID).
   - El webhook era **público sin verificación HMAC**.
   - No existía push Socket.IO para mensajes de tickets.

3. **Todos los puntos anteriores están corregidos** (ver §7). Además se documenta el **incidente de envío con HTTP 400** (`RecipientUnreachableError`): OpenWA responde 400 cuando `whatsapp-web.js` no puede resolver el número de destino (sonda `getNumberId` → null). **No es un fallo del payload del CRM**; el destino no es resoluble por WhatsApp Web. Se añadieron retry para estados transitorios, soporte de `@lid` y un flujo de "envío fallido" visible para el agente (§7.8).

**Canal recomendado:** **Webhook HTTP con firma HMAC** como ingesta principal (garantías de entrega ya resueltas por OpenWA), **Socket.IO del CRM** para el frontend, y opcionalmente el **Socket.IO nativo de OpenWA** (`/events`) para QR y estado de sesión.

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
├── routes/webhook.js               # POST /api/webhooks/whatsapp (público, firma HMAC)
├── middlewares/verificarFirmaOpenWA.js  # Verificación HMAC X-OpenWA-Signature
├── controllers/webhookController.js# Receptor del webhook de OpenWA
├── controllers/ticketController.js # sendMessage → openwaService (envío agente)
├── controllers/directChatController.js # sendDirectMessage → openwaService
├── controllers/excludedNumberController.js # esNumeroExcluido/obtenerTipoExclusion/obtenerAliasNumero
├── services/openwaService.js       # Cliente HTTP hacia OpenWA (chatId, retry, media)
├── services/socketService.js       # Socket.IO del CRM (JWT en handshake.auth.token)
├── services/ticketService.js       # findOrCreateOpenTicket + ESTADOS_ABIERTOS
└── services/contactService.js      # findOrCreateContact

frontend/src/
├── services/socketService.js       # Cliente Socket.IO
└── views/TicketsView.vue           # Escucha nuevo_mensaje_ticket
└── views/TicketDetailView.vue      # Escucha nuevo_mensaje_ticket (mismo ticket)
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

### 3.4 Estado actual de la integración (lo que ya existe)

| Pieza | Archivo | Estado |
|---|---|---|
| Variables de entorno | `backend/.env` (`OPENWA_API_URL`, `OPENWA_API_KEY`, `OPENWA_INSTANCE_ID`) | ⚠️ Fijar `OPENWA_INSTANCE_ID` con el UUID real de la sesión |
| Webhook receptor | `routes/webhook.js` + `controllers/webhookController.js` | ✅ Envelope `data.*` + firma HMAC + media + push |
| Envío de texto | `services/openwaService.js` → `sendMessage` | ✅ `{ chatId, text }` + `@c.us` + retry 400/429 |
| Envío de media | `services/openwaService.js` → `sendMedia` | ✅ DTO plano `{ chatId, url, mimetype, filename, caption }` |
| Reglas de negocio (excluidos, chat privado, ticket) | `webhookController.js` + `ticketService.js` + `excludedNumberController.js` | ✅ Lógica correcta y reutilizable |
| Socket.IO del CRM | `services/socketService.js` | ✅ `nuevo_mensaje_ticket` + `envio_fallido` |
| Descarga de media entrante | `webhookController.js` | ✅ base64 inline + endpoint media bajo demanda |

---

## 4. Brechas de Integración (corregidas)

| # | Severidad | Archivo | Problema | Fix aplicado |
|---|---|---|---|---|
| B1 | 🔴 CRÍTICA | `webhookController.js` | Payload plano vs envelope anidado `data.*` | ✅ Parseo `data.*` (§7.3) |
| B2 | 🔴 CRÍTICA | `openwaService.js` | `{ to, text }` sin `@c.us` | ✅ `{ chatId, text }` + `toChatId()` (§7.4) |
| B3 | 🔴 ALTA | `openwaService.js` | Media `mimeType`/`fileName` anidado | ✅ DTO plano `mimetype`/`filename` (§7.4) |
| B4 | 🔴 ALTA | `openwaService.js` | `OPENWA_INSTANCE_ID='default'` vs UUID real | ✅ Usar UUID real de la sesión (operativo) |
| B5 | 🟠 ALTA | `routes/webhook.js` | Webhook público sin HMAC | ✅ `express.raw` + `verificarFirmaOpenWA` (§7.6) |
| B6 | 🟠 ALTA | `webhookController.js` | Descarga `mediaUrl` inexistente | ✅ `data.media.data` base64 / endpoint media (§7.3) |
| B7 | 🟠 MEDIA | `.env` de OpenWA | SSRF bloquea media del CRM | ✅ `SSRF_ALLOWED_HOSTS` (operativo) |
| B8 | 🟡 MEDIA | `socketService.js` + frontend | Sin push para tickets | ✅ `nuevo_mensaje_ticket` + suscripción (§7.5) |
| B9 | 🟢 BAJA | `webhookController.js` | `pushName` ignorado | ✅ Nombre del contacto (§7.3) |
| B10 | 🟢 BAJA | `webhookController.js` | Solo `message.received`, sin envelope | ✅ Routing por `event` + acuse (§7.3) |
| B11 | 🔴 ALTA | Envío (incidente real) | OpenWA responde `400 RecipientUnreachableError` cuando `whatsapp-web.js` no puede resolver el número (`getNumberId` → null). No es fallo del payload del CRM | ✅ Retry 400/429 + `@lid` en `toChatId` + marcado `[NO ENVIADO]` + socket `envio_fallido` (§7.8) |

---

## 5. Arquitectura de Integración Propuesta

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
  │  routes/webhook.js  →  express.raw → verificarFirmaOpenWA → receiveWebhook│
  │      │ 1. Verificar X-OpenWA-Signature (HMAC)              (§7.6)        │
  │      │ 2. Leer req.body.data.* (from, body, type, isGroup) (§7.3)        │
  │      │ 3. Dedup por whatsappMessageId (UNIQUE)                           │
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
  │      │ → openwaService.sendMessage({ chatId: num+'@c.us', text })        │
  │      │ → si OK: esperando + 'nuevo_mensaje_ticket'                       │
  │      │ → si 400/429: retry; si falla: 'envio_fallido' + [NO ENVIADO]     │
  └───────────────┬─────────────────────────────────────────────────────────┘
                  │
                  │  5) POST /api/sessions/{sessionId}/messages/send-text
                  │     X-API-Key, { chatId: "5215512345678@c.us", text }
                  ▼
  ┌────────────────────────┐
  │        OpenWA          │──► WhatsApp ──► Tienda
  └────────────────────────┘
```

### 5.2 Justificación de la tecnología de comunicación

| Opción | Ventajas | Desventajas | Veredicto |
|---|---|---|---|
| **Webhook HTTP + HMAC** (recomendado) | Entrega garantizada (outbox + reintentos + dedup + idempotencia), firma HMAC, cola BullMQ opcional, tolerante a caídas del CRM | Una petición HTTP por evento; el CRM debe ser alcanzable desde OpenWA | ✅ **Ingesta principal** |
| Socket.IO nativo de OpenWA (`/events`) | Baja latencia, push bidireccional, QR/presencia/tipeo en vivo | Fire-and-forget: eventos perdidos si el backend cae; sin dedup | ✅ **Complemento** (QR, estado de sesión) |
| REST API + polling | Simple | Latencia, carga innecesaria | ❌ Solo operaciones puntuales |

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

**Media entrante** (`data.media`): si `hasMedia=true`, `media = { mimetype, filename?, data? (base64), omitted?, sizeBytes? }`. El `data` (base64) solo viene hasta el tope `WEBHOOK_MEDIA_INLINE_MAX_BYTES` (default **1 MiB**); por encima llega `{ omitted: true, sizeBytes }` y el archivo se obtiene con `GET /api/sessions/:sessionId/messages/:chatId/:messageId/media`.

---

## 6. Componentes a Crear / Corregir (por archivo del CRM)

| # | Archivo | Acción | Esfuerzo |
|---|---|---|---|
| 1 | `services/openwaService.js` | ✅ `sendMessage` (chatId + @c.us), `sendMedia` (DTO plano), retry 400/429, `toChatId` @lid | Bajo |
| 2 | `routes/webhook.js` | ✅ `express.raw({ type: 'application/json' })` + firma HMAC | Bajo |
| 3 | `middlewares/verificarFirmaOpenWA.js` | ✅ Creado (HMAC-SHA256 sobre body Buffer) | Bajo |
| 4 | `controllers/webhookController.js` | ✅ Parseo anidado `data.*`, media base64/endpoint, dedup, `pushName`, push Socket.IO | Medio |
| 5 | `controllers/ticketController.js` | ✅ `openwaResponse?.messageId`, marcado `[NO ENVIADO]`, `envio_fallido`, no avanzar a `esperando` en fallo | Bajo |
| 6 | `controllers/directChatController.js` | ✅ `enviado:false` + error en respuesta, prefijo en fallo | Bajo |
| 7 | `services/socketService.js` | ✅ Método `broadcast()` | Bajo |
| 8 | `frontend/src/views/TicketsView.vue` | ✅ Suscripción `nuevo_mensaje_ticket` | Medio |
| 9 | `frontend/src/views/TicketDetailView.vue` | ✅ Suscripción `nuevo_mensaje_ticket` + alert `enviado:false` | Medio |
| 10 | `frontend/src/views/DirectChatView.vue` | ✅ Alert `enviado:false` | Bajo |
| 11 | `backend/.env` | ⏳ Fijar `OPENWA_INSTANCE_ID` (UUID real) + `OPENWA_WEBHOOK_SECRET` | Bajo |
| 12 | `.env` de OpenWA | ⏳ `AUTO_START_SESSIONS=true`, `SSRF_ALLOWED_HOSTS`, `RESOLVE_LID_TO_PHONE=true` | Bajo |
| 13 | (Opcional) `services/openwaSocketService.js` | Bridge Socket.IO hacia `/events` de OpenWA (QR/estado) | Medio |

---

## 7. Snippets de Código Base (Corregidos)

> Los ejemplos corrigen las brechas B1–B11 y usan la API real de OpenWA (v0.23.3). Base URL: `http://localhost:2785/api`. Auth: header `X-API-Key`.

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
const verificarFirmaOpenWA = require('../middlewares/verificarFirmaOpenWA');

// Raw body (Buffer) para poder verificar la firma sobre el body EXACTO de OpenWA
router.post('/whatsapp', express.raw({ type: 'application/json' }), verificarFirmaOpenWA, webhookController.receiveWebhook);

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
        const urlAdjunto = await descargarMedia(media, sessionId, from, whatsappMessageId, 'direct');
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
    const urlAdjunto = await descargarMedia(media, sessionId, from, whatsappMessageId, 'msg');

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
    require('../services/socketService').broadcast('nuevo_mensaje_ticket', {
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
```

> **Nota B6 + media grande:** si el archivo viene como `{ omitted: true }`, conviene guardar una referencia y descargarlo bajo demanda con `GET /api/sessions/:sessionId/messages/:chatId/:messageId/media` (requiere `X-API-Key` de OpenWA).

### 7.4 `services/openwaService.js` (corregido: chatId + @c.us + DTO plano + retry + @lid)

```javascript
const axios = require('axios');

// Estados transitorios que conviene reintentar: un 400 RecipientUnreachable
// (resolución de número intermitente en whatsapp-web.js, getNumberId rate-limited)
// y un 429 (send pacing / throttler). Los 5xx se EXCLUYEN: en wwjs un error puede
// lanzarse DESPUÉS de que el mensaje ya salió a la red, y reintentar ahí duplicaría.
const ESTADOS_REINTENTABLES = [400, 429];

async function conReintentos(fn, intentos = 3, baseDelayMs = 300) {
  let ultimoError;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (error) {
      ultimoError = error;
      const status = error.response?.status;
      if (!ESTADOS_REINTENTABLES.includes(status) || i === intentos - 1) throw error;
      const delay = baseDelayMs * Math.pow(2, i);
      console.log(`🔁 Reintentando envío a OpenWA (intento ${i + 2}/${intentos}, HTTP ${status}) en ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw ultimoError;
}

class OpenWAService {
  constructor() {
    this.baseURL = process.env.OPENWA_API_URL || 'http://localhost:2785';
    this.apiKey = process.env.OPENWA_API_KEY;
    this.sessionId = process.env.OPENWA_INSTANCE_ID; // B4: debe ser el UUID real
  }

  /** B11: si el número viene como @lid (remitente migrado), conserva @lid. */
  toChatId(numero) {
    const s = String(numero || '').trim();
    const esLid = /@lid/i.test(s);
    const sufijo = esLid ? '@lid' : '@c.us';
    const limpio = s.replace(/@c\.us|@g\.us|@lid/gi, '').replace(/[\s\-\(\)]/g, '').trim();
    return `${limpio}${sufijo}`;
  }

  /** B2: enviar texto. OpenWA espera { chatId, text }. */
  async sendMessage(to, text, options = {}) {
    const payload = { chatId: this.toChatId(to), text: text || '', ...options };
    const response = await conReintentos(() => axios({
      method: 'POST',
      url: `${this.baseURL}/api/sessions/${this.sessionId}/messages/send-text`,
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      data: payload,
      timeout: 30000
    }));
    // Respuesta 201: { messageId, timestamp } — NO es confirmación de entrega
    return response.data;
  }

  /** B3: enviar media. OpenWA espera DTO plano { chatId, url, mimetype, filename, caption }. */
  async sendMedia(to, text, media) {
    const endpoint = media.mimeType?.startsWith('image/') ? 'send-image'
      : media.mimeType?.startsWith('video/') ? 'send-video'
      : media.mimeType?.startsWith('audio/') ? 'send-audio'
      : 'send-document';

    const payload = {
      chatId: this.toChatId(to),
      url: media.url,
      mimetype: media.mimeType,
      filename: media.fileName,
      caption: text || undefined
    };

    const response = await conReintentos(() => axios({
      method: 'POST',
      url: `${this.baseURL}/api/sessions/${this.sessionId}/messages/${endpoint}`,
      headers: { 'X-API-Key': this.apiKey, 'Content-Type': 'application/json' },
      data: payload,
      timeout: 30000
    }));
    return response.data;
  }
}

module.exports = new OpenWAService();
```

**En `controllers/ticketController.js` y `directChatController.js`:** leer el ID de respuesta con `openwaResponse?.messageId` (OpenWA devuelve `{ messageId, timestamp }`). Ver §7.8 para el flujo de fallo.

### 7.5 Push Socket.IO para mensajes de tickets (B8)

**`services/socketService.js`** — broadcast a todos los sockets autenticados:

```javascript
broadcast(event, data) {
  if (!this.io) { console.warn('⚠️ Socket.IO no inicializado'); return; }
  this.io.emit(event, data);
  console.log(`📨 Broadcast: ${event}`);
}
```

**`frontend/src/views/TicketsView.vue`** — suscripción en vivo:

```javascript
onMounted(() => {
  fetchTickets(); fetchTicketCounts();
  if (!socketService.isConnected()) socketService.connect();
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

function verificarFirmaOpenWA(req, res, next) {
  const secreto = process.env.OPENWA_WEBHOOK_SECRET;
  if (!secreto) { console.warn('⚠️ OPENWA_WEBHOOK_SECRET no configurado'); return next(); }

  const firma = req.headers['x-openwa-signature'];
  if (!firma) return res.status(401).json({ error: 'Firma ausente' });

  const esperado = `sha256=${crypto.createHmac('sha256', secreto).update(req.body).digest('hex')}`;
  try {
    const a = Buffer.from(String(firma));
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

**En `app.js`:** el parser raw debe registrarse **antes** del `express.json()` global:

```javascript
app.use('/api/webhooks/whatsapp', express.raw({ type: 'application/json' }));
app.use(express.json());
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

### 7.8 Incidente: HTTP 400 `RecipientUnreachableError` en el envío

**Síntoma (log real del CRM):**

```
📤 Enviando mensaje a OpenWA: 23540749303955@c.us
📝 Texto: JLKKJL
❌ Error enviando mensaje a OpenWA: Request failed with status code 400
```

**Causa raíz (trazada en el código de OpenWA v0.23.3):**

El 400 es `RecipientUnreachableError` (`src/common/errors/recipient-unreachable.error.ts`):

> *"WhatsApp could not resolve the recipient `<chatId>`. Either the number is not on WhatsApp, or this session has no existing chat with it — message it once from the phone, then retry."*

Mecanismo exacto (engine `whatsapp-web.js`):

1. El CRM envía `{ chatId, text }` (payload correcto).
2. `wwebjs-messaging.ts → resolveSendId()` llama a `client.getNumberId(chatId)` (sonda de existencia, **rate-limited e intermitente**).
3. `getNumberId` devuelve **null** → se usa el `chatId` original.
4. `client.sendMessage()` lanza `No LID for user` (error plano del bundle de WhatsApp Web).
5. `sendResolved()` re-resuelve; sigue null → lanza `RecipientUnreachableError` → **HTTP 400**.

**Causas posibles** (documentadas en OpenWA):
- El número **no es una cuenta WhatsApp registrada** (el caso `23540749303955` es sospechoso: 14 dígitos iniciando `2354`, sin prefijo estándar; probablemente número de prueba/virtual).
- **Migración a `@lid`**: el contacto ya no es direccionable por `@c.us` y `getNumberId` no lo resuelve (whatsapp-web.js#3834). Con `RESOLVE_LID_TO_PHONE=true` el webhook puede traer el número real en `senderPhone`.

**Correcciones aplicadas en el CRM (B11):**

| Capa | Cambio | Archivo |
|---|---|---|
| Envío | `toChatId()` conserva `@lid` (si el remitente llegó como lid, se envía al lid directo, evitando la sonda `getNumberId`) | `openwaService.js` |
| Envío | Retry con backoff (3 intentos) para **400 y 429** (transitorios). Los **5xx no se reintentan** (riesgo de duplicar envíos ya en la red) | `openwaService.js` |
| Envío | En fallo real: el mensaje se guarda con prefijo `[NO ENVIADO]`, **no** se avanza a `esperando`, se emite `envio_fallido` por Socket.IO y la respuesta incluye `enviado: false` + `error` | `ticketController.js`, `directChatController.js` |
| Frontend | Alert al agente si `enviado === false` | `TicketDetailView.vue`, `DirectChatView.vue` |

**Acciones operativas para confirmar el caso real:**
1. Verificar que el número de destino sea una **cuenta WhatsApp real y registrada**. Probar con un número real que haya escrito a la línea de soporte (no con números virtuales/de prueba).
2. Prevalidar antes de enviar con `GET /api/sessions/:sessionId/contacts/check/:number` (existe en `contact.controller.ts`).
3. Si el contacto llegó como `@lid`, activar `RESOLVE_LID_TO_PHONE=true` en `.env` de OpenWA y confirmar sesión `ready`.
4. Si persiste con un número real, evaluar motor **Baileys** (mejor resolución JID/LID; mayor riesgo de ban, requiere re-vincular).

---

## 8. Roadmap de Implementación

| # | Tarea | Esfuerzo | Prioridad |
|---|---|---|---|
| 1 | Levantar OpenWA (Docker) y verificar `/api/health` | Bajo | 🔴 Alta |
| 2 | Crear sesión de soporte, escanear QR y fijar `OPENWA_INSTANCE_ID` con el UUID real (B4) | Bajo | 🔴 Alta |
| 3 | Generar API Key dedicada (OPERATOR, scoped a la sesión) y guardarla en `backend/.env` | Bajo | 🔴 Alta |
| 4 | Registrar webhook en OpenWA hacia `https://<CRM>/api/webhooks/whatsapp` con secret HMAC | Bajo | 🔴 Alta |
| 5 | **B1**: corregir `webhookController` (parseo `data.*`) | ✅ Hecho | 🔴 Alta |
| 6 | **B2/B3/B4**: corregir `openwaService` (chatId + @c.us + DTO plano + sesión real) | ✅ Hecho | 🔴 Alta |
| 7 | **B5**: middleware HMAC + `express.raw` en la ruta webhook | ✅ Hecho | 🔴 Alta |
| 8 | **B7**: `SSRF_ALLOWED_HOSTS` con el host del CRM en `.env` de OpenWA | Bajo | 🔴 Alta |
| 9 | **B6**: media entrante (base64 / endpoint media) | ✅ Hecho | 🟡 Media |
| 10 | **B8**: push `nuevo_mensaje_ticket` por Socket.IO + suscripción en el frontend | ✅ Hecho | 🟡 Media |
| 11 | **B9**: pasar `pushName` al contacto | ✅ Hecho | 🟢 Normal |
| 12 | **B10**: registrar `event`/`idempotencyKey`; handler de `session.status`/`session.qr` | ✅ Hecho | 🟢 Normal |
| 13 | **B11**: retry 400/429 + `@lid` + marcado `[NO ENVIADO]` + `envio_fallido` | ✅ Hecho | 🔴 Alta |
| 14 | UI de estado del número (QR de re-vinculación, sesión caída) para el admin | Medio | 🟢 Normal |
| 15 | Monitoreo + alertas (sesión caída, mensajes fallidos, `message.ack`) | Bajo | 🟢 Normal |
| 16 | Pruebas de punta a punta: tienda → ticket → respuesta → tienda (con número REAL) | Medio | 🔴 Alta |

---

## 9. Consideraciones Técnicas y Riesgos

### 9.1 Reconexiones y sesiones caídas

- **Motor:** `whatsapp-web.js` (menor riesgo de ban, ~300-500 MB RAM/sesión con Chromium). Para un número único de soporte es la elección correcta. `baileys` pesa 30-80 MB pero es más detectable.
- **Auto-reinicio:** `AUTO_START_SESSIONS=true` re-vincula las sesiones autenticadas al arrancar.
- **Reconexión configurable:** `PATCH /api/sessions/:id/config` con `maxReconnectAttempts` y `reconnectBaseDelay`.
- **Watchdog:** monitorear `session.status` (webhook o Socket.IO) y alertar si el número pasa a `disconnected`/`qr`.
- **Redundancia:** NO correr dos réplicas de OpenWA sobre la misma sesión (riesgo de logout forzado/ban).

### 9.2 Rate limits, bans y resolución de destinatarios

- OpenWA trae rate limiting (`RATE_LIMIT_MEDIUM_*`, default 100 req/min) y send pacing anti-ban (`SEND_PACING_*`).
- `SIMULATE_TYPING=true` (default) hace más humano el envío.
- **No hacer cold blasts.** Para soporte (respuestas a quien ya escribió) el riesgo es bajo.
- El `201` de `send-text` **no garantiza entrega real**. Para confirmar, suscribirse a `message.ack`.
- **Resolución de destinatarios (B11):** `getNumberId` de whatsapp-web.js es rate-limited e intermitente. El retry en el CRM mitiga el caso transitorio; un número realmente no registrado o migrado a `@lid` seguirá dando 400 y debe tratarse como "destino no resuelto" (marcado `[NO ENVIADO]`), no como error silencioso.

### 9.3 Seguridad

- **API Key de OpenWA:** clave dedicada, rol **OPERATOR**, **scoped** a la sesión de soporte (`allowedSessions`) y con `allowedIps` = IP del backend del CRM. Se muestra **una vez** al crearla.
- **Nunca** exponer OpenWA a internet sin reverse proxy TLS.
- **HMAC:** verificar `X-OpenWA-Signature` siempre (B5). `OPENWA_WEBHOOK_SECRET` en `backend/.env`.
- **SSRF:** `SSRF_ALLOWED_HOSTS` con el host del CRM (B7) y `TRUSTED_PROXIES` si hay proxy delante.
- **Dedup:** `whatsapp_message_id` UNIQUE del CRM deduplica reintentos; adicionalmente se puede persistir `idempotencyKey`.
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
- **Prueba E2E antes de producción con un número WhatsApp REAL**: tienda → ticket → respuesta → tienda.
- **Guardar en el repo del CRM la documentación** de las variables (`OPENWA_API_URL`, `OPENWA_API_KEY`, `OPENWA_INSTANCE_ID`, `OPENWA_WEBHOOK_SECRET`) y el procedimiento de re-vinculación de QR.
- **Sincronizar la DB**: la tabla `numeros_excluidos` de la DB real está desincronizada con `schema.prisma` (faltan `nombre`, `tipo`, `creado_por`). Ejecutar `npx prisma db push` en `backend/` antes de probar el flujo del webhook (ver §11.7).

---

## 11. Información Pendiente del CRM

1. **`OPENWA_INSTANCE_ID` real:** el UUID de la sesión de soporte creada en OpenWA (paso 8.2).
2. **Host/IP del CRM** (donde corre `backend`, puerto 3000) para:
   - `SSRF_ALLOWED_HOSTS` en `.env` de OpenWA (media del agente).
   - `allowedIps` de la API Key de OpenWA.
   - `url` del webhook registrado (¿`http://localhost:3000` en dev o un host público/proxy en producción?).
3. **¿Los agentes envían media?** Si sí, decidir entre URL pública (`/uploads/...`) o base64.
4. **¿Se requiere confirmación de entrega?** Suscribirse a `message.ack` si se quiere saber cuándo llega el mensaje a la tienda.
5. **Números con `@lid`:** si algún cliente aparece como `@lid`, activar `RESOLVE_LID_TO_PHONE=true` en OpenWA (ver B11, §7.8).
6. **¿Hay varias sesiones (varios números de soporte)?** El CRM asume una sola (`OPENWA_INSTANCE_ID`).
7. **Desincronización de la DB:** `numeros_excluidos` real no tiene `nombre/tipo/creado_por`. Correr `cd backend && npx prisma db push` (puede requerir limpiar/backfillear la columna `creado_por` NOT NULL si la tabla tiene filas).

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

### Contactos
| Método | Endpoint | Uso |
|---|---|---|
| GET | `/api/sessions/:id/contacts/check/:number` | Validar si un número está en WhatsApp (preenvío) |

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
| `data.from` | `phone@c.us` o `@lid` | `tickets.numero_cliente`, `contactos.numero_telefono` | Con sufijo |
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
| `chatId` | `ticket.contacto.numero_telefono + '@c.us'` (o `@lid`) | B2 / B11 |
| `text` | `contenido` | B2 |
| `url` / `base64` | `/uploads/...` o base64 | B7 (SSRF_ALLOWED_HOSTS) |
| `mimetype` | `archivo.mimetype` | B3 |
| `filename` | `archivo.originalname` | B3 |
| `caption` | `contenido` (texto del agente) | B3 |

> Fuente verificada en el código real: `backend/src/**` del CRM y `src/modules/*` + `src/engine/*` + `docs/*` de OpenWA (v0.23.3). Contrato HMAC y error 400 verificado en `src/modules/webhook/webhook-delivery.service.ts` y `src/common/errors/recipient-unreachable.error.ts`.
