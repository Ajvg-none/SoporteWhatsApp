// backend/src/services/ticketService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Estados que se consideran "abiertos" (no cerrados)
const ESTADOS_ABIERTOS = ['nuevo', 'asignado', 'esperando', 'resuelto'];

/**
 * Obtiene o crea un ticket abierto para un número de teléfono
 * Maneja condiciones de carrera (error P2002)
 * @param {string} numeroCliente - Número del cliente
 * @returns {Promise<Object>} - Ticket
 */
async function findOrCreateOpenTicket(numeroCliente) {
  try {
    const numeroLimpio = numeroCliente.trim();
    
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
    
    // 2. Si existe, devolverlo
    if (ticket) {
      console.log(`✅ Ticket existente: #${ticket.id} (${ticket.estado})`);
      return ticket;
    }
    
    // 3. Si no existe, CREAR NUEVO TICKET
    console.log(`🆕 Creando nuevo ticket para ${numeroLimpio}`);
    
    try {
      ticket = await prisma.ticket.create({
        data: {
          numeroCliente: numeroLimpio,
          estado: 'nuevo',
          transferido: false
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
      console.log(`✅ Ticket creado: #${ticket.id}`);
      return ticket;
      
    } catch (error) {
      // 4. MANEJO DE CONCURRENCIA: error P2002 (violación de índice único)
      if (error.code === 'P2002' && error.meta?.target?.includes('numeroCliente')) {
        console.log('⚠️ Concurrencia detectada, recuperando ticket existente...');
        
        // Recuperar el ticket que otro proceso creó
        ticket = await prisma.ticket.findFirst({
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
  ESTADOS_ABIERTOS 
};