const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/stats/dashboard
 * Estadísticas para el dashboard (solo supervisores)
 * Query params: periodo (hoy, semana, mes)
 * ✅ S3-B02
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { periodo = 'hoy' } = req.query;

    // 1. Calcular fechas según el período
    const fechas = calcularRangoFechas(periodo);
    
    // 2. Obtener todas las estadísticas en paralelo
    const [
      ticketsIngresados,
      ticketsResueltos,
      ticketsAbiertos,
      tiempoPrimeraRespuesta,
      tiempoResolucion,
      ticketsPorTecnico,
      incidenciasPorSucursal,
      mensajesPorDia
    ] = await Promise.all([
      obtenerTicketsIngresados(fechas),
      obtenerTicketsResueltos(fechas),
      obtenerTicketsAbiertos(),
      calcularTiempoPrimeraRespuesta(fechas),
      calcularTiempoResolucion(fechas),
      obtenerTicketsPorTecnico(fechas),
      obtenerIncidenciasPorSucursal(fechas),
      obtenerMensajesPorDia(fechas)
    ]);

    // 3. Respuesta
    res.json({
      success: true,
      data: {
        periodo,
        resumen: {
          tickets_ingresados: ticketsIngresados,
          tickets_resueltos: ticketsResueltos,
          tickets_abiertos: ticketsAbiertos
        },
        tiempos: {
          tiempo_promedio_primera_respuesta: tiempoPrimeraRespuesta,
          tiempo_promedio_resolucion: tiempoResolucion
        },
        tickets_por_tecnico: ticketsPorTecnico,
        incidencias_por_sucursal: incidenciasPorSucursal,
        mensajes_por_dia: mensajesPorDia
      }
    });

  } catch (error) {
    console.error('❌ Error en getDashboardStats:', error);
    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
};

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================

/**
 * Calcula el rango de fechas según el período
 */
function calcularRangoFechas(periodo) {
  const ahora = new Date();
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  
  let fechaInicio;
  
  switch (periodo) {
    case 'hoy':
      fechaInicio = hoy;
      break;
    case 'semana':
      fechaInicio = new Date(hoy);
      fechaInicio.setDate(hoy.getDate() - 7);
      break;
    case 'mes':
      fechaInicio = new Date(hoy);
      fechaInicio.setMonth(hoy.getMonth() - 1);
      break;
    default:
      fechaInicio = hoy;
  }
  
  return { fechaInicio, fechaFin: hoy };
}

/**
 * Obtiene tickets ingresados en el período
 */
async function obtenerTicketsIngresados({ fechaInicio, fechaFin }) {
  const count = await prisma.ticket.count({
    where: {
      creadoEn: {
        gte: fechaInicio,
        lte: fechaFin
      }
    }
  });
  return count;
}

/**
 * Obtiene tickets resueltos en el período
 * (tickets que pasaron a estado 'resuelto' o 'cerrado')
 */
async function obtenerTicketsResueltos({ fechaInicio, fechaFin }) {
  const count = await prisma.auditoria.count({
    where: {
      accion: 'cambio_estado',
      fechaHora: {
        gte: fechaInicio,
        lte: fechaFin
      },
      detalle: {
        path: ['estado_nuevo'],
        equals: 'resuelto'
      }
    }
  });
  return count;
}

/**
 * Obtiene tickets abiertos actualmente
 * (estados: nuevo, asignado, esperando)
 */
async function obtenerTicketsAbiertos() {
  const count = await prisma.ticket.count({
    where: {
      estado: {
        in: ['nuevo', 'asignado', 'esperando']
      }
    }
  });
  return count;
}

/**
 * Calcula el tiempo promedio de primera respuesta
 * (desde creación hasta el primer mensaje del técnico)
 */
async function calcularTiempoPrimeraRespuesta({ fechaInicio, fechaFin }) {
  // Buscar tickets creados en el período que tengan al menos un mensaje de técnico
  const tickets = await prisma.ticket.findMany({
    where: {
      creadoEn: {
        gte: fechaInicio,
        lte: fechaFin
      },
      mensajes: {
        some: {
          remitente: 'tecnico'
        }
      }
    },
    include: {
      mensajes: {
        where: {
          remitente: 'tecnico'
        },
        orderBy: {
          enviadoEn: 'asc'
        },
        take: 1
      }
    }
  });

  if (tickets.length === 0) {
    return null;
  }

  let totalTiempo = 0;
  let count = 0;

  for (const ticket of tickets) {
    const primerMensaje = ticket.mensajes[0];
    if (primerMensaje && ticket.creadoEn) {
      const tiempo = primerMensaje.enviadoEn.getTime() - ticket.creadoEn.getTime();
      totalTiempo += tiempo;
      count++;
    }
  }

  if (count === 0) {
    return null;
  }

  // Promedio en minutos
  const promedioMs = totalTiempo / count;
  return Math.round(promedioMs / (1000 * 60));
}

/**
 * Calcula el tiempo promedio de resolución
 * (desde creación hasta que pasa a 'resuelto' o 'cerrado')
 */
async function calcularTiempoResolucion({ fechaInicio, fechaFin }) {
  // Buscar auditorías de cambio a 'resuelto' en el período
  const auditorias = await prisma.auditoria.findMany({
    where: {
      accion: 'cambio_estado',
      fechaHora: {
        gte: fechaInicio,
        lte: fechaFin
      },
      detalle: {
        path: ['estado_nuevo'],
        equals: 'resuelto'
      }
    },
    include: {
      ticket: true
    }
  });

  if (auditorias.length === 0) {
    return null;
  }

  let totalTiempo = 0;
  let count = 0;

  for (const auditoria of auditorias) {
    if (auditoria.ticket?.creadoEn && auditoria.fechaHora) {
      const tiempo = auditoria.fechaHora.getTime() - auditoria.ticket.creadoEn.getTime();
      totalTiempo += tiempo;
      count++;
    }
  }

  if (count === 0) {
    return null;
  }

  // Promedio en minutos
  const promedioMs = totalTiempo / count;
  return Math.round(promedioMs / (1000 * 60));
}

/**
 * Obtiene tickets atendidos por cada técnico en el período
 */
async function obtenerTicketsPorTecnico({ fechaInicio, fechaFin }) {
  // Obtener todos los técnicos
  const tecnicos = await prisma.usuario.findMany({
    where: { rol: 'tecnico' },
    select: {
      id: true,
      nombre: true,
      email: true
    }
  });

  const resultado = [];

  for (const tecnico of tecnicos) {
    // Contar tickets asignados a este técnico en el período
    // Buscar en auditoría asignaciones o en tickets creados con asignación directa
    const count = await prisma.ticket.count({
      where: {
        tecnicoAsignadoId: tecnico.id,
        creadoEn: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    // También contar tickets que fueron asignados a este técnico en el período
    // (para capturar transferencias)
    const asignaciones = await prisma.auditoria.count({
      where: {
        accion: 'asignacion',
        usuarioId: tecnico.id,
        fechaHora: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    resultado.push({
      tecnico_id: tecnico.id,
      nombre: tecnico.nombre,
      email: tecnico.email,
      total: count + asignaciones
    });
  }

  // Ordenar de mayor a menor
  resultado.sort((a, b) => b.total - a.total);
  
  return resultado;
}

/**
 * Obtiene incidencias por sucursal
 */
async function obtenerIncidenciasPorSucursal({ fechaInicio, fechaFin }) {
  // Agrupar tickets por sucursal del contacto
  const tickets = await prisma.ticket.findMany({
    where: {
      creadoEn: {
        gte: fechaInicio,
        lte: fechaFin
      },
      contacto: {
        sucursal: {
          not: null
        }
      }
    },
    include: {
      contacto: {
        select: {
          sucursal: true
        }
      }
    }
  });

  // Agrupar por sucursal
  const agrupado = {};
  for (const ticket of tickets) {
    const sucursal = ticket.contacto?.sucursal || 'Sin sucursal';
    agrupado[sucursal] = (agrupado[sucursal] || 0) + 1;
  }

  // Convertir a array y ordenar
  const resultado = Object.entries(agrupado).map(([sucursal, total]) => ({
    sucursal,
    total
  }));

  resultado.sort((a, b) => b.total - a.total);
  
  return resultado;
}

/**
 * Obtiene mensajes recibidos y enviados por día
 */
async function obtenerMensajesPorDia({ fechaInicio, fechaFin }) {
  // Obtener mensajes agrupados por día
  const mensajes = await prisma.$queryRaw`
    SELECT 
      DATE(enviado_en) as dia,
      remitente,
      COUNT(*) as total
    FROM mensajes
    WHERE enviado_en >= ${fechaInicio} 
      AND enviado_en <= ${fechaFin}
    GROUP BY DATE(enviado_en), remitente
    ORDER BY dia ASC
  `;

  // Procesar resultados
  const resultado = {};
  const dias = new Set();

  // Primero, identificar todos los días
  for (const row of mensajes) {
    const dia = row.dia.toISOString().split('T')[0];
    dias.add(dia);
    if (!resultado[dia]) {
      resultado[dia] = { fecha: dia, recibidos: 0, enviados: 0 };
    }
  }

  // Luego, asignar los conteos
  for (const row of mensajes) {
    const dia = row.dia.toISOString().split('T')[0];
    if (row.remitente === 'cliente') {
      resultado[dia].recibidos = parseInt(row.total);
    } else if (row.remitente === 'tecnico') {
      resultado[dia].enviados = parseInt(row.total);
    }
  }

  // Convertir a array ordenado
  const resultadoArray = Object.values(resultado);
  resultadoArray.sort((a, b) => a.fecha.localeCompare(b.fecha));

  return resultadoArray;
}