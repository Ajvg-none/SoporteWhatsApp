// backend/src/services/openwaService.js
const axios = require('axios');

class OpenWAService {
  constructor() {
    this.baseURL = process.env.OPENWA_API_URL || 'http://localhost:2785';
    this.apiKey = process.env.OPENWA_API_KEY;
    this.sessionId = process.env.OPENWA_INSTANCE_ID;
    this.timeout = 30000;
  }

  /**
   * Convierte un número (con o sin sufijo) en un chatId válido para OpenWA.
   * OpenWA espera el formato "5215512345678@c.us" (digitos@sufijo).
   * @param {string} numero - Número tal como está en la BD (puede traer @c.us/@g.us, espacios, guiones)
   * @returns {string} chatId
   */
  toChatId(numero) {
    const limpio = String(numero || '')
      .replace(/@c\.us|@g\.us/gi, '')
      .replace(/[\s\-\(\)]/g, '')
      .trim();
    return `${limpio}@c.us`;
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

    const response = await axios({
      method: 'POST',
      url: `${this.baseURL}/api/sessions/${this.sessionId}/messages/send-text`,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      data: payload,
      timeout: this.timeout
    });

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

    const response = await axios({
      method: 'POST',
      url: `${this.baseURL}/api/sessions/${this.sessionId}${endpoint}`,
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      data: payload,
      timeout: this.timeout
    });

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
