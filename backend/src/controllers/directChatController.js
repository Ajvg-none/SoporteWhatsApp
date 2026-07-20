// backend/src/controllers/directChatController.js

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
        },
        numeroExcluido: {
          select: { nombre: true, tipo: true }
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
        alias: m.numeroExcluido?.nombre || null,
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
 * GET /api/chat-directo/numbers
 * Obtener lista de números con chat privado (para el sidebar)
 * Solo supervisores
 */
exports.getDirectChatNumbers = async (req, res) => {
  try {
    // Obtener todos los números configurados como chat_privado
    const numbers = await prisma.numeroExcluido.findMany({
      where: {
        tipo: 'chat_privado'
      },
      select: {
        numero: true,
        nombre: true,
        creadoEn: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Para cada número, obtener el último mensaje
    const numbersWithLastMessage = await Promise.all(
      numbers.map(async (num) => {
        const lastMessage = await prisma.mensajeDirecto.findFirst({
          where: {
            numeroRemitente: num.numero
          },
          orderBy: {
            enviadoEn: 'desc'
          },
          select: {
            contenido: true,
            enviadoEn: true,
            remitente: true
          }
        });

        // Contar mensajes no leídos
        const unreadCount = await prisma.mensajeDirecto.count({
          where: {
            numeroRemitente: num.numero,
            remitente: 'cliente',
            leido: false
          }
        });

        return {
          numero: num.numero,
          nombre: num.nombre || num.numero,
          ultimoMensaje: lastMessage?.contenido || 'Sin mensajes',
          ultimoEnvio: lastMessage?.enviadoEn || num.creadoEn,
          remitenteUltimo: lastMessage?.remitente || null,
          noLeidos: unreadCount
        };
      })
    );

    // Ordenar por último mensaje (más reciente primero)
    numbersWithLastMessage.sort((a, b) => {
      return new Date(b.ultimoEnvio) - new Date(a.ultimoEnvio);
    });

    res.json({
      success: true,
      data: numbersWithLastMessage
    });
  } catch (error) {
    console.error('❌ Error en getDirectChatNumbers:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/chat-directo/no-leidos
 * Obtener cantidad de mensajes no leídos (para badge)
 * Solo supervisores
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
        },
        numeroExcluido: {
          select: { nombre: true }
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
    }

    // 3. Notificar a otros supervisores conectados
    const socketService = require('../services/socketService');
    socketService.notifyAllSupervisors('respuesta_directa_enviada', {
      numeroRemitente,
      alias: mensaje.numeroExcluido?.nombre || null,
      supervisorNombre: req.user.nombre,
      contenido,
      timestamp: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: {
        id: mensaje.id,
        numeroRemitente: mensaje.numeroRemitente,
        alias: mensaje.numeroExcluido?.nombre || null,
        contenido: mensaje.contenido,
        remitente: mensaje.remitente,
        supervisorNombre: mensaje.supervisor?.nombre,
        enviadoEn: mensaje.enviadoEn
      }
    });
  } catch (error) {
    console.error('❌ Error en sendDirectMessage:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/chat-directo/:numero
 * Obtener mensajes de un número específico
 */
exports.getMessagesByNumber = async (req, res) => {
  try {
    const { numero } = req.params;

    const mensajes = await prisma.mensajeDirecto.findMany({
      where: {
        numeroRemitente: numero
      },
      orderBy: {
        enviadoEn: 'asc'
      },
      include: {
        supervisor: {
          select: { id: true, nombre: true }
        },
        numeroExcluido: {
          select: { nombre: true }
        }
      }
    });

    // Marcar como leídos los mensajes de este número
    await prisma.mensajeDirecto.updateMany({
      where: {
        numeroRemitente: numero,
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
        alias: m.numeroExcluido?.nombre || null,
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
    console.error('❌ Error en getMessagesByNumber:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};