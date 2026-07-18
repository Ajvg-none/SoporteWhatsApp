const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/chat-directo
 * Obtener todos los mensajes directos (ordenados por fecha)
 * Solo supervisores
 */
exports.getDirectMessages = async (req, res) => {
  try {
    const mensajes = await prisma.mensajeDirecto.findMany({
      orderBy: { enviadoEn: 'asc' },
      include: {
        supervisor: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Marcar como leídos los mensajes del cliente
    await prisma.mensajeDirecto.updateMany({
      where: {
        remitente: 'cliente',
        leido: false
      },
      data: { leido: true }
    });

    res.json({
      success: true,
      data: mensajes.map(m => ({
        id: m.id,
        numeroRemitente: m.numeroRemitente,
        contenido: m.contenido,
        tipo: m.tipo,
        urlAdjunto: m.urlAdjunto,
        remitente: m.remitente,
        supervisorNombre: m.supervisor?.nombre || null,
        enviadoEn: m.enviadoEn,
        leido: m.leido
      }))
    });
  } catch (error) {
    console.error('❌ Error en getDirectMessages:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/chat-directo
 * Enviar respuesta desde un supervisor al número de chat privado
 * Body: { numeroRemitente, contenido }
 */
exports.sendDirectMessage = async (req, res) => {
  try {
    const { numeroRemitente, contenido } = req.body;
    const supervisorId = req.user.id;

    if (!numeroRemitente || !contenido) {
      return res.status(400).json({
        success: false,
        error: 'Número y contenido son obligatorios'
      });
    }

    // 1. Guardar en BD
    const mensaje = await prisma.mensajeDirecto.create({
      data: {
        numeroRemitente,
        contenido,
        tipo: 'texto',
        remitente: 'supervisor',
        supervisorId,
        enviadoEn: new Date()
      },
      include: {
        supervisor: {
          select: { id: true, nombre: true }
        }
      }
    });

    // 2. Enviar vía OpenWA al número del cliente
    const openwaService = require('../services/openwaService');
    try {
      await openwaService.sendMessage(numeroRemitente, contenido);
      console.log(`✅ Respuesta enviada a ${numeroRemitente} vía OpenWA`);
    } catch (error) {
      console.error('❌ Error enviando mensaje por OpenWA:', error.message);
      // No fallamos la operación, el mensaje queda guardado en BD
    }

    // 3. Notificar a otros supervisores conectados
    const socketService = require('../services/socketService');
    socketService.notifyAllSupervisors('respuesta_directa_enviada', {
      supervisorNombre: req.user.nombre,
      contenido,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: {
        id: mensaje.id,
        contenido: mensaje.contenido,
        remitente: mensaje.remitente,
        supervisorNombre: mensaje.supervisor?.nombre,
        enviadoEn: mensaje.enviadoEn
      }
    });
  } catch (error) {
    console.error(' Error en sendDirectMessage:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/chat-directo/no-leidos
 * Obtener cantidad de mensajes no leídos (para badge)
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.mensajeDirecto.count({
      where: {
        remitente: 'cliente',
        leido: false
      }
    });

    res.json({
      success: true,
      data: { noLeidos: count }
    });
  } catch (error) {
    console.error('❌ Error en getUnreadCount:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};