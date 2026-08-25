================================================================================
GUÍA DE IMPLEMENTACIÓN: OPENWA ↔ CRM SOPORTE WHATSAPP
================================================================================
Fecha: 2026-08-26
Proyecto: SoporteWhatsApp (CRM) + OpenWA (Gateway WhatsApp)
================================================================================

PENDIENTE #1: DB DRIFT (PRISMA) - BLOQUEANTE -- COMPLETADO
================================================================================

OPCIÓN A: Si la tabla está vacía o puedes borrar datos (MÁS RÁPIDO)
--------------------------------------------------------------------------------
cd C:\Users\Sistemas\Desktop\SoporteWhatsApp\backend

# 1. Ver qué cambios propone Prisma (sin ejecutar aún)
npx prisma db push --accept-data-loss --skip-generate

# 2. Si te avisa que va a borrar datos y estás OK, ejecuta:
npx prisma db push --accept-data-loss

# 3. Regenerar el cliente de Prisma
npx prisma generate

--------------------------------------------------------------------------------

OPCIÓN B: Si la tabla tiene datos importantes (MÁS SEGURO)
--------------------------------------------------------------------------------
# 1. Primero, haz backup de la tabla
#    Conecta a tu PostgreSQL (pgAdmin, DBeaver, psql) y ejecuta:
COPY numeros_excluidos TO '/tmp/numeros_excluidos_backup.csv' WITH CSV HEADER;

# 2. Limpia la tabla (si los datos son viejos/inservibles)
TRUNCATE TABLE numeros_excluidos;

# 3. Ahora sí, sincroniza
cd C:\Users\Sistemas\Desktop\SoporteWhatsApp\backend
npx prisma db push --accept-data-loss

# 4. Regenerar cliente
npx prisma generate

--------------------------------------------------------------------------------

OPCIÓN C: Migración controlada (PRODUCCIÓN)
--------------------------------------------------------------------------------
cd C:\Users\Sistemas\Desktop\SoporteWhatsApp\backend

# 1. Crear una migración explícita (genera archivo SQL)
npx prisma migrate dev --name add_campos_numeros_excluidos

# 2. Revisar el SQL generado en prisma/migrations/

# 3. Ejecutar la migración
npx prisma migrate deploy


================================================================================
PENDIENTE #2: BUILD FRONTEND (NO BLOQUEANTE) -- COMPLETADO
================================================================================

cd C:\Users\Sistemas\Desktop\SoporteWhatsApp\frontend

# Instalar dependencias faltantes (chart.js)
npm install chart.js vue-chartjs

# O si usas yarn:
# yarn add chart.js vue-chartjs


================================================================================
PENDIENTE #3: FASE 0 OPERATIVA (CONFIGURACIÓN COMPLETA)
================================================================================

PASO 3.1: CONFIGURAR VARIABLES DE ENTORNO DEL CRM
--------------------------------------------------------------------------------
Edita: C:\Users\Sistemas\Desktop\SoporteWhatsApp\backend\.env

Añade o modifica estas líneas:

# OpenWA Configuration
OPENWA_API_URL=http://localhost:2785
OPENWA_API_KEY=owa_k1_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
OPENWA_INSTANCE_ID=8f3c2b1a-9d4e-4c7a-8b2f-1e6d5a4c3b2a
OPENWA_WEBHOOK_SECRET=un_secreto_largo_y_aleatorio_de_al_menos_32_caracteres

NOTAS:
- OPENWA_API_KEY: Se genera cuando creas la API Key en OpenWA (te la muestra una vez)
- OPENWA_INSTANCE_ID: Es el UUID que te devuelve POST /api/sessions (lo obtienes en el Paso 3.3)
- OPENWA_WEBHOOK_SECRET: Lo inventas tú (mínimo 32 caracteres, ej: openssl rand -hex 32)

--------------------------------------------------------------------------------

PASO 3.2: CONFIGURAR VARIABLES DE ENTORNO DE OPENWA
--------------------------------------------------------------------------------
Edita o crea: C:\Users\Sistemas\Desktop\OpenWA\.env

NODE_ENV=development
PORT=2785
AUTO_START_SESSIONS=true
SSRF_ALLOWED_HOSTS=localhost,127.0.0.1
RESOLVE_LID_TO_PHONE=true
ENGINE_TYPE=whatsapp-web.js

NOTA: SSRF_ALLOWED_HOSTS debe incluir el host donde corre tu CRM. 
Si ambos corren en la misma máquina, localhost y 127.0.0.1 son suficientes.

--------------------------------------------------------------------------------

PASO 3.3: LEVANTAR OPENWA Y CREAR SESIÓN
--------------------------------------------------------------------------------

# 1. Levantar OpenWA
cd C:\Users\Sistemas\Desktop\OpenWA
docker compose up -d

# 2. Verificar que está corriendo
curl http://localhost:2785/api/health

# 3. Crear sesión (necesitas una API Key ADMIN primero)
#    3.1 Entra al dashboard: http://localhost:2785
#    3.2 Ve a "API Keys" y crea una clave ADMIN
#    3.3 Usa esa clave para crear la sesión:

curl -X POST http://localhost:2785/api/sessions ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: TU_API_KEY_ADMIN" ^
  -d "{\"name\": \"soporte-nacional\"}"

# COPIA EL UUID QUE TE DEVUELVE (ese es tu OPENWA_INSTANCE_ID)
# Ejemplo de respuesta: { "id": "8f3c2b1a-9d4e-4c7a-8b2f-1e6d5a4c3b2a", ... }

# 4. Iniciar la sesión
curl -X POST http://localhost:2785/api/sessions/UUID_QUE_COPIASTE/start ^
  -H "X-API-Key: TU_API_KEY_ADMIN"

# 5. Escanear QR
curl http://localhost:2785/api/sessions/UUID_QUE_COPIASTE/qr ^
  -H "X-API-Key: TU_API_KEY_ADMIN"

# La respuesta será algo como:
# { "qrCode": "data:image/png;base64,iVBORw0KGgoAAA...", "status": "qr_ready" }

# 6. Abre la URL data:image/png;base64,... en tu navegador
#    y escanea con el WhatsApp del número de soporte

--------------------------------------------------------------------------------

PASO 3.4: CREAR API KEY OPERATOR PARA EL CRM
--------------------------------------------------------------------------------

curl -X POST http://localhost:2785/api/auth/api-keys ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: TU_API_KEY_ADMIN" ^
  -d "{
    \"name\": \"CRM Soporte\",
    \"role\": \"OPERATOR\",
    \"allowedSessions\": [\"UUID_QUE_COPIASTE\"],
    \"allowedIps\": [\"127.0.0.1\"]
  }"

# COPIA LA API KEY QUE TE DEVUELVE (esa es tu OPENWA_API_KEY)
# ¡IMPORTANTE! Se muestra UNA SOLA VEZ. Guárdala en backend/.env

--------------------------------------------------------------------------------

PASO 3.5: REGISTRAR EL WEBHOOK EN OPENWA
--------------------------------------------------------------------------------

curl -X POST http://localhost:2785/api/sessions/UUID_QUE_COPIASTE/webhooks ^
  -H "Content-Type: application/json" ^
  -H "X-API-Key: TU_API_KEY_ADMIN" ^
  -d "{
    \"url\": \"http://localhost:3000/api/webhooks/whatsapp\",
    \"events\": [\"message.received\"],
    \"secret\": \"un_secreto_largo_y_aleatorio_de_al_menos_32_caracteres\"
  }"

NOTAS:
- El "secret" debe ser el MISMO que pusiste en OPENWA_WEBHOOK_SECRET en backend/.env
- En producción, cambia localhost:3000 por tu dominio público o IP


================================================================================
PASO 4: REINICIAR BACKEND DEL CRM
================================================================================

cd C:\Users\Sistemas\Desktop\SoporteWhatsApp\backend

# Si ya está corriendo, deténlo (Ctrl+C) y reinicia:
npm install
npx prisma generate
npm run dev

# O si usas PM2:
# pm2 restart backend


================================================================================
PASO 5: PRUEBAS FINALES END-TO-END
================================================================================

PRUEBA 1: Verificar que OpenWA está corriendo
--------------------------------------------------------------------------------
curl http://localhost:2785/api/health
# Debe responder: { "status": "ok", ... }

PRUEBA 2: Verificar que el backend del CRM está corriendo
--------------------------------------------------------------------------------
curl http://localhost:3000/api/health
# Debe responder: { "status": "ok", ... }

PRUEBA 3: Probar webhook negativo (HMAC inválido → 401)
--------------------------------------------------------------------------------
curl -X POST http://localhost:3000/api/webhooks/whatsapp ^
  -H "Content-Type: application/json" ^
  -H "X-OpenWA-Signature: sha256=firma_invalida" ^
  -d "{\"event\":\"message.received\",\"data\":{}}"

# Debe responder: 401 { "error": "Firma inválida" }

PRUEBA 4: Enviar mensaje de prueba desde WhatsApp
--------------------------------------------------------------------------------
1. Desde tu celular personal (u otro número), envía un mensaje al número de 
   soporte de WhatsApp que vinculaste con OpenWA.

2. Revisa los logs del backend del CRM. Deberías ver:
   - "📨 Broadcast: nuevo_mensaje_ticket"
   - El ticket creado en la base de datos

3. Abre el CRM en tu navegador (http://localhost:5173)
4. Ve a la sección de Tickets
5. Deberías ver el nuevo ticket creado con el mensaje

PRUEBA 5: Responder desde el CRM
--------------------------------------------------------------------------------
1. En el CRM, abre el ticket que se creó
2. Escribe una respuesta y envíala
3. Verifica que el mensaje llega al WhatsApp desde el que enviaste el mensaje

PRUEBA 6: Verificar tiempo real (Socket.IO)
--------------------------------------------------------------------------------
1. Abre el CRM en DOS pestañas/navegadores diferentes
2. En una pestaña, envía un mensaje desde WhatsApp
3. En la otra pestaña, el mensaje debería aparecer AUTOMÁTICAMENTE sin 
   necesidad de recargar la página

PRUEBA 7: Verificar media (imágenes/archivos)
--------------------------------------------------------------------------------
1. Envía una imagen desde WhatsApp al número de soporte
2. Verifica que se crea el ticket y la imagen se guarda en /uploads/
3. Responde desde el CRM con una imagen/archivo
4. Verifica que llega al WhatsApp


================================================================================
RESUMEN DE ARCHIVOS MODIFICADOS (OpenCode ya los actualizó)
================================================================================

Backend:
✓ backend/src/services/openwaService.js
✓ backend/src/middlewares/verificarFirmaOpenWA.js (NUEVO)
✓ backend/src/routes/webhook.js
✓ backend/src/app.js
✓ backend/src/controllers/webhookController.js
✓ backend/src/controllers/ticketController.js
✓ backend/src/services/socketService.js

Frontend:
✓ frontend/src/views/TicketsView.vue
✓ frontend/src/views/TicketDetailView.vue


================================================================================
SOLUCIÓN DE PROBLEMAS COMUNES
================================================================================

PROBLEMA: "Tabla numeros_excluidos no existe o tiene columnas faltantes"
SOLUCIÓN: Ejecuta el Pendiente #1 (db push) antes de continuar

PROBLEMA: "OPENWA_INSTANCE_ID='default' no funciona"
SOLUCIÓN: Debes crear una sesión real con POST /api/sessions y usar el UUID
          que devuelve (Paso 3.3)

PROBLEMA: "Webhook no recibe mensajes"
SOLUCIÓN: 
1. Verifica que el webhook esté registrado en OpenWA:
   curl http://localhost:2785/api/sessions/UUID/webhooks -H "X-API-Key: ..."
2. Verifica que SSRF_ALLOWED_HOSTS incluya localhost
3. Revisa los logs de OpenWA: docker logs openwa

PROBLEMA: "Los mensajes se envían pero no llegan"
SOLUCIÓN:
1. Verifica que el número tenga @c.us: debe ser "5215512345678@c.us"
2. Revisa que la sesión esté activa: 
   curl http://localhost:2785/api/sessions/UUID -H "X-API-Key: ..."
3. Verifica message.ack para confirmar entrega

PROBLEMA: "Firma HMAC inválida"
SOLUCIÓN:
1. Verifica que OPENWA_WEBHOOK_SECRET en backend/.env sea el MISMO que
   registraste en el webhook de OpenWA
2. Asegúrate de que routes/webhook.js use express.raw({ type: 'application/json' })
   ANTES del controller

PROBLEMA: "OpenWA no puede descargar media del CRM (SSRF)"
SOLUCIÓN: Añade el host del CRM a SSRF_ALLOWED_HOSTS en .env de OpenWA:
          SSRF_ALLOWED_HOSTS=localhost,127.0.0.1,mi-crm.local


================================================================================
PRÓXIMOS PASOS (DESPUÉS DE ESTA IMPLEMENTACIÓN)
================================================================================

1. Fase 6 (mejoras no bloqueantes):
   - Bridge QR/estado hacia el frontend del CRM
   - Confirmación de entrega (message.ack)
   - Media bajo demanda (cuando viene como { omitted: true })

2. Monitoreo:
   - Configurar alertas cuando la sesión caiga
   - Monitorear mensajes fallidos
   - Revisar logs de OpenWA periódicamente

3. Producción:
   - Usar PostgreSQL en lugar de SQLite
   - Configurar HTTPS (reverse proxy con Nginx/Traefik)
   - Backups automáticos de la base de datos
   - Variables de entorno en .env.production


================================================================================
CONTACTO Y DOCUMENTACIÓN
================================================================================

Documentación de OpenWA: C:\Users\Sistemas\Desktop\OpenWA\docs\
Dashboard de OpenWA: http://localhost:2785
Swagger API: http://localhost:2785/api/docs (si ENABLE_SWAGGER=true)
CRM: http://localhost:5173 (frontend) / http://localhost:3000 (backend)

================================================================================
FIN DEL DOCUMENTO
================================================================================