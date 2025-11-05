# Instrucciones para Configurar Meta (Facebook Pixel)

Este documento explica cómo configurar el tracking de compras en Meta (Facebook Pixel) para que se registren automáticamente las compras realizadas en tu tienda.

## ¿Qué hace esto?

Cuando un cliente completa una compra en Stripe, automáticamente se envía un evento "Purchase" a Meta con:
- Email del cliente (hasheado con SHA-256 para privacidad)
- Teléfono del cliente (hasheado con SHA-256 para privacidad)
- Valor total de la compra en EUR
- Timestamp del evento

Esto permite a Meta trackear las conversiones y optimizar tus campañas de publicidad.

## Paso 1: Obtener el Access Token de Meta

1. Ve a [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Inicia sesión con tu cuenta de Meta Business
3. Selecciona tu Pixel de Facebook (o crea uno nuevo si no tienes)
4. Ve a **Configuración** > **Configuración de API**
5. En la sección **"Generate access token"**, haz clic en **"Generate token"**
6. Copia el token generado (empieza con `EAAB...`)

⚠️ **Importante:** Este token es secreto. No lo compartas ni lo subas a git.

## Paso 2: Obtener el Pixel ID

1. En el mismo [Meta Events Manager](https://business.facebook.com/events_manager2)
2. Selecciona tu Pixel
3. En la parte superior, verás el **Pixel ID** (un número como `1234567890123456`)
4. Copia este ID

## Paso 3: Configurar Variables de Entorno

### En Desarrollo Local (archivo `.env`)

Abre el archivo `.env` en la raíz del proyecto y añade:

```env
META_ACCESS_TOKEN=EAABsbCS1iHgBO...tu_token_completo
META_PIXEL_ID=1234567890123456
```

### En Producción (Render)

1. Ve a tu servicio en Render
2. Ve a **Environment** (Variables de Entorno)
3. Añade estas variables:
   - `META_ACCESS_TOKEN` = tu token de acceso
   - `META_PIXEL_ID` = tu Pixel ID

## Paso 4: Testing (Opcional)

Para probar que funciona correctamente, puedes usar un código de evento de prueba:

1. En Meta Events Manager, ve a **Configuración** > **Test Events**
2. Genera un código de evento de prueba (ejemplo: `TEST12345`)
3. Añade esta variable de entorno:
   - `META_TEST_EVENT_CODE=TEST12345`

⚠️ **Importante:** Solo usa `META_TEST_EVENT_CODE` en desarrollo/testing. En producción, usa solo `META_PIXEL_ID`.

## Paso 5: Verificar que Funciona

1. Realiza una compra de prueba en tu tienda
2. Ve a Meta Events Manager > **Test Events** (si usas código de prueba) o **Events** (en producción)
3. Deberías ver el evento "Purchase" con los datos de la compra

## Formato del Evento Enviado a Meta

El backend envía eventos en este formato:

```json
{
    "data": [
        {
            "event_name": "Purchase",
            "event_time": 1762341416,
            "action_source": "website",
            "user_data": {
                "em": ["7b17fb0bd173f625b58636fb796407c22b3d16fc78302d79f0fd30c2fc2fc068"],
                "ph": ["hash_del_telefono_o_null"]
            },
            "custom_data": {
                "currency": "EUR",
                "value": "142.52"
            }
        }
    ]
}
```

## Privacidad y Seguridad

- ✅ Los emails y teléfonos se hashean con SHA-256 antes de enviarse
- ✅ Los datos se envían directamente desde el servidor (no desde el navegador)
- ✅ El token de acceso se guarda en variables de entorno (no en el código)

## Solución de Problemas

### El evento no aparece en Meta

1. Verifica que las variables de entorno estén configuradas correctamente
2. Revisa los logs del servidor en Render para ver si hay errores
3. Asegúrate de que el token de acceso sea válido y no haya expirado
4. Verifica que el Pixel ID sea correcto

### Error en la consola del navegador

Los errores de tracking no afectan la experiencia del usuario. Si ves errores en la consola:
- Verifica que el backend esté funcionando
- Revisa que las variables de entorno estén configuradas
- Los errores se registran en los logs del servidor

## Notas Importantes

- El tracking se realiza automáticamente cuando el cliente llega a la página de éxito (`success.html`)
- Si falla el tracking, no se interrumpe la experiencia del usuario
- Los eventos se envían en segundo plano sin afectar el rendimiento
- El formato del valor es siempre en EUR con 2 decimales

