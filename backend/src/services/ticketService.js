// backend/src/services/ticketService.js
const { PrismaClient } = require('@prisma/client');
const { esLid } = require('./contactService');

const prisma = new PrismaClient();

// Estados que se consideran "abiertos" (no cerrados)
const ESTADOS_ABIERTOS = ['nuevo', 'asignado', 'esperando', 'resuelto'];

/**
 * Determina el nombre visible (número real) y el lid de retorno que se usarán
 * tanto para el contacto como para el ticket, según lo que llega del webhook.
 * - Si `from` es un @lid y traemos `senderPhone` (número real), el visible será
 *   `senderPhone` y el lid de retorno `from`.
 * - Si `from` es un @c.us, el visible es `from` y no hay lid.
 * @param {string|null} from - JID del remitente (puede ser @lid)
 * @param {string|null} senderPhone - Número real (sólo viene para remitentes @lid)
 * @returns {{ numeroVisible: string, lid: string|null }}
 */
function resolverIdentidad(from, senderPhone) {
  const fromLimpio = String(from || '').trim();
  if (esLid(fromLimpio)) {
    const real = String(senderPhone || '').trim();
    // Si trae número real, usarlo como visible; si no, el propio @lid queda como visible
    const visible = real !== '' && real !== 'null' ? real : fromLimpio;
    return { numeroVisible: visible, lid: fromLimpio };
  }
  return { numeroVisible: fromLimpio, lid: null };
}

/**
 * Obtiene o crea un ticket abierto para un número de teléfono.
 * Maneja condiciones de carrera (error P2002).
 * @param {string} numeroCliente - Número del cliente (visible)
 * @param {Object} opciones - { lid } opcional (JID de retorno para remitentes @lid)
 * @returns {Promise<Object>} - Ticket
 */
async function findOrCreateOpenTicket(numeroCliente, opciones = {}) {
  try {
    const numeroLimpio = String(numeroCliente || '').trim();
    const lid = opciones.lid || null;

    // 1. Buscar ticket abierto existente
    let ticket = await prisma.ticket.findFirst({
      where: {
        numeroCliente: numeroLimpio,
        estado: {
          in: ESTADOS_ABIERTOS
        }
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

    // 1b. Si no encontramos por el número visible (p.ej. migró de @lid a real),
    //     intentar por el @lid de envío
    if (!ticket && lid) {
      ticket = await prisma.ticket.findFirst({
        where: {
          lidEnvio: lid,
          estado: {
            in: ESTADOS_ABIERTOS
          }
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
    }

    // 2. Si existe, devolverlo
    if (ticket) {
      // Si el ticket tenía el lid migrado y ahora tenemos nº real, refrescar
      if (lid && esLid(ticket.numeroCliente) && !esLid(numeroLimpio)) {
        ticket = await prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            numeroCliente: numeroLimpio,
            lidEnvio: lid || ticket.lidEnvio,
            actualizadoEn: new Date()
          },
          include: {
            contacto: true,
            tecnicoAsignado: {
              select: { id: true, nombre: true, email: true }
            }
          }
        });
        console.log(`🔄 Ticket #${ticket.id} migrado de @lid a ${numeroLimpio}`);
      }
      console.log(`✅ Ticket existente: #${ticket.id} (${ticket.estado})`);
      return ticket;
    }

    // 3. Si no existe, CREAR NUEVO TICKET
    console.log(`🆕 Creando nuevo ticket para ${numeroLimpio}`);

    const crearDatos = {
      numeroCliente: numeroLimpio,
      estado: 'nuevo',
      transferido: false
    };
    if (lid && !esLid(numeroLimpio)) {
      crearDatos.lidEnvio = lid;
    }

    try {
      ticket = await prisma.ticket.create({
        data: crearDatos,
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
      console.log(`✅ Ticket creado: #${ticket.id}`);
      return ticket;
    } catch (error) {
      // 4. MANEJO DE CONCURRENCIA: error P2002 (violación de índice único)
      if (error.code === 'P2002' && error.meta?.target?.includes('numeroCliente')) {
        console.log('⚠️ Concurrencia detectada, recuperando ticket existente...');

        // Recuperar el ticket que otro proceso creó
        ticket = await prisma.ticket.findFirst({
          where: {
            OR: [
              { numeroCliente: numeroLimpio },
              ...(lid ? [{ lidEnvio: lid }] : [])
            ],
            estado: {
              in: ESTADOS_ABIERTOS
            }
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

        if (ticket) {
          console.log(`✅ Ticket recuperado: #${ticket.id}`);
          return ticket;
        }
      }

      // Si no es el error esperado, relanzar
      throw error;
    }
  } catch (error) {
    console.error('❌ Error en findOrCreateOpenTicket:', error);
    throw error;
  }
}

/**
 * Obtiene un ticket por ID
 * @param {number} ticketId - ID del ticket
 * @returns {Promise<Object>} - Ticket
 */
async function getTicketById(ticketId) {
  return await prisma.ticket.findUnique({
    where: { id: ticketId },
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
}

module.exports = {
  findOrCreateOpenTicket,
  getTicketById,
  resolverIdentidad,
  ESTADOS_ABIERTOS
};
