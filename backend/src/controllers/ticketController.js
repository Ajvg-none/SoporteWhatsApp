const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/tickets
 * Listado paginado de tickets con filtros y búsqueda
 * Query params: estado, buscar, page, limit, solo_cerrados
 * ✅ S3-B01: Búsqueda por número, nombre o sucursal
 */
exports.getTickets = async (req, res) => {
  try {
    // 1. Extraer y validar parámetros de consulta
    const {
      estado,
      buscar,
      page = 1,
      limit = 20,
      solo_cerrados = 'false',
      mis_tickets = 'false' // ← NUEVO: filtro para tickets del técnico actual
    } = req.query;

    const userId = req.user.id; // ← NUEVO: obtener ID del usuario autenticado

    // Validar page y limit
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // 2. Construir el filtro WHERE
    const where = {};

    // ✅ NUEVO: Filtro para "Mis Tickets"
    if (mis_tickets === 'true') {
      where.tecnicoAsignadoId = userId;
      // Solo mostrar tickets activos (no cerrados)
      where.estado = {
        in: ['asignado', 'esperando', 'resuelto']
      };
    }
    // Filtro por estado (solo si no es "mis_tickets")
    else if (estado) {
      where.estado = estado.toLowerCase();
    } else if (solo_cerrados === 'false') {
      // Por defecto, excluir tickets cerrados
      where.estado = {
        not: 'cerrado'
      };
    }

    // ✅ S3-B01: Filtro de búsqueda mejorado (número, nombre o sucursal)
    if (buscar && buscar.trim() !== '') {
      const searchTerm = buscar.trim();
      where.OR = [
        {
          numeroCliente: {
            contains: searchTerm,
            mode: 'insensitive'
          }
        },
        {
          contacto: {
            nombre: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        },
        {
          contacto: {
            sucursal: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        }
      ];
    }

    // 3. Ejecutar consultas en paralelo (tickets + total)
    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: {
          creadoEn: 'desc'
        },
        include: {
          contacto: {
            select: {
              numero_telefono: true,
              nombre: true,
              sucursal: true
            }
          },
          tecnicoAsignado: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          },
          solicitudTransferenciaTecnico: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        }
      }),
      prisma.ticket.count({ where })
    ]);

    // 4. Calcular paginación
    const totalPages = Math.ceil(total / limitNum);

    // 5. Respuesta
    res.json({
      success: true,
      data: tickets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    console.error('❌ Error en getTickets:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};
/**
 * GET /api/tickets/:id
 * Detalle completo de un ticket
 */
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Obtener el ticket con toda su información relacionada
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: {
        // Datos del contacto
        contacto: {
          select: {
            numero_telefono: true,
            nombre: true,
            sucursal: true,
            creadoEn: true
          }
        },
        // Datos del técnico asignado
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        },
        // Mensajes del historial (ordenados por fecha)
        mensajes: {
          orderBy: {
            enviadoEn: 'asc'
          },
          include: {
            tecnico: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        // Auditoría del ticket
        auditoria: {
          orderBy: {
            fechaHora: 'asc'
          },
          include: {
            usuario: {
              select: {
                id: true,
                nombre: true,
                rol: true
              }
            }
          }
        }
      }
    });

    // 2. Validar que el ticket existe
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 3. Verificar permisos (RF-18.1)
    const esPropietario = ticket.tecnicoAsignadoId === userId;
    const esSupervisor = req.user.rol === 'supervisor';
    const esNuevo = ticket.estado === 'nuevo';

    const puedeModificar = esNuevo || esPropietario || esSupervisor;

    // 4. Preparar respuesta
    res.json({
      success: true,
      data: {
        ticket: {
          id: ticket.id,
          numeroCliente: ticket.numeroCliente,
          estado: ticket.estado,
          tecnicoAsignadoId: ticket.tecnicoAsignadoId,
          solicitudTransferenciaTecnicoId: ticket.solicitudTransferenciaTecnicoId,
          transferido: ticket.transferido,
          categoria: ticket.categoria,
          creadoEn: ticket.creadoEn,
          actualizadoEn: ticket.actualizadoEn,
          cerradoEn: ticket.cerradoEn,
          puedeModificar
        },
        contacto: ticket.contacto,
        tecnicoAsignado: ticket.tecnicoAsignado,
        mensajes: ticket.mensajes.map(msg => ({
          id: msg.id,
          ticketId: msg.ticketId,
          remitente: msg.remitente,
          tecnicoId: msg.tecnicoId,
          tecnicoNombre: msg.tecnico?.nombre || null,
          contenido: msg.contenido,
          tipo: msg.tipo || 'texto',
          urlAdjunto: msg.urlAdjunto,
          whatsappMessageId: msg.whatsappMessageId,
          enviadoEn: msg.enviadoEn
        })),
        auditoria: ticket.auditoria.map(aud => ({
          id: aud.id,
          ticketId: aud.ticketId,
          usuarioId: aud.usuarioId,
          usuarioNombre: aud.usuario.nombre,
          usuarioRol: aud.usuario.rol,
          accion: aud.accion,
          detalle: aud.detalle,
          fechaHora: aud.fechaHora
        }))
      }
    });

  } catch (error) {
    console.error('❌ Error en getTicketById:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * POST /api/tickets/:id/assign
 * Asignar ticket a un técnico ("Tomar caso")
 */
exports.assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { tecnico_id } = req.body || {}; // Asigna un objeto vacío por defecto
    const userId = req.user.id;
    const userRole = req.user.rol;

    // 1. Determinar a qué técnico asignar
    const tecnicoAsignadoId = (userRole === 'supervisor' && tecnico_id) 
      ? tecnico_id 
      : userId;

    // 2. Obtener el ticket actual
    const ticketActual = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: {
        tecnicoAsignado: true,
        contacto: true
      }
    });

    // 3. Validar que el ticket existe
    if (!ticketActual) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 4. Validar que el ticket esté en estado NUEVO
    if (ticketActual.estado !== 'nuevo') {
      return res.status(400).json({
        success: false,
        error: `No se puede asignar el ticket. El estado actual es "${ticketActual.estado}". Solo los tickets en estado "nuevo" pueden ser asignados.`
      });
    }

    // 5. Verificar que el técnico destino exista (si se especificó)
    if (userRole === 'supervisor' && tecnico_id) {
      const tecnicoDestino = await prisma.usuario.findUnique({
        where: { id: tecnico_id }
      });

      if (!tecnicoDestino || tecnicoDestino.rol !== 'tecnico') {
        return res.status(400).json({
          success: false,
          error: 'El técnico especificado no existe o no es válido'
        });
      }
    }

    // 6. Actualizar el ticket
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'asignado',
        tecnicoAsignadoId: tecnicoAsignadoId,
        actualizadoEn: new Date()
      },
      include: {
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        contacto: true
      }
    });

    // 7. Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        ticketId: parseInt(id),
        usuarioId: userId,
        accion: 'asignacion',
        detalle: {
          tecnico_anterior: null,
          tecnico_nuevo: tecnicoAsignadoId,
          estado_anterior: 'nuevo',
          estado_nuevo: 'asignado',
          asignado_por: userRole === 'supervisor' ? 'supervisor' : 'auto-asignación'
        },
        fechaHora: new Date()
      }
    });

    // 8. Respuesta exitosa
    res.json({
      success: true,
      message: 'Ticket asignado exitosamente',
      data: {
        ticket: {
          id: ticketActualizado.id,
          estado: ticketActualizado.estado,
          tecnicoAsignadoId: ticketActualizado.tecnicoAsignadoId,
          actualizadoEn: ticketActualizado.actualizadoEn
        },
        tecnicoAsignado: ticketActualizado.tecnicoAsignado
      }
    });

  } catch (error) {
    console.error('❌ Error en assignTicket:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * POST /api/tickets/:id/messages
 * Enviar mensaje al cliente (primera versión: solo texto)
 */
exports.sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenido } = req.body;
    const archivo = req.file; // Viene de Multer
    const userId = req.user.id;
    const usuario = req.user;

    // 1. Validar que haya contenido de texto o archivo
    const tieneTexto = contenido && contenido.trim() !== '';
    const tieneArchivo = !!archivo;

    if (!tieneTexto && !tieneArchivo) {
      return res.status(400).json({
        success: false,
        error: 'Debes proporcionar un mensaje de texto o un archivo adjunto'
      });
    }

    // 2. Obtener el ticket con información del contacto
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) },
      include: {
        contacto: true,
        tecnicoAsignado: true
      }
    });

    // 3. Validar que el ticket existe
    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 4. Validar que el ticket no esté cerrado
    if (ticket.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede enviar mensajes a un ticket cerrado'
      });
    }

    // 5. Si el ticket está en estado NUEVO, asignarlo automáticamente al técnico
    if (ticket.estado === 'nuevo') {
      await prisma.ticket.update({
        where: { id: parseInt(id) },
        data: {
          estado: 'asignado',
          tecnicoAsignadoId: userId,
          actualizadoEn: new Date()
        }
      });

      // Registrar en auditoría la auto-asignación
      await prisma.auditoria.create({
        data: {
          ticketId: parseInt(id),
          usuarioId: userId,
          accion: 'asignacion',
          detalle: {
            tecnico_anterior: null,
            tecnico_nuevo: userId,
            estado_anterior: 'nuevo',
            estado_nuevo: 'asignado',
            asignado_por: 'auto-asignación por envío de mensaje'
          },
          fechaHora: new Date()
        }
      });

      console.log(`✅ Ticket #${id} auto-asignado al técnico ${userId}`);
    }

    // 6. Determinar el tipo de mensaje según el archivo
    let tipo = 'texto';
    let urlAdjunto = null;

    if (archivo) {
      const mimeMap = {
        'image/': 'imagen',
        'video/': 'video',
        'audio/': 'audio',
        'application/pdf': 'documento',
        'application/msword': 'documento',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'documento',
        'application/vnd.ms-excel': 'documento',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'documento'
      };

      // Determinar el tipo según el MIME
      for (const [prefix, tipoValor] of Object.entries(mimeMap)) {
        if (archivo.mimetype.startsWith(prefix) || archivo.mimetype === prefix) {
          tipo = tipoValor;
          break;
        }
      }

      // URL pública del archivo
      urlAdjunto = `/uploads/${archivo.filename}`;
    }

    // 7. Enviar mensaje a OpenWA (integración REAL)
const openwaService = require('../services/openwaService');
let openwaResponse = null;
let whatsappMessageId = null;

try {
  const numeroCliente = ticket.contacto.numero_telefono;
  const texto = contenido || '';

  if (archivo) {
    // Construir URL pública del archivo
    const baseURL = `${req.protocol}://${req.get('host')}`;
    const urlArchivo = `${baseURL}${urlAdjunto}`;
    
    openwaResponse = await openwaService.sendMedia(
      numeroCliente,
      texto,
      {
        url: urlArchivo,
        mimeType: archivo.mimetype,
        fileName: archivo.originalname
      }
    );
    console.log(`📎 Archivo enviado a OpenWA: ${archivo.originalname}`);
  } else {
    openwaResponse = await openwaService.sendMessage(
      numeroCliente,
      texto
    );
  }

  whatsappMessageId = openwaResponse?.id || openwaResponse?.messageId || `msg_${Date.now()}`;
  console.log(`✅ Mensaje enviado a OpenWA, ID: ${whatsappMessageId}`);

} catch (error) {
  console.error('❌ Error enviando mensaje a OpenWA:', error.message);
  // Generar ID de fallback para no perder el mensaje en la BD
  whatsappMessageId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  // Continuamos con el guardado en BD aunque falle OpenWA
}

    // 8. Guardar mensaje en la base de datos
    const mensaje = await prisma.mensaje.create({
      data: {
        ticketId: parseInt(id),
        remitente: 'tecnico',
        tecnicoId: userId,
        contenido: contenido && contenido.trim() !== '' 
          ? contenido.trim() 
          : `[Archivo: ${archivo?.originalname || 'multimedia'}]`,
        tipo: tipo,
        urlAdjunto: urlAdjunto,
        whatsappMessageId: whatsappMessageId,
        enviadoEn: new Date()
      },
      include: {
        tecnico: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // 9. Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        ticketId: parseInt(id),
        usuarioId: userId,
        accion: 'respuesta',
        detalle: {
          mensaje_id: mensaje.id,
          whatsapp_message_id: whatsappMessageId,
          numero_cliente: ticket.contacto.numero_telefono,
          tiene_archivo: !!archivo,
          tipo_archivo: archivo ? archivo.mimetype : null,
          nombre_archivo: archivo ? archivo.originalname : null
        },
        fechaHora: new Date()
      }
    });

    // 10. Cambiar estado a ESPERANDO RESPUESTA si corresponde
    if (ticket.estado === 'nuevo' || ticket.estado === 'asignado') {
      await prisma.ticket.update({
        where: { id: parseInt(id) },
        data: {
          estado: 'esperando',
          actualizadoEn: new Date()
        }
      });
      console.log(`🔄 Ticket #${id} cambiado a ESPERANDO RESPUESTA`);
    }

    // 11. Respuesta exitosa
    res.status(201).json({
      success: true,
      message: 'Mensaje enviado correctamente',
      data: {
        mensaje: {
          id: mensaje.id,
          ticketId: mensaje.ticketId,
          remitente: mensaje.remitente,
          tecnico: mensaje.tecnico?.nombre || usuario.nombre,
          contenido: mensaje.contenido,
          tipo: mensaje.tipo,
          urlAdjunto: mensaje.urlAdjunto,
          whatsappMessageId: mensaje.whatsappMessageId,
          enviadoEn: mensaje.enviadoEn
        },
        archivo: archivo ? {
          nombre: archivo.originalname,
          tamaño: archivo.size,
          tipo: archivo.mimetype,
          url: urlAdjunto
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error en sendMessage:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * PUT /api/tickets/:id/status
 * Cambiar estado del ticket (solo propietario)
 * Body: { estado: string }
 */
exports.changeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    const userId = req.user.id;

    // 1. Validar que se envió un estado
    if (!estado) {
      return res.status(400).json({
        success: false,
        error: 'Debes especificar un estado'
      });
    }

    // 2. Validar que el estado sea válido
    const estadoNormalizado = estado.toLowerCase();
    const ESTADOS_VALIDOS = ['nuevo', 'asignado', 'esperando', 'resuelto', 'cerrado'];
    if (!ESTADOS_VALIDOS.includes(estadoNormalizado)) {
      return res.status(400).json({
        success: false,
        error: `Estado inválido. Debe ser uno de: ${ESTADOS_VALIDOS.join(', ')}`
      });
    }

    // 3. Obtener el ticket actual
    const ticketActual = await prisma.ticket.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ticketActual) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 4. Si el ticket está CERRADO, no se puede modificar
    if (ticketActual.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede modificar un ticket cerrado'
      });
    }

    // 5. Validar transición lógica
    const estadoActual = ticketActual.estado;
    
    // Definir transiciones permitidas
    const TRANSICIONES_PERMITIDAS = {
      'nuevo': [], // no se permite cambio manual desde nuevo (usar /assign)
      'asignado': ['esperando', 'resuelto'],
      'esperando': ['asignado', 'resuelto'],
      'resuelto': ['cerrado']
    };

    const transicionesPermitidas = TRANSICIONES_PERMITIDAS[estadoActual] || [];
    if (!transicionesPermitidas.includes(estadoNormalizado)) {
      return res.status(400).json({
        success: false,
        error: `No se puede cambiar de "${estadoActual}" a "${estadoNormalizado}". Transiciones permitidas: ${transicionesPermitidas.join(', ') || 'ninguna (use /assign para nuevo)'}`
      });
    }

    // 6. Preparar datos de actualización
    const dataToUpdate = {
      estado: estadoNormalizado,
      actualizadoEn: new Date()
    };

    // Si se cierra el ticket, registrar fecha de cierre
    if (estadoNormalizado === 'cerrado') {
      dataToUpdate.cerradoEn = new Date();
    }

    // 7. Actualizar el ticket
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        contacto: true,
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // 8. Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        ticketId: parseInt(id),
        usuarioId: userId,
        accion: 'cambio_estado',
        detalle: {
          estado_anterior: estadoActual,
          estado_nuevo: estadoNormalizado
        },
        fechaHora: new Date()
      }
    });

    // 9. Respuesta exitosa
    res.json({
      success: true,
      message: `Estado actualizado a "${estadoNormalizado}"`,
      data: {
        ticket: {
          id: ticketActualizado.id,
          estado: ticketActualizado.estado,
          cerradoEn: ticketActualizado.cerradoEn,
          actualizadoEn: ticketActualizado.actualizadoEn
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en changeStatus:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * POST /api/tickets/:id/close
 * Cerrar ticket (solo propietario)
 */
exports.closeTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Obtener el ticket actual
    const ticketActual = await prisma.ticket.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ticketActual) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 2. Validar que no esté ya cerrado
    if (ticketActual.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'El ticket ya está cerrado'
      });
    }

    // 3. Validar que el estado actual permita cierre
    const estadosPermitidosCierre = ['asignado', 'esperando', 'resuelto'];
    if (!estadosPermitidosCierre.includes(ticketActual.estado)) {
      return res.status(400).json({
        success: false,
        error: `No se puede cerrar un ticket en estado "${ticketActual.estado}". Debe estar en: ${estadosPermitidosCierre.join(', ')}`
      });
    }

    // 4. Actualizar a CERRADO
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        estado: 'cerrado',
        cerradoEn: new Date(),
        actualizadoEn: new Date()
      },
      include: {
        contacto: true,
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // 5. Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        ticketId: parseInt(id),
        usuarioId: userId,
        accion: 'cierre',
        detalle: {
          estado_anterior: ticketActual.estado,
          estado_nuevo: 'cerrado',
          cerrado_en: new Date().toISOString()
        },
        fechaHora: new Date()
      }
    });

    // 6. Respuesta exitosa
    res.json({
      success: true,
      message: 'Ticket cerrado exitosamente',
      data: {
        ticket: {
          id: ticketActualizado.id,
          estado: ticketActualizado.estado,
          cerradoEn: ticketActualizado.cerradoEn
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en closeTicket:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * POST /api/tickets/:id/transfer-request
 * Solicitar transferencia de ticket a otro técnico
 * Body: { destino_tecnico_id: number }
 * ✅ Requiere: verifyToken + checkTicketOwnership
 * ✅ Verifica que transferido sea false
 */
exports.requestTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const { destino_tecnico_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.rol;

    // 1. Validar que se envió el destino
    if (!destino_tecnico_id) {
      return res.status(400).json({
        success: false,
        error: 'Debes especificar el técnico destino'
      });
    }

    // 2. Validar que el destino sea un número
    const destinoId = parseInt(destino_tecnico_id);
    if (isNaN(destinoId)) {
      return res.status(400).json({
        success: false,
        error: 'El ID del técnico destino debe ser un número'
      });
    }

    // 3. Validar que no se esté transfiriendo a sí mismo
    if (destinoId === userId) {
      return res.status(400).json({
        success: false,
        error: 'No puedes transferirte un ticket a ti mismo'
      });
    }

    // 4. Obtener el ticket actual
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 5. Validar que el ticket no esté cerrado
    if (ticket.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede transferir un ticket cerrado'
      });
    }

    // 6. VALIDACIÓN CLAVE: Verificar que transferido sea false
    if (ticket.transferido === true) {
      return res.status(409).json({
        success: false,
        error: 'Este ticket ya ha sido transferido anteriormente. No se puede solicitar otra transferencia voluntaria.'
      });
    }

    // 7. Validar que el técnico destino existe y es técnico (no supervisor)
    const tecnicoDestino = await prisma.usuario.findUnique({
      where: { id: destinoId }
    });

    if (!tecnicoDestino) {
      return res.status(404).json({
        success: false,
        error: 'El técnico destino no existe'
      });
    }

    if (tecnicoDestino.rol !== 'tecnico') {
      return res.status(400).json({
        success: false,
        error: 'El destino debe ser un técnico (no supervisor)'
      });
    }

    // 8. Validar que no haya una solicitud de transferencia pendiente
    if (ticket.solicitudTransferenciaTecnicoId) {
      return res.status(409).json({
        success: false,
        error: 'Ya existe una solicitud de transferencia pendiente para este ticket'
      });
    }

    // 9. Obtener el nombre del usuario origen para la auditoría
    const usuarioOrigen = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true }
    });

    // 10. Actualizar el ticket con la solicitud
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        solicitudTransferenciaTecnicoId: destinoId,
        actualizadoEn: new Date()
      },
      include: {
        contacto: true,
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // 11. Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        ticketId: parseInt(id),
        usuarioId: userId,
        accion: 'solicitud_transferencia',
        detalle: {
          origen_id: userId,
          destino_id: destinoId,
          origen_nombre: usuarioOrigen?.nombre || req.user.email || 'Técnico',
          destino_nombre: tecnicoDestino.nombre
        },
        fechaHora: new Date()
      }
    });

    // 12. Respuesta exitosa
    res.json({
      success: true,
      message: `Solicitud de transferencia enviada a ${tecnicoDestino.nombre}`,
      data: {
        ticket: {
          id: ticketActualizado.id,
          estado: ticketActualizado.estado,
          solicitudTransferenciaTecnicoId: ticketActualizado.solicitudTransferenciaTecnicoId,
          transferido: ticketActualizado.transferido
        },
        destino: {
          id: tecnicoDestino.id,
          nombre: tecnicoDestino.nombre,
          email: tecnicoDestino.email
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en requestTransfer:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};


/**
 * POST /api/tickets/:id/transfer-accept
 * Aceptar solicitud de transferencia (solo el técnico destino)
 * ✅ Usa transacción para atomicidad
 * ✅ Establece transferido = true
 */
exports.acceptTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Obtener el ticket actual con la solicitud pendiente
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 2. Verificar que hay una solicitud pendiente
    if (!ticket.solicitudTransferenciaTecnicoId) {
      return res.status(400).json({
        success: false,
        error: 'No hay ninguna solicitud de transferencia pendiente para este ticket'
      });
    }

    // 3. Verificar que el usuario autenticado sea el destino de la solicitud
    if (ticket.solicitudTransferenciaTecnicoId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para aceptar esta transferencia. Solo el técnico destino puede aceptarla.'
      });
    }

    // 4. Verificar que el ticket no esté cerrado
    if (ticket.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede aceptar una transferencia para un ticket cerrado'
      });
    }

    // 5. Verificar que el ticket no haya sido transferido antes (por si acaso)
    if (ticket.transferido === true) {
      return res.status(409).json({
        success: false,
        error: 'Este ticket ya ha sido transferido anteriormente'
      });
    }

    // 6. Obtener datos del técnico destino (el usuario actual)
    const tecnicoDestino = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    // 7. EJECUTAR TRANSACCIÓN PARA GARANTIZAR ATOMICIDAD
    const resultado = await prisma.$transaction(async (prisma) => {
      
      // 7.1. Actualizar el ticket
      const ticketActualizado = await prisma.ticket.update({
        where: { id: parseInt(id) },
        data: {
          tecnicoAsignadoId: userId,
          solicitudTransferenciaTecnicoId: null,
          transferido: true, // ← CLAVE: se marca como transferido
          actualizadoEn: new Date()
        },
        include: {
          contacto: true,
          tecnicoAsignado: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        }
      });

      // 7.2. Registrar en auditoría (dentro de la transacción)
      await prisma.auditoria.create({
        data: {
          ticketId: parseInt(id),
          usuarioId: userId,
          accion: 'aceptacion_transferencia',
          detalle: {
            nuevo_tecnico_id: userId,
            nuevo_tecnico_nombre: tecnicoDestino?.nombre || 'Técnico'
          },
          fechaHora: new Date()
        }
      });

      return ticketActualizado;
    });

    // 8. Respuesta exitosa
    res.json({
      success: true,
      message: 'Transferencia aceptada exitosamente',
      data: {
        ticket: {
          id: resultado.id,
          estado: resultado.estado,
          tecnicoAsignadoId: resultado.tecnicoAsignadoId,
          transferido: resultado.transferido,
          solicitudTransferenciaTecnicoId: resultado.solicitudTransferenciaTecnicoId,
          actualizadoEn: resultado.actualizadoEn
        },
        tecnicoAsignado: resultado.tecnicoAsignado
      }
    });

  } catch (error) {
    console.error('❌ Error en acceptTransfer:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * POST /api/tickets/:id/transfer-reject
 * Rechazar solicitud de transferencia (solo el técnico destino)
 * ✅ NO modifica transferido
 */
exports.rejectTransfer = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 1. Obtener el ticket actual con la solicitud pendiente
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 2. Verificar que hay una solicitud pendiente
    if (!ticket.solicitudTransferenciaTecnicoId) {
      return res.status(400).json({
        success: false,
        error: 'No hay ninguna solicitud de transferencia pendiente para este ticket'
      });
    }

    // 3. Verificar que el usuario autenticado sea el destino de la solicitud
    if (ticket.solicitudTransferenciaTecnicoId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'No tienes permiso para rechazar esta transferencia. Solo el técnico destino puede rechazarla.'
      });
    }

    // 4. Verificar que el ticket no esté cerrado
    if (ticket.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede rechazar una transferencia para un ticket cerrado'
      });
    }

    // 5. Obtener datos del técnico que rechaza
    const tecnicoRechaza = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    // 6. Actualizar el ticket (limpiar la solicitud)
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: {
        solicitudTransferenciaTecnicoId: null,
        actualizadoEn: new Date()
      },
      include: {
        contacto: true,
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // 7. Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        ticketId: parseInt(id),
        usuarioId: userId,
        accion: 'rechazo_transferencia',
        detalle: {
          tecnico_rechaza_id: userId,
          tecnico_rechaza_nombre: tecnicoRechaza?.nombre || 'Técnico'
        },
        fechaHora: new Date()
      }
    });

    // 8. Respuesta exitosa
    res.json({
      success: true,
      message: 'Transferencia rechazada exitosamente',
      data: {
        ticket: {
          id: ticketActualizado.id,
          estado: ticketActualizado.estado,
          tecnicoAsignadoId: ticketActualizado.tecnicoAsignadoId,
          transferido: ticketActualizado.transferido,
          solicitudTransferenciaTecnicoId: ticketActualizado.solicitudTransferenciaTecnicoId,
          actualizadoEn: ticketActualizado.actualizadoEn
        }
      }
    });

  } catch (error) {
    console.error('❌ Error en rejectTransfer:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};


/**
 * POST /api/tickets/:id/force-assign
 * Reasignación forzada por supervisor (sin solicitud/aceptación)
 * ✅ Solo para supervisores (middleware checkSupervisorRole)
 * ✅ No modifica transferido
 * ✅ Si estado NUEVO → cambia a ASIGNADO
 * ✅ Limpia solicitudes pendientes
 */
exports.forceAssign = async (req, res) => {
  try {
    const { id } = req.params;
    const { destino_tecnico_id } = req.body;
    const userId = req.user.id;
    const userRole = req.user.rol;

    // 1. Validar que se envió el destino
    if (!destino_tecnico_id) {
      return res.status(400).json({
        success: false,
        error: 'Debes especificar el técnico destino'
      });
    }

    // 2. Validar que el destino sea un número
    const destinoId = parseInt(destino_tecnico_id);
    if (isNaN(destinoId)) {
      return res.status(400).json({
        success: false,
        error: 'El ID del técnico destino debe ser un número'
      });
    }

    // 3. Obtener el ticket actual
    const ticket = await prisma.ticket.findUnique({
      where: { id: parseInt(id) }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Ticket no encontrado'
      });
    }

    // 4. Verificar que el ticket no esté cerrado
    if (ticket.estado === 'cerrado') {
      return res.status(400).json({
        success: false,
        error: 'No se puede reasignar un ticket cerrado'
      });
    }

    // 5. Validar que el técnico destino existe y es técnico
    const tecnicoDestino = await prisma.usuario.findUnique({
      where: { id: destinoId }
    });

    if (!tecnicoDestino) {
      return res.status(404).json({
        success: false,
        error: 'El técnico destino no existe'
      });
    }

    if (tecnicoDestino.rol !== 'tecnico') {
      return res.status(400).json({
        success: false,
        error: 'El destino debe ser un técnico'
      });
    }

    // 6. Guardar el técnico origen actual (para auditoría)
    const tecnicoOrigen = ticket.tecnicoAsignadoId 
      ? await prisma.usuario.findUnique({
          where: { id: ticket.tecnicoAsignadoId },
          select: { id: true, nombre: true }
        })
      : null;

    // 7. Preparar los datos de actualización
    const dataToUpdate = {
      tecnicoAsignadoId: destinoId,
      solicitudTransferenciaTecnicoId: null, // Limpiar solicitudes pendientes
      actualizadoEn: new Date()
    };

    // 8. Si el ticket está en estado NUEVO, cambiarlo a ASIGNADO
    let estadoAnterior = ticket.estado;
    if (ticket.estado === 'nuevo') {
      dataToUpdate.estado = 'asignado';
    }

    // 9. Actualizar el ticket (NO modificar transferido)
    const ticketActualizado = await prisma.ticket.update({
      where: { id: parseInt(id) },
      data: dataToUpdate,
      include: {
        contacto: true,
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    // 10. Registrar en auditoría (acción: reasignacion_forzada)
    await prisma.auditoria.create({
      data: {
        ticketId: parseInt(id),
        usuarioId: userId,
        accion: 'reasignacion_forzada',
        detalle: {
          origen_id: tecnicoOrigen?.id || null,
          origen_nombre: tecnicoOrigen?.nombre || 'Sin asignar',
          destino_id: destinoId,
          destino_nombre: tecnicoDestino.nombre,
          supervisor_id: userId,
          estado_anterior: estadoAnterior,
          estado_nuevo: ticketActualizado.estado
        },
        fechaHora: new Date()
      }
    });

    // 11. Respuesta exitosa
    res.json({
      success: true,
      message: `Ticket reasignado forzosamente a ${tecnicoDestino.nombre}`,
      data: {
        ticket: {
          id: ticketActualizado.id,
          estado: ticketActualizado.estado,
          tecnicoAsignadoId: ticketActualizado.tecnicoAsignadoId,
          transferido: ticketActualizado.transferido, // No se modifica
          solicitudTransferenciaTecnicoId: ticketActualizado.solicitudTransferenciaTecnicoId,
          actualizadoEn: ticketActualizado.actualizadoEn
        },
        tecnicoAsignado: ticketActualizado.tecnicoAsignado,
        origen: tecnicoOrigen ? {
          id: tecnicoOrigen.id,
          nombre: tecnicoOrigen.nombre
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Error en forceAssign:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

/**
 * GET /api/tickets/transferencias-pendientes
 * Obtener todas las solicitudes de transferencia pendientes para el técnico actual
 */
exports.getTransferenciasPendientes = async (req, res) => {
  try {
    const userId = req.user.id;
    console.log(`🔍 Buscando transferencias pendientes para el usuario: ${userId}`);

    // Primero, verificar que el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    if (!usuario) {
      console.log(`❌ Usuario ${userId} no encontrado`);
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // Buscar tickets donde el técnico actual es el destino de una transferencia pendiente
    const tickets = await prisma.ticket.findMany({
      where: {
        solicitudTransferenciaTecnicoId: userId,
        estado: {
          not: 'cerrado'
        }
      },
      include: {
        contacto: {
          select: {
            numero_telefono: true,
            nombre: true,
            sucursal: true
          }
        },
        tecnicoAsignado: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        solicitudTransferenciaTecnico: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        actualizadoEn: 'desc'
      }
    });

    console.log(`✅ Encontrados ${tickets.length} tickets con transferencia pendiente`);

    res.json({
      success: true,
      data: tickets,
      total: tickets.length
    });

  } catch (error) {
    console.error('❌ Error en getTransferenciasPendientes:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      details: error.message
    });
  }
};