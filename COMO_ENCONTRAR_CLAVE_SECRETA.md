# Cómo Encontrar tu Clave Secreta de Stripe

## Importante

- **Clave Pública (`pk_live_...` o `pk_test_...`):** Se usa en el frontend, es segura de compartir
- **Clave Secreta (`sk_live_...` o `sk_test_...`):** Se usa SOLO en el backend, NUNCA la compartas

Para el backend necesitas la **CLAVE SECRETA**.

## Pasos para Encontrar tu Clave Secreta

1. **Ve a tu Dashboard de Stripe:**
   - https://dashboard.stripe.com/apikeys

2. **Busca la sección "Secret key":**
   - Verás dos claves: "Publishable key" (pública) y "Secret key" (secreta)
   - La **Secret key** es la que necesitas
   - Empieza con `sk_live_` (producción) o `sk_test_` (prueba)

3. **Haz clic en "Reveal test key" o "Reveal live key"** para ver la clave completa

4. **Copia la clave secreta completa** (es muy larga)

5. **Pégala en tu archivo `.env`:**
   - Abre `.env` en la raíz del proyecto
   - Busca: `STRIPE_SECRET_KEY=sk_test_tu_clave_aqui`
   - Reemplaza con tu clave secreta real:
   ```
   STRIPE_SECRET_KEY=sk_live_51ABC123...tu_clave_secreta_completa_aqui
   ```
   (Esta es solo un ejemplo - usa tu clave secreta real que obtendrás de tu dashboard de Stripe)

## Nota sobre Modo Live vs Test

- **Modo Test (`sk_test_...`):** Para pruebas, pagos no son reales
- **Modo Live (`sk_live_...`):** Para producción, pagos REALES

Para desarrollo, usa primero `sk_test_...`. Una vez que todo funcione, cambia a `sk_live_...` para producción.

