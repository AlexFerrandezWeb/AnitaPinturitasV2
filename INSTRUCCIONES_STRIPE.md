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

## Paso 5: Habilitar PayPal y Google Pay (Opcional pero Recomendado)

Para que aparezcan los botones de **PayPal** y **Google Pay** en el checkout:

1. Ve al Dashboard de Stripe: https://dashboard.stripe.com/settings/payment_methods
2. En la sección **Payment methods**, activa:
   - ✅ **PayPal** (si está disponible en tu región)
   - ✅ **Google Pay** (aparece automáticamente si está habilitado)
3. Guarda los cambios

**Nota:** Los métodos de pago aparecerán automáticamente en el checkout una vez habilitados. El texto "Pago rápido" aparece automáticamente cuando Stripe muestra estos métodos.

**Sobre el botón "Pagar con Link":** Este botón es parte de Stripe Link y aparece automáticamente cuando el cliente tiene una cuenta de Stripe guardada. Se ha desactivado el código promocional para minimizar su visibilidad, pero no se puede ocultar completamente. Los clientes pueden optar por usar PayPal o Google Pay en su lugar.

## Paso 6: Configurar Dirección de Envío

El checkout ahora solicita automáticamente la dirección de envío del cliente. Esta información se guarda en la sesión de Stripe y puedes recuperarla después del pago exitoso usando el endpoint `/api/checkout-session/:sessionId`.

## Paso 7: Probar el Carrito

1. Añade productos al carrito en tu página web
2. Abre el carrito
3. Haz clic en "PROCEDER AL PAGO" o "PAGO SEGURO"
4. Deberías ser redirigido a Stripe Checkout
5. El cliente deberá rellenar su dirección de envío
6. Verás los botones de pago: Tarjeta, PayPal (si está habilitado) y Google Pay (si está habilitado)

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

