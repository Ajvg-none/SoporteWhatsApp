// backend/src/middlewares/verificarFirmaOpenWA.js
const crypto = require('crypto');

/**
 * Verifica la firma HMAC de OpenWA (header X-OpenWA-Signature: sha256=<hex>)
 * sobre el body CRUDO (Buffer). Debe ejecutarse después de express.raw({ type: 'application/json' }).
 *
 * OpenWA firma los bytes exactos del payload con HMAC-SHA256 y el `secret`
 * del webhook registrado. El secret se lee de OPENWA_WEBHOOK_SECRET.
 */
function verificarFirmaOpenWA(req, res, next) {
  const secreto = process.env.OPENWA_WEBHOOK_SECRET;

  // Secret no configurado: se acepta (solo desarrollo). En producción debe estar definido.
  if (!secreto) {
    console.warn('⚠️ OPENWA_WEBHOOK_SECRET no configurado: webhook sin verificación de firma');
    return next();
  }

  const firma = req.headers['x-openwa-signature'];
  if (!firma) {
    return res.status(401).json({ error: 'Firma ausente' });
  }

  const esperado = `sha256=${crypto.createHmac('sha256', secreto).update(req.body).digest('hex')}`;

  try {
    const a = Buffer.from(String(firma));
    const b = Buffer.from(esperado);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return res.status(401).json({ error: 'Firma inválida' });
    }
  } catch (error) {
    console.error('❌ Error verificando firma:', error.message);
    return res.status(401).json({ error: 'Firma inválida' });
  }

  next();
}

module.exports = verificarFirmaOpenWA;
