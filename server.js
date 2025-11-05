// Servidor backend para Stripe Checkout
const express = require('express');
const stripe = require('stripe');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Inicializar Stripe con tu clave secreta
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey || stripeSecretKey.includes('tu_clave_aqui')) {
    console.error('⚠️  ERROR: STRIPE_SECRET_KEY no está configurada');
    console.error('   Configúrala en Render -> Environment Variables');
    console.error('   O en archivo .env para desarrollo local');
    console.error('   Obtén tu clave desde: https://dashboard.stripe.com/apikeys');
}

const stripeClient = stripe(stripeSecretKey);

// Función para convertir rutas relativas a URLs absolutas
function convertToAbsoluteUrl(imagePath, baseUrl) {
    if (!imagePath) return null;
    
    // Si ya es una URL absoluta (http/https), devolverla tal cual
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Si es una ruta relativa, convertirla a absoluta
    // Normalizar la ruta (eliminar ../ al inicio y barras duplicadas)
    let normalizedPath = imagePath
        .replace(/^\.\.\/+/g, '') // Eliminar ../ al inicio
        .replace(/^\.\//, '') // Eliminar ./ al inicio
        .replace(/^\/+/, '') // Eliminar barras al inicio
        .replace(/\/+/g, '/'); // Normalizar barras duplicadas
    
    // Construir URL absoluta
    const base = baseUrl.replace(/\/$/, ''); // Eliminar barra final si existe
    return `${base}/${normalizedPath}`;
}

// Endpoint para crear sesión de checkout
app.post('/api/create-checkout-session', async (req, res) => {
    try {
        const { items, total } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío' });
        }

        // Obtener URL base desde variables de entorno o headers
        const origin = req.get('origin') || req.get('referer') || process.env.SUCCESS_URL || 'http://localhost:3000';
        const baseUrl = origin.replace(/\/html\/.*$/, '').replace(/\/$/, '') || 'http://localhost:3000';

        // Construir line items para Stripe
        const lineItems = items.map(item => {
            // Convertir imagen a URL absoluta si es necesario
            let imageUrl = null;
            if (item.imagen) {
                imageUrl = convertToAbsoluteUrl(item.imagen, baseUrl);
                // Validar que sea una URL válida HTTPS (Stripe requiere HTTPS en producción)
                if (imageUrl && imageUrl.startsWith('https://')) {
                    // URL válida para producción
                } else if (imageUrl && imageUrl.startsWith('http://') && process.env.NODE_ENV === 'development') {
                    // Solo permitir HTTP en desarrollo
                } else {
                    imageUrl = null; // No incluir imágenes inválidas o no accesibles
                }
            }
            
            return {
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: item.nombre,
                        images: imageUrl ? [imageUrl] : [], // Stripe acepta array vacío si no hay imagen
                    },
                    unit_amount: Math.round(item.precio * 100), // Convertir a centavos
                },
                quantity: item.cantidad,
            };
        });

        // Configurar opciones de envío
        // Umbral para envío gratuito (configurable, por defecto 62€)
        const FREE_SHIPPING_THRESHOLD = parseFloat(process.env.FREE_SHIPPING_THRESHOLD) || 62.00;
        const SHIPPING_COST = 6.95; // Coste de envío estándar en euros
        
        // Una sola opción de envío según el total del pedido
        const shippingOptions = [{
            shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: {
                    amount: total >= FREE_SHIPPING_THRESHOLD ? 0 : Math.round(SHIPPING_COST * 100), // Gratis si >= 62€, sino 6.95€
                    currency: 'eur',
                },
                display_name: total >= FREE_SHIPPING_THRESHOLD ? 'Envío gratuito' : 'Envío estándar',
                delivery_estimate: {
                    minimum: {
                        unit: 'business_day',
                        value: 5,
                    },
                    maximum: {
                        unit: 'business_day',
                        value: 10,
                    },
                },
            },
        }];

        // Crear sesión de checkout
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card', 'paypal'], // Incluir PayPal y tarjetas (Google Pay aparece automáticamente si está habilitado)
            line_items: lineItems,
            mode: 'payment',
            success_url: `${baseUrl}/html/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/`, // Volver a la página principal usando la URL detectada
            billing_address_collection: 'auto',
            // Solicitar número de teléfono
            phone_number_collection: {
                enabled: true,
            },
            // Solicitar dirección de envío (obligatorio)
            shipping_address_collection: {
                allowed_countries: ['ES', 'FR', 'PT', 'IT', 'DE', 'GB', 'US', 'MX', 'AR', 'CO', 'CL', 'PE'], // Países permitidos
            },
            // Opciones de envío con coste y tiempo estimado
            shipping_options: shippingOptions,
            // Desactivar código promocional/descuento (esto también ayuda a ocultar el botón Link en algunos casos)
            allow_promotion_codes: false,
            // Configuración para mostrar métodos de pago rápidos
            payment_method_options: {
                paypal: {
                    capture_method: 'manual', // Stripe requiere 'manual' para PayPal
                },
            },
            metadata: {
                // Guardar información adicional si es necesario
                total: total.toString(),
                item_count: items.length.toString(),
            },
        });

        res.json({ 
            checkout_url: session.url,
            session_id: session.id 
        });
    } catch (error) {
        console.error('Error al crear sesión de checkout:', error);
        res.status(500).json({ 
            error: 'Error al procesar el pago',
            details: error.message 
        });
    }
});

// Endpoint para verificar el estado de la sesión
app.get('/api/checkout-session/:sessionId', async (req, res) => {
    try {
        const session = await stripeClient.checkout.sessions.retrieve(req.params.sessionId);
        res.json({ session });
    } catch (error) {
        console.error('Error al recuperar sesión:', error);
        res.status(500).json({ error: 'Error al recuperar la sesión' });
    }
});

// Función para hashear email con SHA-256
function hashEmail(email) {
    if (!email) return null;
    // Normalizar email: minúsculas y sin espacios
    const normalizedEmail = email.toLowerCase().trim();
    // Hashear con SHA-256
    return crypto.createHash('sha256').update(normalizedEmail).digest('hex');
}

// Función para hashear teléfono con SHA-256
function hashPhone(phone) {
    if (!phone) return null;
    // Eliminar espacios, guiones y otros caracteres, solo dejar números
    const normalizedPhone = phone.replace(/\D/g, '');
    if (!normalizedPhone) return null;
    return crypto.createHash('sha256').update(normalizedPhone).digest('hex');
}

// Endpoint para trackear compra en Meta (Facebook Pixel)
app.post('/api/track-purchase', async (req, res) => {
    try {
        const { email, phone, value, session_id } = req.body;

        // Validar datos requeridos
        if (!email || !value) {
            return res.status(400).json({ 
                error: 'Datos incompletos: se requieren email y value' 
            });
        }

        // Verificar configuración de Meta
        const metaAccessToken = process.env.META_ACCESS_TOKEN;
        const metaPixelId = process.env.META_PIXEL_ID;
        const testEventCode = process.env.META_TEST_EVENT_CODE; // Opcional, para testing

        if (!metaAccessToken) {
            console.warn('⚠️  META_ACCESS_TOKEN no configurada. No se enviará evento a Meta.');
            return res.status(200).json({ 
                message: 'Evento recibido pero Meta no configurado',
                tracked: false 
            });
        }

        if (!metaPixelId && !testEventCode) {
            console.warn('⚠️  META_PIXEL_ID o META_TEST_EVENT_CODE no configurados.');
            return res.status(200).json({ 
                message: 'Evento recibido pero Pixel ID no configurado',
                tracked: false 
            });
        }

        // Hashear email y teléfono
        const hashedEmail = hashEmail(email);
        const hashedPhone = phone ? hashPhone(phone) : null;

        // Obtener timestamp actual (en segundos)
        const eventTime = Math.floor(Date.now() / 1000);

        // Construir el payload según el formato de Meta
        const eventData = {
            event_name: 'Purchase',
            event_time: eventTime,
            action_source: 'website',
            user_data: {
                em: hashedEmail ? [hashedEmail] : [],
                ph: hashedPhone ? [hashedPhone] : [null],
            },
            custom_data: {
                currency: 'EUR', // Cambiado de USD a EUR
                value: parseFloat(value).toFixed(2), // Asegurar formato con 2 decimales
            },
        };

        // Añadir attribution_data si es necesario (opcional)
        // eventData.attribution_data = {
        //     attribution_share: "0.3"
        // };

        // Construir el body de la petición
        const requestBody = {
            data: [eventData],
        };

        // Si hay test_event_code, añadirlo a la URL
        const urlPath = testEventCode 
            ? `/v21.0/${metaPixelId}/events?access_token=${metaAccessToken}&test_event_code=${testEventCode}`
            : `/v21.0/${metaPixelId}/events?access_token=${metaAccessToken}`;

        // Hacer la petición POST a Meta Graph API usando https
        const postData = JSON.stringify(requestBody);
        
        const options = {
            hostname: 'graph.facebook.com',
            port: 443,
            path: urlPath,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
            },
        };

        // Hacer la petición POST a Meta Graph API
        const req = https.request(options, (metaRes) => {
            let data = '';

            metaRes.on('data', (chunk) => {
                data += chunk;
            });

            metaRes.on('end', () => {
                try {
                    const response = JSON.parse(data);
                    
                    if (metaRes.statusCode >= 200 && metaRes.statusCode < 300) {
                        console.log('✅ Evento enviado a Meta correctamente:', response);
                        return res.status(200).json({ 
                            success: true, 
                            message: 'Evento trackeado en Meta',
                            metaResponse: response,
                            tracked: true
                        });
                    } else {
                        console.error('❌ Error en respuesta de Meta:', response);
                        // Aún así respondemos 200 para no interrumpir el flujo del usuario
                        return res.status(200).json({ 
                            success: false, 
                            message: 'Error al enviar evento a Meta',
                            error: response,
                            tracked: false
                        });
                    }
                } catch (parseError) {
                    console.error('❌ Error al parsear respuesta de Meta:', parseError);
                    return res.status(200).json({ 
                        success: false, 
                        message: 'Error al procesar respuesta de Meta',
                        tracked: false
                    });
                }
            });
        });

        req.on('error', (error) => {
            console.error('❌ Error en petición a Meta:', error);
            // Respondemos 200 para no interrumpir el flujo del usuario
            return res.status(200).json({ 
                success: false, 
                message: 'Error de conexión con Meta',
                error: error.message,
                tracked: false
            });
        });

        req.write(postData);
        req.end();

    } catch (error) {
        console.error('❌ Error al trackear compra en Meta:', error);
        // Respondemos 200 para no interrumpir el flujo del usuario
        res.status(200).json({ 
            success: false, 
            message: 'Error al procesar evento',
            error: error.message,
            tracked: false
        });
    }
});

// Endpoint de salud para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    
    if (!stripeSecretKey || stripeSecretKey.includes('tu_clave_aqui')) {
        console.error('⚠️  ERROR: STRIPE_SECRET_KEY no está configurada');
        console.error('   Configúrala en Render -> Environment Variables');
    } else {
        console.log('✅ Stripe configurado correctamente');
    }
});

