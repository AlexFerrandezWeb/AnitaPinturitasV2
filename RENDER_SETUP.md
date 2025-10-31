# Configuración en Render

## Variables de Entorno en Render

Cuando despliegues el backend en Render, configura estas variables de entorno en tu dashboard:

1. Ve a tu servicio en Render
2. Ve a **Environment** (Variables de Entorno)
3. Añade estas variables:

### Variables Requeridas

- **`STRIPE_SECRET_KEY`**
  - Valor: Tu clave secreta de Stripe (empieza con `sk_live_` o `sk_test_`)
  - Ejemplo: `sk_live_51ABC123...tu_clave_completa`
  - ⚠️ Importante: Usa la clave SECRETA, no la pública

### Variables Opcionales

- **`SUCCESS_URL`**
  - Valor: URL de tu sitio web + `/html/success.html`
  - Ejemplo: `https://tudominio.com`
  - Por defecto: `http://localhost:3000`

- **`CANCEL_URL`**
  - Valor: URL de tu sitio web + `/html/cancel.html`
  - Ejemplo: `https://tudominio.com`
  - Por defecto: `http://localhost:3000`

- **`PORT`**
  - Valor: Puerto del servidor (Render lo asigna automáticamente)
  - Por defecto: `3000`
  - ⚠️ No cambies esto en Render, usa la variable `PORT` que Render proporciona

## Actualizar Frontend para Usar Render

Una vez que tu backend esté desplegado en Render:

1. Copia la URL de tu servicio en Render
   - Ejemplo: `https://tu-backend.onrender.com`

2. Edita `js/carrito.js`
   - Busca: `const BACKEND_URL = 'http://localhost:3000';`
   - Cambia a: `const BACKEND_URL = 'https://tu-backend.onrender.com';`

3. Actualiza las URLs de éxito y cancelación en Render:
   - `SUCCESS_URL=https://tudominio.com`
   - `CANCEL_URL=https://tudominio.com`

## Estructura del Proyecto en Render

- **Build Command:** `npm install`
- **Start Command:** `node server.js`
- **Environment:** `Node`

## Seguridad

✅ **Correcto:**
- Variables de entorno en Render (no en el código)
- Archivo `.env` en `.gitignore`
- Usar claves de prueba (`sk_test_`) para desarrollo

❌ **Incorrecto:**
- Subir `.env` a git
- Hardcodear claves en el código
- Compartir claves secretas

## Verificar que Funciona

1. Despliega el backend en Render
2. Ve a: `https://tu-backend.onrender.com/api/health`
3. Deberías ver: `{"status":"ok","message":"Servidor funcionando correctamente"}`
4. Prueba el botón "PROCEDER AL PAGO" en tu sitio web

