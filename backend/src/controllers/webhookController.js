// backend/src/controllers/webhookController.js
const { PrismaClient } = require('@prisma/client');
const { findOrCreateContact } = require('../services/contactService');
const { findOrCreateOpenTicket, resolverIdentidad } = require('../services/ticketService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Traduce el tipo de mensaje de OpenWA al tipo del CRM.
 * OpenWA: text | image | video | audio | voice | document | sticker | ...
 * CRM:    texto | imagen | video | audio | documento
 */
function mapTipo(t) {
  const mapa = {
    text: 'texto',
    image: 'imagen',
    video: 'video',
    audio: 'audio',
    voice: 'audio',
    document: 'documento',
    sticker: 'imagen'
  };
  return mapa[(t || '').toLowerCase()] || 'texto';
}

/**
 * Guarda la media entrante de OpenWA en /uploads/.
 * - Si viene como base64 inline (data.media.data, ≤ WEBHOOK_MEDIA_INLINE_MAX_BYTES),
 *   se escribe directo en disco.
 * - Si viene como { omitted: true, sizeBytes } (archivo grande), se intenta descargar
 *   con el endpoint de media de OpenWA:
 *     GET /api/sessions/:sessionId/messages/:chatId/:messageId/media
 *   Si falla, se devuelve null (el archivo queda disponible bajo demanda).
 * @param {object|null} media - data.media del webhook
 * @param {string} sessionId - sessionId del envelope
 * @param {string} chatId - data.from
 * @param {string} messageId - data.id
 * @param {string} prefijo - prefijo del nombre de archivo ("msg-"/"direct-")
 */
async function descargarMedia(media, sessionId, chatId, messageId, prefijo) {
  if (!media) return null;

  // 1. Base64 inline
  if (media.data) {
    try {
      const buffer = Buffer.from(media.data, 'base64');
      const extension = media.filename ? path.extname(media.filename) : '';
      const nombre = `${prefijo}-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, nombre), buffer);
      return `/uploads/${nombre}`;
    } catch (error) {
      console.error('❌ Error guardando media base64:', error.message);
      return null;
    }
  }

  // 2. Archivo omitido (grande): descargar con el endpoint de media de OpenWA
  if (media.omitted || media.sizeBytes) {
    try {
      const { baseURL, apiKey } = require('../services/openwaService');
      const url = `${baseURL}/api/sessions/${encodeURIComponent(sessionId)}/messages/${encodeURIComponent(chatId)}/${encodeURIComponent(messageId)}/media`;
      const response = await axios({ method: 'GET', url, responseType: 'arraybuffer', timeout: 30000, headers: { 'X-API-Key': apiKey } });

      const extension = media.filename ? path.extname(media.filename) : '';
      const nombre = `${prefijo}-${Date.now()}-${Math.round(Math.random() * 1E9)}${extension}`;
      const uploadDir = path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, nombre), Buffer.from(response.data));
      return `/uploads/${nombre}`;
    } catch (error) {
      console.error('❌ Error descargando media de OpenWA:', error.message);
      return null;
    }
  }

  return null;
}

/**
 * POST /api/webhooks/whatsapp
 * Recibe webhooks de OpenWA.
 * Endpoint público (no requiere autenticación); la seguridad la da la firma HMAC.
 * El body llega como Buffer (express.raw). OpenWA envía un envelope:
 *   { event, timestamp, sessionId, idempotencyKey, deliveryId, data: {...} }
 */
exports.receiveWebhook = async (req, res) => {
  try {
    // 0. El body llega como Buffer (express.raw). Parsear a objeto.
    const rawBody = req.body;
    const payload = JSON.parse(rawBody.toString('utf8'));

    console.log('\n📨 ========================================');
    console.log('📨 WEBHOOK RECIBIDO');
    console.log('📨 ========================================');
    console.log(JSON.stringify(payload, null, 2));
    console.log('📨 ========================================\n');

    const { event, sessionId, idempotencyKey, data } = payload;

    // B10: procesamos mensajes entrantes (message.received) y, para el historial,
    // también los salientes desde la propia cuenta (message.sent con fromMe),
    // p. ej. cuando el operador responde desde el teléfono fuera del sistema.
    if (event === 'message.sent' && data?.fromMe) {
      return procesarMensajeSaliente(data, res);
    }
    // Otros eventos se acusan y se ignoran
    if (event !== 'message.received') {
      return res.status(200).json({ status: 'ok', event });
    }

    // ============================================================
    // 1. REGLA DE DESCARTE: IGNORAR MENSAJES DE GRUPOS (RF-07.1)
    // ============================================================
    if (data?.isGroup || data?.from?.includes('@g.us')) {
      console.log('⚠️ Mensaje de grupo ignorado (RF-07.1)');
      return res.status(200).json({ status: 'ok', message: 'Group message ignored' });
    }

    // ============================================================
    // 2. EXTRAER DATOS DEL MENSAJE (envelope anidado)
    // ============================================================
    const {
      id: whatsappMessageId, // ID único del mensaje en WhatsApp
      from,                  // Número del remitente "5215512345678@c.us" (o "...@lid" si es privacy-id)
      body,                  // Texto del mensaje
      type,                  // "text" | "image" | "video" | "audio" | "document" | ...
      timestamp,             // Fecha/hora del mensaje (timestamp Unix)
      hasMedia,
      media,                 // { mimetype, filename?, data?, omitted?, sizeBytes? } | null
      pushName,              // Nombre visible del remitente
      isLidSender,           // true cuando el remitente viene como @lid (privacy-id)
      senderPhone,           // Nº real (dígitos MSISDN) sólo para remitentes @lid (nc RESOLVE_LID_TO_PHONE)
      contact                // Datos de contacto sincronizados (id, number, name, pushName, ...)
    } = data;

    if (!from || !whatsappMessageId) {
      console.error('❌ Faltan campos obligatorios: from o id');
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    console.log(`📱 Mensaje de: ${from}`);
    console.log(`💬 Contenido: ${body || '[Archivo/Imagen]'}`);
    console.log(`🆔 WhatsApp Message ID: ${whatsappMessageId}`);
    console.log(`📎 Tipo: ${type || 'texto'}`);
    if (isLidSender) console.log(`🆔💰 Remitente @lid detectado. senderPhone: ${senderPhone ?? 'null'}`);

    // ============================================================
    // 2.5 REGLA DE EXCLUSIÓN / CHAT PRIVADO
    // ============================================================
    const { esNumeroExcluido, obtenerTipoExclusion, obtenerAliasNumero } = require('./excludedNumberController');

    const numeroExcluido = await esNumeroExcluido(from);

    if (numeroExcluido) {
      const tipo = await obtenerTipoExclusion(from);

      if (tipo === 'chat_privado') {
        console.log(`💬 Chat privado detectado: ${from}`);

        const alias = await obtenerAliasNumero(from);
        const tipoMensaje = mapTipo(type);
        const urlAdjunto = await descargarMedia(media, sessionId, from, whatsappMessageId, 'direct');

        await prisma.mensajeDirecto.create({
          data: {
            numeroRemitente: from.replace(/@c\.us|@g\.us/gi, ''),
            contenido: body || '[Archivo/Imagen]',
            tipo: tipoMensaje,
            urlAdjunto: urlAdjunto,
            remitente: 'cliente',
            whatsappMessageId: whatsappMessageId,
            enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
          }
        });

        const socketService = require('../services/socketService');
        socketService.notifyAllSupervisors('nuevo_mensaje_directo', {
          numeroRemitente: from,
          alias: alias,
          contenido: body || '[Archivo/Imagen]',
          timestamp: new Date()
        });

        console.log(`✅ Mensaje directo guardado y supervisores notificados`);

        return res.status(200).json({ status: 'ok', message: 'Direct chat message saved', reason: 'chat_privado' });
      }

      console.log(`🚫 Mensaje ignorado: ${from} está en la lista de números excluidos`);
      return res.status(200).json({ status: 'ok', message: 'Message ignored (excluded number)', reason: 'excluded_number' });
    }

    // ============================================================
    // 3. CREAR/OBTENER CONTACTO (S1-B06) — B9: aprovechar pushName
    // ============================================================
    // Resolver identidad: si el remitente es @lid, numeroVisible será el nº real
    // (senderPhone) y lid será el @lid de retorno.
    const { numeroVisible, lid } = resolverIdentidad(from, senderPhone);

    const nombreContacto = pushName || contact?.name || contact?.pushName || undefined;

    const contacto = await findOrCreateContact(numeroVisible, { nombre: nombreContacto, lid });
    console.log(`📇 Contacto: ${contacto.nombre || 'Sin nombre'} (${contacto.numero_telefono})`);

    // ============================================================
    // 4. CREAR/OBTENER TICKET ABIERTO (S1-B07)
    // ============================================================
    const ticket = await findOrCreateOpenTicket(numeroVisible, { lid });
    console.log(`🎫 Ticket #${ticket.id} - Estado: ${ticket.estado}`);

    // ============================================================
    // 4.1 REGISTRAR AUDITORÍA EN CREACIÓN DE TICKET
    // ============================================================
    const mensajesExistentes = await prisma.mensaje.count({ where: { ticketId: ticket.id } });

    if (mensajesExistentes === 0) {
      const usuarioSistema = await prisma.usuario.findUnique({ where: { email: 'sistema@empresa.com' } });

      if (usuarioSistema) {
        await prisma.auditoria.create({
          data: {
            ticketId: ticket.id,
            usuarioId: usuarioSistema.id,
            accion: 'creacion',
            detalle: { numero_cliente: from, creado_por: 'sistema_webhook' },
            fechaHora: new Date()
          }
        });
        console.log(`📝 Auditoría: Ticket #${ticket.id} creado automáticamente`);
      }
    }

    // ============================================================
    // 5. DETERMINAR EL TIPO DE MENSAJE Y GUARDAR MEDIA (B6)
    // ============================================================
    const tipoMensaje = mapTipo(type);
    const urlAdjunto = await descargarMedia(media, sessionId, from, whatsappMessageId, 'msg');

    // ============================================================
    // 6. GUARDAR MENSAJE EN BASE DE DATOS (dedup por whatsappMessageId UNIQUE)
    // ============================================================
    const result = await prisma.mensaje.createMany({
      data: {
        ticketId: ticket.id,
        remitente: 'cliente',
        tecnicoId: null,
        contenido: body || `[Archivo: ${media?.filename || tipoMensaje}]`,
        tipo: tipoMensaje,
        urlAdjunto: urlAdjunto,
        whatsappMessageId: whatsappMessageId,
        enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
      },
      skipDuplicates: true
    });

    if (result.count === 0) {
      console.log(`⏭️ Mensaje duplicado ignorado: ${whatsappMessageId}`);
      return res.status(200).json({ status: 'ok', message: 'Mensaje duplicado ignorado', ticketId: ticket.id });
    }

    console.log(`✅ Mensaje guardado: ${whatsappMessageId}`);
    if (urlAdjunto) console.log(`📎 Con archivo adjunto: ${urlAdjunto}`);

    // ============================================================
    // 7. NOTIFICAR EN VIVO A LOS AGENTES (B8)
    // ============================================================
    const socketService = require('../services/socketService');
    socketService.broadcast('nuevo_mensaje_ticket', {
      ticketId: ticket.id,
      numeroCliente: ticket.numeroCliente,
      contenido: body || '[Archivo/Imagen]',
      tipo: tipoMensaje,
      urlAdjunto,
      remitente: 'cliente',
      enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
    });

    // ============================================================
    // 8. RESPONDER OK (OpenWA reintenta solo si responde 5xx)
    // ============================================================
    res.status(200).json({
      status: 'ok',
      message: 'Mensaje procesado correctamente',
      ticketId: ticket.id,
      archivo: urlAdjunto ? { url: urlAdjunto } : null
    });

  } catch (error) {
    console.error('❌ Error en webhook:', error);

    if (error.code) {
      console.error(`🔴 Código de error Prisma: ${error.code}`);
      console.error(`🔴 Meta: ${JSON.stringify(error.meta || {})}`);
    }

    // 500 para que OpenWA reintente (el dedup por whatsappMessageId evita duplicados)
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};

/**
 * Procesa un mensaje SALIENTE de la propia cuenta (evento `message.sent`, fromMe).
 * Ocurre cuando el operador responde DESDE el teléfono conectado (fuera del sistema)
 * o desde cualquier dispositivo vinculado. `data` es un IncomingMessage de OpenWA:
 *   - from       → mi número (la cuenta)
 *   - to/chatId  → el destinatario con quien converso (el cliente)
 *   - body, type, timestamp, id (waMessageId), contact.pushName
 *
 * Objetivo: reflejar el mensaje en el ticket (o chat privado) correspondiente, con
 * dedup por `whatsappMessageId` para no duplicar los envíos hechos desde el sistema
 * (que también generan un echo message.sent).
 */
async function procesarMensajeSaliente(data, res) {
  try {
    const whatsappMessageId = data.id;
    const from = data.from;       // mi número
    const to = data.to || data.chatId; // el cliente destinatario
    const body = data.body || '';
    const timestamp = data.timestamp;

    console.log(`\n📨 ========================================`);
    console.log(`📨 MENSAJE SALIENTE (message.sent) → ${to}`);
    console.log(`📨 ========================================`);

    // 1. Descartar no-conversación
    const destino = String(to || '').trim();
    if (data.isGroup || destino.includes('@g.us') || data.isStatusBroadcast) {
      console.log('⚠️ Mensaje saliente a grupo/estado ignorado');
      return res.status(200).json({ status: 'ok', message: 'Non-conversation outgoing ignored' });
    }

    // 2. Normalizar identidad (el "cliente" es el destinatario `to`)
    const { numeroVisible, lid } = resolverIdentidad(destino, null);

    // 3. Exclusión / chat privado
    const { esNumeroExcluido, obtenerTipoExclusion, obtenerAliasNumero } = require('./excludedNumberController');
    const numeroExcluido = await esNumeroExcluido(destino);

    if (numeroExcluido) {
      const tipo = await obtenerTipoExclusion(destino);

      if (tipo === 'chat_privado') {
        // Dedup: si ya se guardó (envío del sistema), ignorar el echo
        const existente = await prisma.mensajeDirecto.findUnique({
          where: { whatsappMessageId }
        });
        if (existente) {
          console.log(`⏭️ Echo saliente chat-privado duplicado ignorado: ${whatsappMessageId}`);
          return res.status(200).json({ status: 'ok', message: 'Dup direct ignored' });
        }

        const numeroRemitente = numeroVisible.replace(/@c\.us|@g\.us|@lid/gi, '');
        const alias = await obtenerAliasNumero(destino);
        const tipoMensaje = mapTipo(data.type);

        await prisma.mensajeDirecto.create({
          data: {
            numeroRemitente,
            contenido: body || `[Archivo: ${tipoMensaje}]`,
            tipo: tipoMensaje,
            remitente: 'supervisor',
            supervisorId: null,
            whatsappMessageId,
            enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
          }
        });

        const socketService = require('../services/socketService');
        socketService.notifyAllSupervisors('respuesta_directa_enviada', {
          numeroRemitente,
          alias: alias || null,
          supervisorNombre: 'Cuenta WhatsApp',
          contenido: body,
          enviado: true,
          error: null,
          timestamp: new Date()
        });

        console.log(`✅ Mensaje saliente guardado en chat privado: ${numeroRemitente}`);
        return res.status(200).json({ status: 'ok', message: 'Direct chat updated', reason: 'chat_privado' });
      }

      console.log(`🚫 Mensaje saliente ignorado: ${destino} está excluido`);
      return res.status(200).json({ status: 'ok', message: 'Excluded outgoing ignored', reason: 'excluded_number' });
    }

    // 4. Tickets
    const mensajeExistente = await prisma.mensaje.findUnique({
      where: { whatsappMessageId }
    });
    if (mensajeExistente) {
      console.log(`⏭️ Echo saliente duplicado ignorado: ${whatsappMessageId}`);
      return res.status(200).json({ status: 'ok', message: 'Mensaje duplicado ignorado', ticketId: mensajeExistente.ticketId });
    }

    // Garantizar que exista el contacto (Ticket.numeroCliente es FK a Contacto).
    // Mismo comportamiento que el flujo entrante (message.received).
    const nombreContacto = data.contact?.pushName || data.contact?.name || undefined;
    await findOrCreateContact(numeroVisible, { nombre: nombreContacto, lid });

    // Obtener/crear ticket abierto (si no existe uno, se crea — ver decisión del usuario)
    const { findOrCreateOpenTicket } = require('../services/ticketService');
    const ticket = await findOrCreateOpenTicket(numeroVisible, { lid });

    // Registrar auditoría si el ticket se acabó de crear por este saliente
    const mensajesExistentes = await prisma.mensaje.count({ where: { ticketId: ticket.id } });
    if (mensajesExistentes === 0) {
      const usuarioSistema = await prisma.usuario.findUnique({ where: { email: 'sistema@empresa.com' } });
      if (usuarioSistema) {
        await prisma.auditoria.create({
          data: {
            ticketId: ticket.id,
            usuarioId: usuarioSistema.id,
            accion: 'creacion',
            detalle: { numero_cliente: numeroVisible, creado_por: 'saliente_telefono' },
            fechaHora: new Date()
          }
        });
      }
    }

    // Guardar mensaje saliente (remitente 'tecnico', técnico desconocido → NULL)
    const tipoMensaje = mapTipo(data.type);
    const result = await prisma.mensaje.createMany({
      data: {
        ticketId: ticket.id,
        remitente: 'tecnico',
        tecnicoId: null,
        contenido: body || `[Archivo: ${data.media?.filename || tipoMensaje}]`,
        tipo: tipoMensaje,
        whatsappMessageId,
        enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
      },
      skipDuplicates: true
    });

    if (result.count === 0) {
      console.log(`⏭️ Mensaje saliente duplicado ignorado: ${whatsappMessageId}`);
      return res.status(200).json({ status: 'ok', message: 'Mensaje duplicado ignorado', ticketId: ticket.id });
    }

    console.log(`✅ Mensaje saliente guardado en ticket #${ticket.id}`);

    // Notificar en vivo
    const socketService = require('../services/socketService');
    socketService.broadcast('nuevo_mensaje_ticket', {
      ticketId: ticket.id,
      numeroCliente: ticket.numeroCliente,
      contenido: body || '[Archivo/Imagen]',
      tipo: tipoMensaje,
      urlAdjunto: null,
      remitente: 'tecnico',
      tecnicoNombre: null,
      enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
    });

    return res.status(200).json({
      status: 'ok',
      message: 'Outgoing message processed',
      ticketId: ticket.id
    });
  } catch (error) {
    console.error('❌ Error procesando mensaje saliente:', error);
    if (error.code) {
      console.error(`🔴 Código de error Prisma: ${error.code}`);
      console.error(`🔴 Meta: ${JSON.stringify(error.meta || {})}`);
    }
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
