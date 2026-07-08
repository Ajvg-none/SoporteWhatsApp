/**
 * Controlador para recibir webhooks de OpenWA
 * Endpoint público (no requiere autenticación)
 */
exports.receiveWebhook = async (req, res) => {
  try {
    const message = req.body;
    
    console.log('📨 ========================================');
    console.log('📨 WEBHOOK RECIBIDO DE OPENWA');
    console.log('📨 ========================================');
    console.log(JSON.stringify(message, null, 2));
    console.log('📨 ========================================\n');
    
    // Regla de descarte automático: ignorar mensajes de grupos
    // Según el diseño: "Si el payload del mensaje contiene un identificador de grupo,
    // la API responde con un estado 200 OK de inmediato pero ignora el registro"
    if (message.isGroupMsg || message.chatId?.includes('@g.us')) {
      console.log('⚠️ Mensaje de grupo ignorado');
      return res.status(200).json({ 
        status: 'ok', 
        message: 'Group message ignored' 
      });
    }
    
    // Extraer datos básicos del mensaje
    const {
      from,
      body,
      type,
      id: whatsappMessageId
    } = message;
    
    console.log(`📱 Mensaje de: ${from}`);
    console.log(`💬 Contenido: ${body || '[Archivo/Imagen]'}`);
    console.log(`🆔 WhatsApp Message ID: ${whatsappMessageId}`);
    console.log(`📎 Tipo: ${type || 'texto'}`);
    
    // Por ahora, solo respondemos OK
    // En el Sprint 1 implementaremos la lógica completa de creación de tickets
    
    res.status(200).json({ 
      status: 'ok',
      message: 'Webhook procesado correctamente'
    });
    
  } catch (error) {
    console.error('❌ Error en webhook:', error);
    res.status(500).json({ 
      error: 'Internal server error' 
    });
  }
};