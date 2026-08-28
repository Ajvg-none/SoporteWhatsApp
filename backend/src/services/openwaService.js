// backend/src/services/openwaService.js
const axios = require('axios');
const fs = require('fs');
const { convertirAOpus } = require('./audioConverter');

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
        // Loguear el cuerpo de la respuesta de OpenWA (p.ej. "Invalid API key",
        // "IP address not allowed", "API key not authorized for this session")
        // para diagnosticar 401/403 sin mirar el audit log de OpenWA.
        if (error.response?.data) {
          console.error('📦 Respuesta de OpenWA:', JSON.stringify(error.response.data));
        }
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
   * Se prefiere enviar el archivo como base64 (leyendo `localPath`) porque OpenWA valida
   * `url` con @IsUrl() (requiere TLD) y su DTO rechaza hostnames sin TLD como `localhost`;
   * además evita el fetch remoto y la SSRF guard. La `url` se usa solo como fallback.
   * @param {string} to - Número de destino
   * @param {string} text - Texto/caption del mensaje
   * @param {{url?: string, localPath?: string, mimeType: string, fileName: string}} media
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

    // Preferir base64 (ruta local) sobre URL: robusto ante localhost/proxies/SSRF.
    let base64 = media.localPath
      ? fs.readFileSync(media.localPath).toString('base64')
      : undefined;

    // Si es audio, se convierte a Ogg/Opus y se marca como nota de voz (ptt).
    // WhatsApp solo reproduce notas de voz en Ogg/Opus; si se envían los bytes webm
    // tal cual con ptt:true, OpenWA falla (error "t: t"). Por eso se transcodifica
    // antes de armar el payload.
    let mimeType = media.mimeType;
    let fileName = media.fileName;
    if (media.mimeType?.startsWith('audio/') && base64) {
      try {
        const buffer = Buffer.from(base64, 'base64');
        const oggBuffer = await convertirAOpus(buffer, media.fileName);
        base64 = oggBuffer.toString('base64');
        mimeType = 'audio/ogg; codecs=opus';
        fileName = (media.fileName || 'nota-de-voz').replace(/\.[a-z0-9]+$/i, '') + '.ogg';
      } catch (error) {
        console.error('❌ No se pudo convertir el audio, se envía sin ptt:', error.message);
      }
    }

    const payload = {
      chatId: this.toChatId(to),
      // base64 sin campo `url`: OpenWA omite la validación @IsUrl cuando base64 está presente
      ...(base64 ? { base64 } : { url: media.url }),
      mimetype: mimeType,
      filename: fileName,
      caption: text || undefined
    };

    // Si es audio, marcarlo como nota de voz (ptt). Si la conversión a Ogg/Opus
    // falló, NO se marca ptt para evitar el error "t: t" en OpenWA.
    if (media.mimeType?.startsWith('audio/') && mimeType === 'audio/ogg; codecs=opus') {
      payload.ptt = true;
    }

    console.log(`📤 Enviando archivo a OpenWA: ${payload.chatId}`);
    console.log(`📎 Archivo: ${media.fileName || media.url} (${base64 ? 'base64' : 'url'})`);

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

  /**
   * Determina el chatId de ENVÍO a partir de un contacto o ticket.
   * Si el remitente es un @lid (privacy-id) y guardamos su número real en
   * `numero_telefono`, para poder responder hay que escribir al @lid.
   * Se prioriza:
   *   1. `lid` explícito (ticket.lidEnvio o contacto.lid_whatsapp)
   *   2. el propio `numero` si ya viene con @lid
   *   3. el `numero` como @c.us
   * @param {{ numero?: string, lid?: string|null }} destino
   * @returns {string} chatId para OpenWA
   */
  toChatIdEnvio({ numero, lid }) {
    if (lid && /@lid/i.test(String(lid))) {
      return this.toChatId(lid);
    }
    if (numero && /@lid/i.test(String(numero))) {
      return this.toChatId(numero);
    }
    return this.toChatId(numero);
  }
}

module.exports = new OpenWAService();
