const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/tickets
 * Listado paginado de tickets con filtros
 * Query params: estado, buscar, page, limit, solo_cerrados
 */
exports.getTickets = async (req, res) => {
  try {
    // 1. Extraer y validar parámetros de consulta
    const {
      estado,
      buscar,
      page = 1,
      limit = 20,
      solo_cerrados = 'false'
    } = req.query;

    // Validar page y limit
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // 2. Construir el filtro WHERE
    const where = {};

    // Filtro por estado
    if (estado) {
      where.estado = estado.toLowerCase();
    } else if (solo_cerrados === 'false') {
      // Por defecto, excluir tickets cerrados
      where.estado = {
        not: 'cerrado'
      };
    }

    // Filtro de búsqueda (número, nombre o sucursal)
    if (buscar) {
      where.OR = [
        {
          numeroCliente: {
            contains: buscar,
            mode: 'insensitive'
          }
        },
        {
          contacto: {
            nombre: {
              contains: buscar,
              mode: 'insensitive'
            }
          }
        },
        {
          contacto: {
            sucursal: {
              contains: buscar,
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
    const { tecnico_id } = req.body;
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

    // 7. TODO: Enviar mensaje a OpenWA (integración real)
    // Por ahora simulamos el envío
    console.log(`📤 Enviando mensaje a OpenWA: ${ticket.contacto.numero_telefono}`);
    console.log(`📝 Texto: ${contenido || '[Sin texto]'}`);
    if (archivo) {
      console.log(`📎 Archivo: ${archivo.originalname} (${archivo.size} bytes)`);
      console.log(`📁 Ruta: ${archivo.path}`);
    }

    // Simulación de respuesta de OpenWA
    const whatsappMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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