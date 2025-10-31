# Backend para Stripe Checkout

Este backend permite procesar pagos con Stripe creando sesiones de checkout dinámicamente basadas en el contenido del carrito.

## Instalación

1. **Instalar dependencias:**
```bash
npm install
```

2. **Configurar variables de entorno:**
   - Copia el archivo `.env.example` a `.env`
   - Obtén tu clave secreta de Stripe desde: https://dashboard.stripe.com/apikeys
   - Edita `.env` y añade tu clave secreta:
```
STRIPE_SECRET_KEY=sk_test_tu_clave_aqui
```

3. **Configurar URLs de éxito y cancelación:**
   - Edita `.env` para configurar las URLs después del pago:
```
SUCCESS_URL=http://localhost:3000
CANCEL_URL=http://localhost:3000
```

## Uso

### Desarrollo Local

1. **Iniciar el servidor:**
```bash
npm start
```
O para desarrollo con auto-reload:
```bash
npm run dev
```

2. **Configurar el frontend:**
   - Edita `js/carrito.js`
   - Busca la línea: `const BACKEND_URL = 'http://localhost:3000';`
   - Asegúrate de que la URL coincida con la de tu servidor

3. **El servidor estará corriendo en:**
   - `http://localhost:3000`

### Producción

1. **Desplegar el backend** en un servicio como:
   - Heroku
   - Railway
   - Vercel (con servidor)
   - AWS/Google Cloud
   - Etc.

2. **Actualizar la URL del backend** en `js/carrito.js`:
   - Cambia `const BACKEND_URL = 'http://localhost:3000';` a tu URL de producción
   - Ejemplo: `const BACKEND_URL = 'https://api.tudominio.com';`

3. **Configurar variables de entorno en tu servicio de hosting**

## Endpoints

### POST `/api/create-checkout-session`
Crea una sesión de checkout de Stripe con los productos del carrito.

**Body:**
```json
{
  "items": [
    {
      "id": "producto1",
      "nombre": "Producto 1",
      "precio": 29.99,
      "cantidad": 2,
      "imagen": "url_de_imagen"
    }
  ],
  "total": 59.98
}
```

**Response:**
```json
{
  "checkout_url": "https://checkout.stripe.com/...",
  "session_id": "cs_test_..."
}
```

### GET `/api/checkout-session/:sessionId`
Obtiene información sobre una sesión de checkout.

### GET `/api/health`
Verifica que el servidor está funcionando.

## Configuración de Stripe

1. **Crear cuenta en Stripe:** https://stripe.com
2. **Obtener claves API:**
   - Ve a https://dashboard.stripe.com/apikeys
   - Copia tu **Secret Key** (empieza con `sk_test_` para modo prueba)
   - Añádela a tu archivo `.env`

3. **Modo de prueba vs Producción:**
   - Usa claves de **test** para desarrollo (`sk_test_...`)
   - Usa claves de **live** para producción (`sk_live_...`)

## Solución de Problemas

- **Error: "Invalid API Key"**
  - Verifica que tu `STRIPE_SECRET_KEY` en `.env` sea correcta
  - Asegúrate de no tener espacios extra

- **Error: "CORS"**
  - El servidor ya tiene CORS habilitado
  - Si persiste, verifica la URL del backend en `js/carrito.js`

- **El botón no funciona**
  - Verifica que el servidor backend esté corriendo
  - Abre la consola del navegador para ver errores
  - Verifica la URL del backend en `js/carrito.js`

