// backend/src/services/openwaService.js
const axios = require('axios');

class OpenWAService {
  constructor() {
    this.baseURL = process.env.OPENWA_API_URL || 'http://localhost:2785';
    this.apiKey = process.env.OPENWA_API_KEY;
    this.instanceId = process.env.OPENWA_INSTANCE_ID || 'default';
    this.timeout = 30000;
  }

  /**
   * Envía un mensaje de texto a través de OpenWA
   */
  async sendMessage(to, text, options = {}) {
    try {
      const payload = {
        to: this.formatPhoneNumber(to),
        text: text || '',
        ...options
      };

      console.log(`📤 Enviando mensaje a OpenWA: ${to}`);
      console.log(`📝 Texto: ${text || '[Sin texto]'}`);

      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}/api/sessions/${this.instanceId}/messages/send-text`,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: payload,
        timeout: this.timeout
      });

      console.log(`✅ Mensaje enviado a OpenWA, ID: ${response.data?.id || 'desconocido'}`);
      return response.data;

    } catch (error) {
      console.error('❌ Error enviando mensaje a OpenWA:', error.message);
      if (error.response) {
        console.error('🔴 Respuesta de OpenWA:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Envía un mensaje con archivo a través de OpenWA
   */
  async sendMedia(to, text, media) {
    try {
      const payload = {
        to: this.formatPhoneNumber(to),
        text: text || '',
        media: {
          url: media.url,
          mimeType: media.mimeType,
          fileName: media.fileName
        }
      };

      // Determinar el endpoint según el tipo de archivo
      let endpoint = '';
      if (media.mimeType?.startsWith('image/')) {
        endpoint = `/api/sessions/${this.instanceId}/messages/send-image`;
      } else if (media.mimeType?.startsWith('video/')) {
        endpoint = `/api/sessions/${this.instanceId}/messages/send-video`;
      } else if (media.mimeType?.startsWith('audio/')) {
        endpoint = `/api/sessions/${this.instanceId}/messages/send-audio`;
      } else {
        endpoint = `/api/sessions/${this.instanceId}/messages/send-document`;
      }

      console.log(`📤 Enviando archivo a OpenWA: ${to}`);
      console.log(`📎 Archivo: ${media.fileName || media.url}`);

      const response = await axios({
        method: 'POST',
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: payload,
        timeout: this.timeout
      });

      console.log(`✅ Archivo enviado a OpenWA, ID: ${response.data?.id || 'desconocido'}`);
      return response.data;

    } catch (error) {
      console.error('❌ Error enviando archivo a OpenWA:', error.message);
      if (error.response) {
        console.error('🔴 Respuesta de OpenWA:', error.response.data);
      }
      throw error;
    }
  }

  /**
   * Formatea el número de teléfono para OpenWA
   */
  formatPhoneNumber(phone) {
    // Eliminar espacios, guiones, etc.
    let clean = phone.replace(/[\s\-\(\)]/g, '');
    
    // Eliminar @c.us si viene de la BD
    clean = clean.replace('@c.us', '');
    
    // Si no tiene código de país, asumir 521 (México)
    if (!clean.startsWith('52') && !clean.startsWith('34')) {
      if (clean.startsWith('1')) {
        clean = '52' + clean;
      } else {
        clean = '521' + clean;
      }
    }
    
    return clean;
  }
}

module.exports = new OpenWAService();