const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/stats/dashboard
 * Estadísticas para el dashboard (solo supervisores)
 * Query params: periodo (hoy, semana, mes)
 * 
 * Devuelve:
 *   - stats: { totalTickets, ticketsAbiertos, ticketsCerrados, tiempoPromedioRespuesta }
 *   - evolucion: [{ fecha, nuevos, cerrados }]
 *   - porTecnico: [{ nombre, total }]
 *   - porEstado: { nuevo, asignado, esperando, resuelto, cerrado }
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { periodo = 'hoy' } = req.query;
    const { fechaInicio, fechaFin } = calcularRangoFechas(periodo);

    // 1. Tickets totales creados en el período
    const totalTickets = await prisma.ticket.count({
      where: {
        creadoEn: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    // 2. Tickets abiertos actualmente (no cerrados)
    const ticketsAbiertos = await prisma.ticket.count({
      where: {
        estado: {
          not: 'cerrado'
        }
      }
    });

    // 3. Tickets cerrados actualmente
    const ticketsCerrados = await prisma.ticket.count({
      where: {
        estado: 'cerrado'
      }
    });

    // 4. Tiempo promedio de primera respuesta (en minutos)
    const tiempoPromedioRespuesta = await calcularTiempoPrimeraRespuesta(fechaInicio, fechaFin);

    // 5. Evolución diaria (nuevos y cerrados en el período)
    const evolucion = await obtenerEvolucionDiaria(fechaInicio, fechaFin);

    // 6. Tickets por técnico (atendidos en el período)
    const porTecnico = await obtenerTicketsPorTecnico(fechaInicio, fechaFin);

    // 7. Distribución por estado actual
    const porEstado = await obtenerDistribucionPorEstado();

    // Respuesta exitosa
    res.json({
      success: true,
      data: {
        stats: {
          totalTickets,
          ticketsAbiertos,
          ticketsCerrados,
          tiempoPromedioRespuesta
        },
        evolucion,
        porTecnico,
        porEstado
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
  
  // Asegurar que fechaFin sea el final del día de hoy
  const fechaFin = new Date(hoy);
  fechaFin.setHours(23, 59, 59, 999);
  
  return { fechaInicio, fechaFin };
}

/**
 * Calcula el tiempo promedio de primera respuesta (en minutos)
 * (desde creación del ticket hasta el primer mensaje del técnico)
 */
async function calcularTiempoPrimeraRespuesta(fechaInicio, fechaFin) {
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
 * Obtiene la evolución diaria de tickets nuevos y cerrados
 */
async function obtenerEvolucionDiaria(fechaInicio, fechaFin) {
  // Usamos $queryRaw para agrupar por fecha (PostgreSQL)
  const resultados = await prisma.$queryRaw`
    SELECT
      DATE(creado_en) as fecha,
      COUNT(*) as total_creados,
      COUNT(CASE WHEN estado = 'cerrado' THEN 1 END) as cerrados
    FROM tickets
    WHERE creado_en >= ${fechaInicio} AND creado_en <= ${fechaFin}
    GROUP BY DATE(creado_en)
    ORDER BY fecha ASC
  `;

  // Transformar a formato esperado
  return resultados.map(r => ({
    fecha: r.fecha.toISOString().split('T')[0],
    nuevos: Number(r.total_creados) - Number(r.cerrados), // asumimos que los no cerrados son "nuevos" en ese día
    cerrados: Number(r.cerrados)
  }));
}

/**
 * Obtiene tickets atendidos por cada técnico en el período
 */
async function obtenerTicketsPorTecnico(fechaInicio, fechaFin) {
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
    const count = await prisma.ticket.count({
      where: {
        tecnicoAsignadoId: tecnico.id,
        creadoEn: {
          gte: fechaInicio,
          lte: fechaFin
        }
      }
    });

    // También contar asignaciones mediante auditoría (para transferencias)
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
      nombre: tecnico.nombre,
      total: count + asignaciones
    });
  }

  // Ordenar de mayor a menor
  resultado.sort((a, b) => b.total - a.total);
  
  return resultado;
}

/**
 * Obtiene la distribución actual de tickets por estado
 */
async function obtenerDistribucionPorEstado() {
  const estados = ['nuevo', 'asignado', 'esperando', 'resuelto', 'cerrado'];
  const counts = await Promise.all(
    estados.map(estado =>
      prisma.ticket.count({
        where: { estado }
      })
    )
  );
  
  // Convertir a objeto con nombres de estado como keys
  return Object.fromEntries(estados.map((estado, i) => [estado, counts[i]]));
}