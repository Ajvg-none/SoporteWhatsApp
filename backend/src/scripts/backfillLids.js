// backend/src/scripts/backfillLids.js
// Backfill idempotente de los remitentes @lid (privacy-id) que quedaron guardados
// con el ID raro como número visible.
//
// Para cada contacto cuyo numero_telefono termina en @lid (o cuyo lid_whatsapp lo sea),
// resuelve el número real vía el endpoint de OpenWA:
//   GET /api/sessions/:sessionId/contacts/:contactId/phone  → { contactId, phone }
// y actualiza:
//   - numero_telefono  → número real (si resuelve)
//   - lid_whatsapp     → el @lid (para poder responder)
// Aplica lo mismo en tickets (numero_cliente / lid_envio) que referencien esos números.
//
// Uso: npm run backfill-lids (desde backend/) con la DB y OpenWA levantados.
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const baseURL = process.env.OPENWA_API_URL || 'http://localhost:2785';
const apiKey = process.env.OPENWA_API_KEY;
const sessionId = process.env.OPENWA_INSTANCE_ID;

function esLid(numero) {
  return /@lid/i.test(String(numero || ''));
}

/**
 * Resuelve el número real de un @lid contra OpenWA.
 * @param {string} lid - JID @lid (con sufijo)
 * @returns {Promise<string|null>} número real en dígitos, o null
 */
async function resolverLid(lid) {
  try {
    const contactId = String(lid).replace(/@lid$/i, '');
    const { data } = await axios.get(
      `${baseURL}/api/sessions/${sessionId}/contacts/${contactId}/phone`,
      { headers: { 'X-API-Key': apiKey }, timeout: 20000 }
    );
    const phone = data?.phone || data?.data?.phone;
    return phone && phone !== 'null' && phone !== '' ? String(phone) : null;
  } catch (error) {
    console.error(`❌ No se pudo resolver ${lid}: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Iniciando backfill de @lid...');
  let actualizados = 0;

  // 1. Contactos que aún tienen @lid como número visible
  const contactos = await prisma.contacto.findMany({
    where: {
      OR: [
        { numero_telefono: { endsWith: '@lid' } },
        { numero_telefono: { in: [] } } // placeholder no-op
      ]
    }
  });

  // Prisma: buscar los que terminan en @lid no es trivial con el OR anterior; lo filtramos en JS
  const contactosLid = contactos.filter(c => esLid(c.numero_telefono));

  for (const c of contactosLid) {
    const real = await resolverLid(c.numero_telefono);
    if (real) {
      const nuevoNum = `${real}@c.us`;
      try {
        // Actualizar contacto: mover el @lid a lid_whatsapp y poner el número real
        await prisma.contacto.update({
          where: { numero_telefono: c.numero_telefono },
          data: {
            numero_telefono: nuevoNum,
            lid_whatsapp: c.numero_telefono,
            actualizadoEn: new Date()
          }
        });

        // Actualizar tickets que referenciaban el @lid
        await prisma.ticket.updateMany({
          where: { numeroCliente: c.numero_telefono },
          data: { numeroCliente: nuevoNum, lidEnvio: c.numero_telefono }
        });

        console.log(`✅ Contacto ${c.numero_telefono} → ${nuevoNum} (lid guardado)`);
        actualizados++;
      } catch (error) {
        console.error(`⚠️ No se pudo actualizar contacto ${c.numero_telefono}: ${error.message}`);
      }
    } else {
      console.log(`− ${c.numero_telefono} sin número real resuelto (se conserva)`);
    }
  }

  // 2. Tickets sueltos (sin contacto) que aún tengan @lid como numeroCliente
  const ticketsLid = await prisma.ticket.findMany({
    where: { numeroCliente: { endsWith: '@lid' } }
  });

  for (const t of ticketsLid) {
    // Ya procesados si pasamos por el contacto, pero por robustez intentar de nuevo
    if (esLid(t.numeroCliente)) {
      const real = await resolverLid(t.numeroCliente);
      if (real) {
        await prisma.ticket.update({
          where: { id: t.id },
          data: {
            numeroCliente: `${real}@c.us`,
            lidEnvio: t.numeroCliente,
            actualizadoEn: new Date()
          }
        });
        console.log(`✅ Ticket #${t.id}: ${t.numeroCliente} → ${real}@c.us`);
        actualizados++;
      }
    }
  }

  console.log(`\n🏁 Backfill terminado. ${actualizados} registro(s) actualizado(s).`);
}

main()
  .catch((e) => {
    console.error('❌ Error en backfill:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
