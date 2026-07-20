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
    const {
      from,           // Número del remitente
      body,           // Texto del mensaje
      type,           // Tipo: "texto", "imagen", "video", "audio", "documento"
      id: whatsappMessageId,  // ID único del mensaje en WhatsApp
      timestamp,      // Fecha/hora del mensaje (timestamp Unix)
      mediaUrl,       // URL del archivo adjunto
      mimeType,       // Tipo MIME del archivo
      fileName        // Nombre del archivo
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
    // 2.5 REGLA DE EXCLUSIÓN / CHAT PRIVADO
    // ============================================================
    const { esNumeroExcluido, obtenerTipoExclusion, obtenerAliasNumero } = require('./excludedNumberController');

    const numeroExcluido = await esNumeroExcluido(from);

    if (numeroExcluido) {
      // Verificar si es un chat privado o simplemente excluido
      const tipo = await obtenerTipoExclusion(from);
      
      if (tipo === 'chat_privado') {
        console.log(`💬 Chat privado detectado: ${from}`);
        
        // Obtener el alias del número
        const alias = await obtenerAliasNumero(from);
        
        // Determinar el tipo de mensaje
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

        // Si hay archivo, descargarlo y guardarlo
        let urlAdjunto = null;
        if (mediaUrl && tipoMensaje !== 'texto') {
          try {
            console.log(`📥 Descargando archivo desde: ${mediaUrl}`);
            
            const extension = fileName ? path.extname(fileName) : '';
            const nombreBase = `direct-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
            const nombreArchivoGuardado = `${nombreBase}${extension}`;
            
            const uploadDir = path.join(__dirname, '../../uploads');
            const rutaCompleta = path.join(uploadDir, nombreArchivoGuardado);
            
            const response = await axios({
              method: 'GET',
              url: mediaUrl,
              responseType: 'stream',
              timeout: 30000
            });
            
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const writer = fs.createWriteStream(rutaCompleta);
            response.data.pipe(writer);
            
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });
            
            urlAdjunto = `/uploads/${nombreArchivoGuardado}`;
            console.log(`✅ Archivo guardado: ${urlAdjunto}`);
            
          } catch (error) {
            console.error('❌ Error descargando archivo:', error.message);
          }
        }
        
        // Guardar el mensaje en la tabla de mensajes directos
        await prisma.mensajeDirecto.create({
          data: {
            numeroRemitente: from.replace(/@c\.us|@g\.us/gi, ''),
            contenido: body || '[Archivo/Imagen]',
            tipo: tipoMensaje || 'texto',
            urlAdjunto: urlAdjunto,
            remitente: 'cliente',
            whatsappMessageId: whatsappMessageId,
            enviadoEn: timestamp ? new Date(parseInt(timestamp) * 1000) : new Date()
          }
        });
        
        // Notificar a todos los supervisores conectados
        const socketService = require('../services/socketService');
        socketService.notifyAllSupervisors('nuevo_mensaje_directo', {
          numeroRemitente: from,
          alias: alias,
          contenido: body || '[Archivo/Imagen]',
          timestamp: new Date()
        });
        
        console.log(`✅ Mensaje directo guardado y supervisores notificados`);
        
        return res.status(200).json({
          status: 'ok',
          message: 'Direct chat message saved',
          reason: 'chat_privado'
        });
      }
      
      // Si es tipo "excluido" normal, simplemente ignorar
      console.log(`🚫 Mensaje ignorado: ${from} está en la lista de números excluidos`);
      return res.status(200).json({
        status: 'ok',
        message: 'Message ignored (excluded number)',
        reason: 'excluded_number'
      });
    }
    
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
    // 4.1 REGISTRAR AUDITORÍA EN CREACIÓN DE TICKET
    // ============================================================
    const mensajesExistentes = await prisma.mensaje.count({
      where: { ticketId: ticket.id }
    });

    if (mensajesExistentes === 0) {
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
    // 5.1 DESCARGAR Y GUARDAR ARCHIVO
    // ============================================================
    let urlAdjunto = null;
    let nombreArchivoGuardado = null;

    if (mediaUrl && tipoMensaje !== 'texto') {
      try {
        console.log(`📥 Descargando archivo desde: ${mediaUrl}`);
        
        const extension = fileName ? path.extname(fileName) : '';
        const nombreBase = `msg-${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        nombreArchivoGuardado = `${nombreBase}${extension}`;
        
        const uploadDir = path.join(__dirname, '../../uploads');
        const rutaCompleta = path.join(uploadDir, nombreArchivoGuardado);
        
        const response = await axios({
          method: 'GET',
          url: mediaUrl,
          responseType: 'stream',
          timeout: 30000
        });
        
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        const writer = fs.createWriteStream(rutaCompleta);
        response.data.pipe(writer);
        
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });
        
        urlAdjunto = `/uploads/${nombreArchivoGuardado}`;
        console.log(`✅ Archivo guardado: ${urlAdjunto}`);
        
      } catch (error) {
        console.error('❌ Error descargando archivo:', error.message);
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
        urlAdjunto: urlAdjunto,
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