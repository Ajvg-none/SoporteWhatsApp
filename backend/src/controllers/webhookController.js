// backend/src/controllers/webhookController.js
const { PrismaClient } = require('@prisma/client');
const { findOrCreateContact } = require('../services/contactService');
const { findOrCreateOpenTicket } = require('../services/ticketService');
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

    // B10: solo procesamos mensajes entrantes (otros eventos se acusan y se ignoran)
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
      from,                  // Número del remitente "5215512345678@c.us"
      body,                  // Texto del mensaje
      type,                  // "text" | "image" | "video" | "audio" | "document" | ...
      timestamp,             // Fecha/hora del mensaje (timestamp Unix)
      hasMedia,
      media,                 // { mimetype, filename?, data?, omitted?, sizeBytes? } | null
      pushName               // Nombre visible del remitente
    } = data;

    if (!from || !whatsappMessageId) {
      console.error('❌ Faltan campos obligatorios: from o id');
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    console.log(`📱 Mensaje de: ${from}`);
    console.log(`💬 Contenido: ${body || '[Archivo/Imagen]'}`);
    console.log(`🆔 WhatsApp Message ID: ${whatsappMessageId}`);
    console.log(`📎 Tipo: ${type || 'texto'}`);

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
    const contacto = await findOrCreateContact(from, { nombre: pushName || undefined });
    console.log(`📇 Contacto: ${contacto.nombre || 'Sin nombre'} (${contacto.numero_telefono})`);

    // ============================================================
    // 4. CREAR/OBTENER TICKET ABIERTO (S1-B07)
    // ============================================================
    const ticket = await findOrCreateOpenTicket(from);
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
