// backend/src/controllers/webhookController.js
const { PrismaClient } = require('@prisma/client');
const { findOrCreateContact } = require('../services/contactService');
const { findOrCreateOpenTicket } = require('../services/ticketService');

const prisma = new PrismaClient();

/**
 * POST /api/webhooks/whatsapp
 * Recibe webhooks de OpenWA
 * Endpoint público (no requiere autenticación)
 */
exports.receiveWebhook = async (req, res) => {
  try {
    const message = req.body;
    
    console.log('\n📨 ========================================');
    console.log('📨 WEBHOOK RECIBIDO DE OPENWA');
    console.log('📨 ========================================');
    console.log(JSON.stringify(message, null, 2));
    console.log('📨 ========================================\n');
    
    // ============================================================
    // 1. REGLA DE DESCARTE: IGNORAR MENSAJES DE GRUPOS (RF-07.1)
    // ============================================================
    // Si el mensaje proviene de un grupo, lo ignoramos completamente
    // No se crea ticket, no se guarda mensaje, solo se responde 200
    if (message.isGroupMsg || message.chatId?.includes('@g.us')) {
      console.log('⚠️ Mensaje de grupo ignorado (RF-07.1)');
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Group message ignored' 
      });
    }
    
    // ============================================================
    // 2. EXTRAER DATOS DEL MENSAJE
    // ============================================================
    // NOTA: La estructura exacta depende de la documentación de OpenWA
    // Ajusta estos campos según el payload real de OpenWA
    
    const {
      from,           // Número del remitente (ej: "521234567890")
      body,           // Texto del mensaje
      type,           // Tipo: "texto", "imagen", "video", "audio", "documento"
      id: whatsappMessageId,  // ID único del mensaje en WhatsApp
      timestamp,      // Fecha/hora del mensaje (timestamp Unix)
      // Campos para archivos (si los hay)
      // mediaUrl,    // URL del archivo adjunto
      // mimeType,    // Tipo MIME del archivo
      // fileName     // Nombre del archivo
    } = message;
    
    // Validar que tengamos los campos obligatorios
    if (!from || !whatsappMessageId) {
      console.error('❌ Faltan campos obligatorios: from o id');
      return res.status(400).json({
        error: 'Faltan campos obligatorios'
      });
    }
    
    console.log(`📱 Mensaje de: ${from}`);
    console.log(`💬 Contenido: ${body || '[Archivo/Imagen]'}`);
    console.log(`🆔 WhatsApp Message ID: ${whatsappMessageId}`);
    console.log(`📎 Tipo: ${type || 'texto'}`);
    
    // ============================================================
    // 3. CREAR/OBTENER CONTACTO (S1-B06)
    // ============================================================
    const contacto = await findOrCreateContact(from);
    console.log(`📇 Contacto: ${contacto.nombre || 'Sin nombre'} (${contacto.numero_telefono})`);
    
    // ============================================================
    // 4. CREAR/OBTENER TICKET ABIERTO (S1-B07)
    // ============================================================
    const ticket = await findOrCreateOpenTicket(from);
    console.log(`🎫 Ticket #${ticket.id} - Estado: ${ticket.estado}`);

    // ============================================================
// 4.1 REGISTRAR AUDITORÍA EN CREACIÓN DE TICKET (S2-B08)
// ============================================================
// Solo registrar si el ticket es NUEVO (recién creado)
// NOTA: findOrCreateOpenTicket devuelve el ticket, pero no sabemos si es nuevo o existente.
// Para saberlo, podemos verificar si tiene mensajes previos o si su estado es 'nuevo' y no tiene asignado.
// Una forma más sencilla: comprobar si el ticket tiene algún mensaje asociado.

const mensajesExistentes = await prisma.mensaje.count({
  where: { ticketId: ticket.id }
});

// Si no tiene mensajes previos, es un ticket nuevo
if (mensajesExistentes === 0) {
  await prisma.auditoria.create({
    data: {
      ticketId: ticket.id,
      usuarioId: null, // No hay usuario técnico, es automático
      accion: 'creacion',
      detalle: {
        numero_cliente: from,
        creado_por: 'sistema_webhook'
      },
      fechaHora: new Date()
    }
  });
  console.log(`📝 Auditoría: Ticket #${ticket.id} creado automáticamente`);
}
    
    // ============================================================
    // 5. GUARDAR MENSAJE CON IDEMPOTENCIA (S1-B08)
    // ============================================================
    // Usamos createMany con skipDuplicates: true
    // Esto equivale a INSERT ... ON CONFLICT (whatsapp_message_id) DO NOTHING
    
    // Determinar el tipo de mensaje (asegurar que sea válido para la BD)
    // Valores permitidos: 'texto', 'imagen', 'video', 'audio', 'documento'
    let tipoMensaje = 'texto'; // valor por defecto
    
    if (type) {
      // Mapear tipos comunes de OpenWA a los valores de la BD
      const tipoMap = {
        'text': 'texto',
        'texto': 'texto',
        'image': 'imagen',
        'imagen': 'imagen',
        'video': 'video',
        'audio': 'audio',
        'document': 'documento',
        'documento': 'documento'
      };
      tipoMensaje = tipoMap[type.toLowerCase()] || 'texto';
    }
    
    const result = await prisma.mensaje.createMany({
      data: {
        ticketId: ticket.id,
        remitente: 'cliente',
        tecnicoId: null,
        contenido: body || '[Archivo multimedia]',
        tipo: tipoMensaje,
        urlAdjunto: null, // S1-B14 manejará archivos
        whatsappMessageId: whatsappMessageId,
        enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
      },
      skipDuplicates: true // ← Idempotencia garantizada
    });
    
    // ============================================================
    // 6. VERIFICAR SI EL MENSAJE ERA NUEVO O DUPLICADO
    // ============================================================
    if (result.count === 0) {
      console.log(`⏭️ Mensaje duplicado ignorado: ${whatsappMessageId}`);
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Mensaje duplicado ignorado',
        ticketId: ticket.id
      });
    }
    
    console.log(`✅ Mensaje guardado: ${whatsappMessageId}`);
    
    // ============================================================
    // 7. REGISTRAR EN AUDITORÍA (S2-B05 - Sprint 2)
    // ============================================================
    // Por ahora solo loggeamos, en el Sprint 2 implementaremos
    // el registro completo de auditoría
    console.log(`📝 Acción registrada: Mensaje recibido en ticket #${ticket.id}`);
    
    // ============================================================
    // 8. RESPONDER OK
    // ============================================================
    res.status(200).json({ 
      status: 'ok',
      message: 'Mensaje procesado correctamente',
      ticketId: ticket.id
    });
    
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    
    // Si es un error de Prisma, mostrar más detalles
    if (error.code) {
      console.error(`🔴 Código de error Prisma: ${error.code}`);
      console.error(`🔴 Meta: ${JSON.stringify(error.meta || {})}`);
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
};