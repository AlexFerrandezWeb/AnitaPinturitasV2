# Instrucciones para Configurar Stripe

## Paso 1: Obtener tu Clave Secreta de Stripe

1. Ve a https://stripe.com y crea una cuenta (o inicia sesión si ya tienes una)
2. Ve al Dashboard: https://dashboard.stripe.com/test/apikeys
3. Copia tu **Secret key** (empieza con `sk_test_` para modo prueba)

## Paso 2: Configurar el archivo .env

1. Abre el archivo `.env` en la raíz del proyecto
2. Reemplaza `sk_test_tu_clave_aqui` con tu clave secreta real:

```
STRIPE_SECRET_KEY=sk_test_51ABC123...tu_clave_completa_aqui
SUCCESS_URL=http://localhost:3000
CANCEL_URL=http://localhost:3000
PORT=3000
```

## Paso 3: Iniciar el Servidor Backend

Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
npm start
```

O para desarrollo con auto-reload:

```bash
npm run dev
```

Deberías ver:
```
Servidor corriendo en http://localhost:3000
Asegúrate de configurar STRIPE_SECRET_KEY en tu archivo .env
```

## Paso 4: Verificar que el Backend Funciona

Abre tu navegador y ve a:
```
http://localhost:3000/api/health
```

Deberías ver: `{"status":"ok","message":"Servidor funcionando correctamente"}`

## Paso 5: Probar el Carrito

1. Añade productos al carrito en tu página web
2. Abre el carrito
3. Haz clic en "PROCEDER AL PAGO"
4. Deberías ser redirigido a Stripe Checkout

## Modo Prueba vs Producción

- **Modo Prueba:** Usa claves que empiezan con `sk_test_`
  - Los pagos no son reales
  - Usa tarjetas de prueba: 4242 4242 4242 4242

- **Modo Producción:** Usa claves que empiezan con `sk_live_`
  - Los pagos son reales
  - Se requieren tarjetas reales

## Solución de Problemas

**Error: "Invalid API Key"**
- Verifica que copiaste toda la clave secreta correctamente
- Asegúrate de no tener espacios al inicio o final
- Verifica que la clave empiece con `sk_test_` o `sk_live_`

**Error: "Servidor no responde"**
- Verifica que el servidor esté corriendo: `npm start`
- Verifica que no haya otro proceso usando el puerto 3000
- Revisa la consola del servidor para ver errores

**Error CORS en el navegador**
- El servidor ya tiene CORS habilitado
- Verifica que la URL del backend en `js/carrito.js` sea correcta
- Debe ser: `http://localhost:3000` para desarrollo local

