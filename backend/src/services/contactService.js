// backend/src/services/contactService.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Normaliza y quita cualquier sufijo de WhatsApp de un JID de contacto.
 * @param {string} numero - Número tal como llega (puede traer @c.us/@g.us/@lid)
 * @returns {string} Sólo los dígitos
 */
function limpiarNumero(numero) {
  return String(numero || '')
    .replace(/@c\.us|@g\.us|@lid/gi, '')
    .replace(/[\s\-\(\)]/g, '')
    .trim();
}

/**
 * Determina si un JID es un @lid (privacy-id) de WhatsApp.
 * @param {string} numero
 * @returns {boolean}
 */
function esLid(numero) {
  return /@lid/i.test(String(numero || ''));
}

/**
 * Obtiene o crea un contacto por número de teléfono.
 * Acepta un `lid` opcional: cuando el remitente llegó como @lid (privacy-id),
 * `numeroTelefono` debería ser el número real visible (senderPhone) y `lid`
 * el JID de retorno (@lid) necesario para poder responderle.
 *
 * Si el contacto ya existe y recibimos un número real (que previamente
 * pudimos haber guardado como @lid), lo actualiza en caliente.
 *
 * @param {string} numeroTelefono - Número visible (real) o JID del remitente
 * @param {Object} datosOpcionales - { nombre, sucursal, lid } (opcional)
 * @returns {Promise<Object>} - Contacto
 */
async function findOrCreateContact(numeroTelefono, datosOpcionales = {}) {
  try {
    // Limpiar el número de teléfono (eliminar espacios, etc.)
    const numeroLimpio = String(numeroTelefono || '').trim();
    const { nombre, sucursal, lid } = datosOpcionales;

    // Buscar contacto existente (por el número visible o por el @lid previo)
    let contacto = await prisma.contacto.findUnique({
      where: { numero_telefono: numeroLimpio }
    });

    // Si el @lid ya existía bajo otro PK, buscarlo por lid_whatsapp
    if (!contacto && lid) {
      contacto = await prisma.contacto.findFirst({
        where: { lid_whatsapp: lid }
      });
    }

    if (!contacto) {
      // Crear contacto nuevo
      const crearDatos = {
        numero_telefono: numeroLimpio,
        nombre: nombre || null,
        sucursal: sucursal || null
      };
      // Guardar el @lid de retorno sólo cuando el número visible NO es un lid
      if (lid && !esLid(numeroLimpio)) {
        crearDatos.lid_whatsapp = lid;
      } else if (esLid(numeroLimpio)) {
        // Caso límite: no hubo número real; el visible es el propio @lid
        crearDatos.lid_whatsapp = numeroLimpio;
      }

      contacto = await prisma.contacto.create({ data: crearDatos });
      console.log(`✅ Contacto creado: ${numeroLimpio}`);
    } else {
      // Contacto existente: actualizar datos opcionales (nombre/sucursal/lid)
      const actualizarDatos = {};

      if (nombre) actualizarDatos.nombre = nombre;
      if (sucursal) actualizarDatos.sucursal = sucursal;

      // Si el PK era un @lid y ahora traemos un número real, actualizarlo
      if (lid && !esLid(numeroLimpio) && esLid(contacto.numero_telefono)) {
        actualizarDatos.lid_whatsapp = contacto.numero_telefono;
        actualizarDatos.numero_telefono = numeroLimpio;
      } else if (lid && !contacto.lid_whatsapp && !esLid(contacto.numero_telefono)) {
        actualizarDatos.lid_whatsapp = lid;
      }

      if (Object.keys(actualizarDatos).length > 0) {
        contacto = await prisma.contacto.update({
          where: { numero_telefono: contacto.numero_telefono },
          data: { ...actualizarDatos, actualizadoEn: new Date() }
        });
        console.log(`✏️ Contacto actualizado: ${contacto.numero_telefono}`);
      }
    }

    return contacto;
  } catch (error) {
    console.error('❌ Error en findOrCreateContact:', error);
    throw error;
  }
}

module.exports = { findOrCreateContact, limpiarNumero, esLid };
