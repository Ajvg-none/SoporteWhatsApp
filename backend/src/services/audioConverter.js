// backend/src/services/audioConverter.js
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const { PassThrough } = require('stream');

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

/**
 * Convierte un audio (webm/opus u otro que ffmpeg pueda leer) a Ogg/Opus, el único
 * codec que WhatsApp acepta como nota de voz (ptt). Sin esta conversión, WhatsApp
 * rechaza los bytes webm al marcarlos como nota de voz (error "t: t" de OpenWA).
 * @param {Buffer} inputBuffer - Bytes del audio tal como se grabó (p.ej. webm/opus).
 * @param {string} [nombreOriginal] - Nombre del archivo original (solo para logs).
 * @returns {Promise<Buffer>} Bytes del audio convertido a Ogg/Opus.
 */
function convertirAOpus(inputBuffer, nombreOriginal = 'audio') {
  return new Promise((resolve, reject) => {
    if (!inputBuffer || inputBuffer.length === 0) {
      reject(new Error('Buffer de audio vacío, no se puede convertir'));
      return;
    }

    const inputStream = new PassThrough();
    inputStream.end(inputBuffer);

    const chunks = [];
    ffmpeg(inputStream)
      .on('error', (err) => {
        console.error(`🎧 Error convirtiendo audio (${nombreOriginal}):`, err.message);
        reject(new Error(`No se pudo convertir el audio a Ogg/Opus: ${err.message}`));
      })
      .on('end', () => {
        const output = Buffer.concat(chunks);
        console.log(
          `🎧 Audio convertido (${nombreOriginal}): ${inputBuffer.length} -> ${output.length} bytes (ogg/opus)`
        );
        resolve(output);
      })
      .addOutputOptions([
        '-c:a libopus',
        '-b:a 48k',
        '-ar 48000',
        '-ac 1',
        '-f ogg'
      ])
      .toFormat('ogg')
      .pipe()
      .on('data', (chunk) => chunks.push(chunk))
      .on('error', (err) => {
        console.error('🎧 Error en el stream de salida de conversión:', err.message);
        reject(new Error(`No se pudo convertir el audio: ${err.message}`));
      });
  });
}

module.exports = { convertirAOpus };
