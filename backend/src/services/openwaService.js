// backend/src/services/openwaService.js
const axios = require('axios');

// Estados transitorios que conviene reintentar: un 400 RecipientUnreachable
// (resolución de número intermitente en whatsapp-web.js, getNumberId rate-limited)
// y un 429 (send pacing / throttler). Los 5xx se EXCLUYEN a propósito: en wwjs un
// error puede lanzarse DESPUÉS de que el mensaje ya salió a la red, y reintentar
// ahí duplicaría el envío al cliente.
const ESTADOS_REINTENTABLES = [400, 429];

/**
 * Ejecuta `fn` con reintentos en errores transitorios (400/429).
 * @param {() => Promise<any>} fn
 * @param {number} intentos - Intentos totales (default 3)
 * @param {number} baseDelayMs - Retraso base entre intentos (default 300ms)
 */
async function conReintentos(fn, intentos = 3, baseDelayMs = 300) {
  let ultimoError;
  for (let i = 0; i < intentos; i++) {
    try {
      return await fn();
    } catch (error) {
      ultimoError = error;
      const status = error.response?.status;
      const esReintentable = ESTADOS_REINTENTABLES.includes(status);
      if (!esReintentable || i === intentos - 1) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, i);
      console.log(`🔁 Reintentando envío a OpenWA (intento ${i + 2}/${intentos}, HTTP ${status}) en ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw ultimoError;
}

class OpenWAService {
  constructor() {
    this.baseURL = process.env.OPENWA_API_URL || 'http://localhost:2785';
    this.apiKey = process.env.OPENWA_API_KEY;
    this.sessionId = process.env.OPENWA_INSTANCE_ID;
    this.timeout = 30000;
  }

  /**
   * Convierte un número (con o sin sufijo) en un chatId válido para OpenWA.
   * OpenWA espera el formato "5215512345678@c.us" (digitos@sufijo) o "1628...@lid".
   * Si el número viene como @lid (remitente migrado a privacy-id), se conserva @lid:
   * enviar directo al @lid evita la sonda getNumberId que puede fallar (RecipientUnreachable).
   * @param {string} numero - Número tal como está en la BD (puede traer @c.us/@g.us/@lid, espacios, guiones)
   * @returns {string} chatId
   */
  toChatId(numero) {
    const s = String(numero || '').trim();
    const esLid = /@lid/i.test(s);
    const sufijo = esLid ? '@lid' : '@c.us';
    const limpio = s
      .replace(/@c\.us|@g\.us|@lid/gi, '')
      .replace(/[\s\-\(\)]/g, '')
      .trim();
    return `${limpio}${sufijo}`;
  }

  /**
   * Envía un mensaje de texto a través de OpenWA.
   * OpenWA espera el payload { chatId, text }.
   * @param {string} to - Número de destino
   * @param {string} text - Texto del mensaje
   * @param {object} options - Opcionales (quotedMessageId, mentions, linkPreview)
   * @returns {Promise<{messageId: string, timestamp: number}>}
   */
  async sendMessage(to, text, options = {}) {
    const payload = {
      chatId: this.toChatId(to),
      text: text || '',
      ...options
    };

    console.log(`📤 Enviando mensaje a OpenWA: ${payload.chatId}`);
    console.log(`📝 Texto: ${text || '[Sin texto]'}`);

    const response = await conReintentos(() =>
      axios({
        method: 'POST',
        url: `${this.baseURL}/api/sessions/${this.sessionId}/messages/send-text`,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: payload,
        timeout: this.timeout
      })
    );

    console.log(`✅ Mensaje enviado a OpenWA, ID: ${response.data?.messageId || 'desconocido'}`);
    return response.data;
  }

  /**
   * Envía un mensaje con archivo a través de OpenWA.
   * OpenWA espera un DTO plano { chatId, url|base64, mimetype, filename, caption }.
   * @param {string} to - Número de destino
   * @param {string} text - Texto/caption del mensaje
   * @param {{url: string, mimeType: string, fileName: string}} media
   * @returns {Promise<{messageId: string, timestamp: number}>}
   */
  async sendMedia(to, text, media) {
    // Determinar el endpoint según el tipo de archivo
    let endpoint = '';
    if (media.mimeType?.startsWith('image/')) {
      endpoint = '/messages/send-image';
    } else if (media.mimeType?.startsWith('video/')) {
      endpoint = '/messages/send-video';
    } else if (media.mimeType?.startsWith('audio/')) {
      endpoint = '/messages/send-audio';
    } else {
      endpoint = '/messages/send-document';
    }

    const payload = {
      chatId: this.toChatId(to),
      url: media.url,
      mimetype: media.mimeType,
      filename: media.fileName,
      caption: text || undefined
    };

    console.log(`📤 Enviando archivo a OpenWA: ${payload.chatId}`);
    console.log(`📎 Archivo: ${media.fileName || media.url}`);

    const response = await conReintentos(() =>
      axios({
        method: 'POST',
        url: `${this.baseURL}/api/sessions/${this.sessionId}${endpoint}`,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: payload,
        timeout: this.timeout
      })
    );

    console.log(`✅ Archivo enviado a OpenWA, ID: ${response.data?.messageId || 'desconocido'}`);
    return response.data;
  }

  /**
   * Formatea el número de teléfono para OpenWA (legacy, mantiene compatibilidad).
   * Ahora usa toChatId() que devuelve el formato completo con @c.us.
   */
  formatPhoneNumber(phone) {
    return this.toChatId(phone).replace('@c.us', '');
  }
}

module.exports = new OpenWAService();
