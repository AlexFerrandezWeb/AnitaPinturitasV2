# Cómo Configurar el Archivo .env

## Pasos para Configurar Stripe

1. **Abre el archivo `.env`** que está en la raíz del proyecto (c:\Proyectos\anitaPinturitasV3\.env)

2. **Edita la línea `STRIPE_SECRET_KEY`** y reemplaza `sk_test_tu_clave_aqui` con tu clave secreta real de Stripe

   Debería verse algo así:
   ```
   STRIPE_SECRET_KEY=sk_test_51ABC123XYZ789...tu_clave_completa_aqui
   ```

3. **No compartas nunca este archivo** - el `.env` ya está en `.gitignore` para que no se suba al repositorio

4. **Guarda el archivo**

5. **Reinicia el servidor** si está corriendo:
   - Detén el servidor actual (Ctrl+C en la terminal)
   - Ejecuta de nuevo: `npm start`

## Ejemplo de Archivo .env Completo

```
STRIPE_SECRET_KEY=sk_test_51ABC123XYZ789abcdefghijklmnopqrstuvwxyz
SUCCESS_URL=http://localhost:3000
CANCEL_URL=http://localhost:3000
PORT=3000
```

## Importante

- La clave secreta empieza con `sk_test_` (modo prueba) o `sk_live_` (producción)
- No debe tener espacios ni comillas
- Debe ser la clave completa (muy larga)
- La clave pública (`pk_`) NO funciona para el backend

