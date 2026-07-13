// backend/src/controllers/webhookController.js
const { PrismaClient } = require('@prisma/client');
const { findOrCreateContact } = require('../services/contactService');
const { findOrCreateOpenTicket } = require('../services/ticketService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * POST /api/webhooks/whatsapp
 * Recibe webhooks de OpenWA
 * Endpoint público (no requiere autenticación)
 * ✅ S3-B04: Soporte para archivos adjuntos
 */
exports.receiveWebhook = async (req, res) => {
  try {
    const message = req.body;
    
    console.log('\n📨 ========================================');
    console.log('📨 WEBHOOK RECIBIDO');
    console.log('📨 ========================================');
    console.log(JSON.stringify(message, null, 2));
    console.log('📨 ========================================\n');
    
    // ============================================================
    // 1. REGLA DE DESCARTE: IGNORAR MENSAJES DE GRUPOS (RF-07.1)
    // ============================================================
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
      mediaUrl,       // URL del archivo adjunto (S3-B04)
      mimeType,       // Tipo MIME del archivo (S3-B04)
      fileName        // Nombre del archivo (S3-B04)
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
    // 4.1 REGISTRAR AUDITORÍA EN CREACIÓN DE TICKET (S2-B08) - CORREGIDO
    // ============================================================
    // Solo registrar si el ticket es NUEVO (recién creado)
    // Verificamos si tiene mensajes previos
    const mensajesExistentes = await prisma.mensaje.count({
      where: { ticketId: ticket.id }
    });

    // Si no tiene mensajes previos, es un ticket nuevo
    if (mensajesExistentes === 0) {
      // Buscar usuario "sistema" para auditoría
      const usuarioSistema = await prisma.usuario.findUnique({
        where: { email: 'sistema@empresa.com' }
      });

      if (usuarioSistema) {
        await prisma.auditoria.create({
          data: {
            ticketId: ticket.id,
            usuarioId: usuarioSistema.id,
            accion: 'creacion',
            detalle: {
              numero_cliente: from,
              creado_por: 'sistema_webhook'
            },
            fechaHora: new Date()
          }
        });
        console.log(`📝 Auditoría: Ticket #${ticket.id} creado automáticamente`);
      } else {
        console.log(`📝 Ticket #${ticket.id} creado (sin auditoría - usuario sistema no encontrado)`);
      }
    }
    
    // ============================================================
    // 5. DETERMINAR EL TIPO DE MENSAJE
    // ============================================================
    let tipoMensaje = 'texto';
    
    if (type) {
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

    // ============================================================
    // 5.1 DESCARGAR Y GUARDAR ARCHIVO (S3-B04) ⬅️ NUEVO
    // ============================================================
    let urlAdjunto = null;
    let nombreArchivoGuardado = null;

    if (mediaUrl && tipoMensaje !== 'texto') {
      try {
        console.log(`📥 Descargando archivo desde: ${mediaUrl}`);
        
        // Generar nombre único para el archivo
        const extension = fileName ? path.extname(fileName) : '';
        const nombreBase = `msg-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        nombreArchivoGuardado = `${nombreBase}${extension}`;
        
        // Ruta donde se guardará
        const uploadDir = path.join(__dirname, '../../uploads');
        const rutaCompleta = path.join(uploadDir, nombreArchivoGuardado);
        
        // Descargar el archivo
        const response = await axios({
          method: 'GET',
          url: mediaUrl,
          responseType: 'stream',
          timeout: 30000 // 30 segundos
        });
        
        // Crear directorio si no existe
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Guardar el archivo
        const writer = fs.createWriteStream(rutaCompleta);
        response.data.pipe(writer);
        
        // Esperar a que termine la escritura
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        // URL pública del archivo
        urlAdjunto = `/uploads/${nombreArchivoGuardado}`;
        
        console.log(`✅ Archivo guardado: ${urlAdjunto}`);
        console.log(`📁 Tamaño: ${response.headers['content-length'] || 'desconocido'} bytes`);
        
      } catch (error) {
        console.error('❌ Error descargando archivo:', error.message);
        // No detenemos el flujo, el mensaje se guarda sin archivo
      }
    }

    // ============================================================
    // 6. GUARDAR MENSAJE EN BASE DE DATOS
    // ============================================================
    const result = await prisma.mensaje.createMany({
      data: {
        ticketId: ticket.id,
        remitente: 'cliente',
        tecnicoId: null,
        contenido: body || `[Archivo: ${fileName || tipoMensaje}]`,
        tipo: tipoMensaje,
        urlAdjunto: urlAdjunto, // ← S3-B04: Ahora guarda la URL
        whatsappMessageId: whatsappMessageId,
        enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
      },
      skipDuplicates: true
    });
    
    if (result.count === 0) {
      console.log(`⏭️ Mensaje duplicado ignorado: ${whatsappMessageId}`);
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Mensaje duplicado ignorado',
        ticketId: ticket.id
      });
    }
    
    console.log(`✅ Mensaje guardado: ${whatsappMessageId}`);
    if (urlAdjunto) {
      console.log(`📎 Con archivo adjunto: ${urlAdjunto}`);
    }
    
    // ============================================================
    // 7. RESPONDER OK
    // ============================================================
    res.status(200).json({ 
      status: 'ok',
      message: 'Mensaje procesado correctamente',
      ticketId: ticket.id,
      archivo: urlAdjunto ? { url: urlAdjunto, nombre: nombreArchivoGuardado } : null
    });
    
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    
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