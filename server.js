// Servidor backend para Stripe Checkout y Meta Conversions API (CAPI)
const express = require('express');
const stripe = require('stripe');
const cors = require('cors');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs'); // Importar 'fs' para la fuente de productos
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Middleware condicional: excluir webhook de Stripe del parsing JSON
// porque necesita el body raw para verificar la firma
app.use((req, res, next) => {
    if (req.path === '/api/stripe-webhook') {
        // Para el webhook, usar express.raw() en lugar de express.json()
        express.raw({ type: 'application/json' })(req, res, next);
    } else {
        // Para el resto de endpoints, usar express.json()
        express.json()(req, res, next);
    }
});

app.use(express.static('.'));

// Inicializar Stripe con tu clave secreta
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey || stripeSecretKey.includes('tu_clave_aqui')) {
    console.error('⚠️  ERROR: STRIPE_SECRET_KEY no está configurada');
    console.error('   Configúrala en Render -> Environment Variables');
    console.error('   O en archivo .env para desarrollo local');
    console.error('   Obtén tu clave desde: https://dashboard.stripe.com/apikeys');
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
        const { items, total, fbc, fbp } = req.body; // Capturar cookies de Meta para HQC

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
            payment_method_types: ['card', 'paypal', 'klarna'], // Incluir PayPal, Klarna y tarjetas (Google Pay aparece automáticamente si está habilitado)
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
                // Guardar cookies de Meta para HQC (serán usadas en el webhook)
                ...(fbc && { fbc: fbc }),
                ...(fbp && { fbp: fbp }),
            },
            locale: 'es', // Forzar idioma español
            custom_text: {
                submit: {
                    message: 'También puedes pagar en 3 plazos sin intereses seleccionando Klarna.',
                },
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

        // Recuperar también los line items para saber qué productos se compraron
        const lineItems = await stripeClient.checkout.sessions.listLineItems(req.params.sessionId, {
            expand: ['data.price.product']
        });

        res.json({
            session,
            lineItems: lineItems.data
        });
    } catch (error) {
        console.error('Error al recuperar sesión:', error);
        res.status(500).json({ error: 'Error al recuperar la sesión' });
    }
});

// Webhook de Stripe para disparar evento Purchase de forma robusta (HQC)
// IMPORTANTE: Configura este endpoint en Stripe Dashboard -> Webhooks
// URL: https://tu-dominio.com/api/stripe-webhook
// Eventos a escuchar: checkout.session.completed
// NOTA: El middleware condicional arriba ya procesa el body como raw para este endpoint
app.post('/api/stripe-webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.warn('⚠️  STRIPE_WEBHOOK_SECRET no configurada. El webhook no funcionará correctamente.');
        return res.status(400).send('Webhook secret no configurado');
    }

    let event;

    try {
        // Verificar la firma del webhook para asegurar que viene de Stripe
        event = stripeClient.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        console.error('❌ Error al verificar firma del webhook:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Manejar el evento checkout.session.completed
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        try {
            // Extraer datos de PII de Stripe (garantizados y exactos)
            const email = session.customer_details?.email || session.customer_email;
            const phone = session.customer_details?.phone || null;

            // Extraer nombre y apellido
            let firstName = null;
            let lastName = null;
            const fullName = session.customer_details?.name;
            if (fullName) {
                const nameParts = fullName.trim().split(/\s+/);
                if (nameParts.length > 0) {
                    firstName = nameParts[0];
                    if (nameParts.length > 1) {
                        lastName = nameParts.slice(1).join(' ');
                    }
                }
            }

            // Recuperar cookies de Meta de los metadatos (guardadas en create-checkout-session)
            const fbc = session.metadata?.fbc || null;
            const fbp = session.metadata?.fbp || null;

            // Obtener el valor total (amount_total está en centavos)
            const value = session.amount_total ? (session.amount_total / 100).toFixed(2) : null;

            // Validar datos requeridos
            if (!email || !value) {
                console.warn('⚠️  Datos incompletos en webhook:', { email, value, sessionId: session.id });
                return res.status(200).json({ received: true, message: 'Datos incompletos, evento no trackeado' });
            }

            // Obtener datos de conexión del webhook (IP y User Agent de Stripe)
            // Nota: En webhooks, la IP es la de Stripe, no la del cliente final
            // Por eso es importante tener fbc/fbp guardados en metadata
            const { clientIp, clientUserAgent } = getClientConnectionData(req);

            // Verificar configuración de Meta
            const metaAccessToken = process.env.META_ACCESS_TOKEN;
            const metaPixelId = process.env.META_PIXEL_ID;
            const testEventCode = 'TEST48945'; // Usar código de prueba directamente

            if (!metaAccessToken) {
                console.warn('⚠️  META_ACCESS_TOKEN no configurada. No se enviará evento a Meta.');
                return res.status(200).json({ received: true, message: 'Meta no configurado' });
            }

            if (!metaPixelId && !testEventCode) {
                console.warn('⚠️  META_PIXEL_ID o META_TEST_EVENT_CODE no configurados.');
                return res.status(200).json({ received: true, message: 'Pixel ID no configurado' });
            }

            // Hashear información personal (email, teléfono, nombre, apellido)
            // Ya no es necesario hashear aquí, la función buildUserData lo hace.

            // Obtener timestamp actual (en segundos)
            const eventTime = Math.floor(Date.now() / 1000);

            // Generar ID único del evento para deduplicación
            // Usar session.id como parte del eventId para garantizar unicidad
            const eventId = `purchase_webhook_${session.id}_${eventTime}`;

            // Construir user_data con datos hasheados y datos de conexión
            const userData = buildUserData(email, phone, firstName, lastName, clientIp, clientUserAgent, fbc, fbp);

            // ✅ MEJORA: Obtener line items de Stripe para construir contents
            let contents = [];
            let contentIds = [];
            try {
                const lineItems = await stripeClient.checkout.sessions.listLineItems(session.id, {
                    expand: ['data.price.product']
                });

                if (lineItems && lineItems.data && lineItems.data.length > 0) {
                    // Iterar sobre line items y mapear a formato Meta
                    contents = lineItems.data.map(item => {
                        // Intentar obtener el ID del producto desde metadata o description
                        const productId = item.price?.product?.metadata?.product_id ||
                            item.price?.product?.id ||
                            item.description?.split(' - ')[0] ||
                            `stripe_${item.price?.id}`;

                        if (productId && !contentIds.includes(productId)) {
                            contentIds.push(productId);
                        }

                        // Determinar el precio unitario, excluyendo el coste de envío
                        const isShipping = item.price?.product?.name?.toLowerCase().includes('envío');

                        // Si es el ítem de envío, no incluirlo en contents para Meta (solo productos)
                        if (isShipping) {
                            return null;
                        }

                        return {
                            id: productId.toString(),
                            quantity: item.quantity || 1,
                            item_price: item.price ? (item.price.unit_amount / 100).toFixed(2) : '0.00'
                        };
                    }).filter(item => item !== null); // Eliminar el ítem de envío si se detectó
                }
            } catch (lineItemsError) {
                console.warn('⚠️  Error al obtener line items de Stripe:', lineItemsError.message);
                // Continuar sin contents si hay error
            }

            // Construir custom_data
            const customData = {
                currency: 'EUR',
                value: parseFloat(value).toFixed(2),
            };

            // Añadir contents si están disponibles
            if (contents.length > 0) {
                customData.contents = contents;
                customData.content_type = 'product';
                if (contentIds.length > 0) {
                    customData.content_ids = contentIds;
                }
            }

            // Construir el payload según el formato de Meta
            const eventData = {
                event_name: 'Purchase',
                event_time: eventTime,
                action_source: 'website',
                user_data: userData,
                custom_data: customData,
                event_id: eventId, // Para deduplicación
            };

            // Construir el body de la petición
            const requestBody = {
                data: [eventData],
            };

            // Enviar evento a Meta usando la función helper
            console.log('📤 Enviando evento Purchase desde webhook a Meta:', {
                email: email,
                value: value,
                fbc: fbc ? 'presente' : 'ausente',
                fbp: fbp ? 'presente' : 'ausente',
                eventId: eventId
            });

            // Enviar evento a Meta (la función sendEventToMeta maneja la respuesta)
            // Creamos un objeto res mock para que sendEventToMeta responda a Stripe
            const mockRes = {
                status: (code) => ({
                    json: (data) => {
                        if (code >= 200 && code < 300) {
                            console.log('✅ Evento Purchase trackeado desde webhook:', data);
                        } else {
                            console.error('❌ Error al trackear desde webhook:', data);
                        }
                        // Responder al webhook de Stripe con 200, incluso si Meta devuelve error
                        return res.status(200).json({ received: true, tracked: data.tracked || false, ...data });
                    }
                })
            };

            return sendEventToMeta(requestBody, metaAccessToken, metaPixelId, testEventCode, mockRes);

        } catch (error) {
            console.error('❌ Error al procesar webhook de Stripe:', error);
            // Responder 200 para que Stripe no reintente
            return res.status(200).json({ received: true, error: error.message });
        }
    } else {
        // Evento no manejado
        console.log(`ℹ️  Evento de webhook recibido pero no manejado: ${event.type}`);
        res.json({ received: true, message: `Evento ${event.type} recibido pero no procesado` });
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

// Función para hashear nombre con SHA-256
function hashName(name) {
    if (!name) return null;
    // Normalizar: minúsculas, sin espacios extra, trim
    const normalizedName = name.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!normalizedName) return null;
    return crypto.createHash('sha256').update(normalizedName).digest('hex');
}

// Función para hashear apellido con SHA-256
function hashLastName(lastName) {
    if (!lastName) return null;
    // Normalizar: minúsculas, sin espacios extra, trim
    const normalizedLastName = lastName.toLowerCase().trim().replace(/\s+/g, ' ');
    if (!normalizedLastName) return null;
    return crypto.createHash('sha256').update(normalizedLastName).digest('hex');
}

// Endpoint para trackear compra en Meta (Facebook Pixel)
// Este endpoint es redundante si el webhook funciona, pero se mantiene para eventos de fallback.
app.post('/api/track-purchase', async (req, res) => {
    try {
        const {
            email, phone, firstName, lastName, value,
            fbc, fbp, userAgent, eventId,
            eventDetails // ✅ Nuevo: eventDetails estructurado
        } = req.body;

        // Validar datos requeridos
        if (!email || !value) {
            return res.status(400).json({
                error: 'Datos incompletos: se requieren email y value'
            });
        }

        // Obtener datos de la petición (IP y User-Agent)
        // Priorizar userAgent del body si está disponible
        const { clientIp, clientUserAgent: headerUserAgent } = getClientConnectionData(req);
        const clientUserAgent = req.body.userAgent || headerUserAgent;

        // Verificar configuración de Meta
        const metaAccessToken = process.env.META_ACCESS_TOKEN;
        const metaPixelId = process.env.META_PIXEL_ID;
        const testEventCode = process.env.META_TEST_EVENT_CODE;

        if (!metaAccessToken || (!metaPixelId && !testEventCode)) {
            return res.status(200).json({
                message: 'Meta no configurado',
                tracked: false
            });
        }

        // Obtener timestamp actual (en segundos)
        const eventTime = Math.floor(Date.now() / 1000);

        // Construir user_data con datos hasheados y datos de conexión
        const userData = buildUserData(email, phone, firstName, lastName, clientIp, clientUserAgent, fbc, fbp);

        // ✅ USAMOS DIRECTAMENTE eventDetails como custom_data
        const customData = eventDetails || {};

        // Si no hay eventDetails, usar valores básicos
        if (Object.keys(customData).length === 0) {
            customData.currency = 'EUR';
            customData.value = parseFloat(value).toFixed(2);
        }

        // Construir el payload según el formato de Meta
        const eventData = {
            event_name: 'Purchase',
            event_time: eventTime,
            action_source: 'website',
            user_data: userData,
        };

        if (Object.keys(customData).length > 0) {
            eventData.custom_data = customData;
        }

        // Añadir el event_id para deduplicación
        if (eventId) {
            eventData.event_id = eventId;
        }

        // Construir el body de la petición
        const requestBody = {
            data: [eventData],
        };

        // Función helper para enviar evento a Meta
        return sendEventToMeta(requestBody, metaAccessToken, metaPixelId, testEventCode, res);
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

// Función helper para enviar eventos a Meta (reutilizable)
function sendEventToMeta(requestBody, metaAccessToken, metaPixelId, testEventCode, res) {
    // Si hay test_event_code, añadirlo a la URL
    const urlPath = testEventCode
        ? `/v21.0/${metaPixelId}/events?access_token=${metaAccessToken}&test_event_code=${testEventCode}`
        : `/v21.0/${metaPixelId}/events?access_token=${metaAccessToken}`;

    // Hacer la petición POST a Meta Graph API
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
}

// Función helper para obtener datos de conexión del cliente
function getClientConnectionData(req) {
    // Obtener IP (manejando proxies como el de Render)
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = forwardedFor
        ? forwardedFor.split(',')[0].trim() // Tomar la primera IP si hay múltiples
        : req.socket.remoteAddress || req.connection?.remoteAddress || null;

    // Obtener User Agent
    const clientUserAgent = req.headers['user-agent'] || null;

    return { clientIp, clientUserAgent };
}

// Función helper para construir user_data con datos hasheados y de conexión
function buildUserData(email, phone, firstName, lastName, clientIp, clientUserAgent, fbc, fbp) {
    const userData = {};

    // Añadir PII hasheada (solo si está disponible)
    if (email) {
        userData.em = [hashEmail(email)];
    }
    if (phone) {
        userData.ph = [hashPhone(phone)];
    }
    if (firstName) {
        userData.fn = [hashName(firstName)];
    }
    if (lastName) {
        userData.ln = [hashLastName(lastName)];
    }

    // Añadir datos de conexión (NO se hashean)
    if (clientIp) {
        userData.client_ip_address = clientIp;
    }
    if (clientUserAgent) {
        userData.client_user_agent = clientUserAgent;
    }
    if (fbc) {
        userData.fbc = fbc; // Cookie _fbc (sin hashear)
    }
    if (fbp) {
        userData.fbp = fbp; // Cookie _fbp (sin hashear)
    }

    return userData;
}

// Endpoint genérico para trackear eventos de Meta Pixel
app.post('/api/track-event', async (req, res) => {
    try {
        const {
            eventName,        // Nombre del evento (ViewContent, AddToCart, Search, Contact, InitiateCheckout)
            email,           // Email del usuario (opcional para algunos eventos)
            phone,           // Teléfono (opcional)
            firstName,       // Nombre (opcional)
            lastName,        // Apellido (opcional)
            fbc,             // Cookie _fbc
            fbp,             // Cookie _fbp
            userAgent,       // User Agent del navegador (opcional, se obtiene del header si no viene)
            eventId,         // ID único del evento para deduplicación
            sourceUrl,       // URL de origen del evento
            eventDetails     // ✅ CRÍTICO: Objeto estructurado con custom_data (contents, content_type, value, currency, etc.)
        } = req.body;

        // Validar que el nombre del evento esté presente
        if (!eventName) {
            return res.status(400).json({
                error: 'Datos incompletos: se requiere eventName'
            });
        }

        // Verificar configuración de Meta
        const metaAccessToken = process.env.META_ACCESS_TOKEN;
        const metaPixelId = process.env.META_PIXEL_ID;
        // Código de prueba de Meta para testear eventos
        const testEventCode = 'TEST48945'; // Usar código de prueba directamente

        if (!metaAccessToken) {
            console.warn('⚠️  META_ACCESS_TOKEN no configurada. No se enviará evento a Meta.');
            return res.status(200).json({
                message: 'Evento recibido pero Meta no configurado',
                tracked: false
            });
        }

        if (!metaPixelId && !testEventCode) {
            console.warn('⚠️  META_PIXEL_ID o META_TEST_EVENT_CODE no configurados.');
            return res.status(200).json({
                message: 'Evento recibido pero Pixel ID no configurado',
                tracked: false
            });
        }

        // Obtener datos de conexión (priorizar userAgent del body si está disponible)
        const { clientIp, clientUserAgent: headerUserAgent } = getClientConnectionData(req);
        const clientUserAgent = req.body.userAgent || headerUserAgent;

        // Construir user_data
        const userData = buildUserData(email, phone, firstName, lastName, clientIp, clientUserAgent, fbc, fbp);

        // Obtener timestamp actual (en segundos)
        const eventTime = Math.floor(Date.now() / 1000);

        // ✅ USAMOS DIRECTAMENTE eventDetails como custom_data.
        // Contiene 'value', 'currency', 'content_type', 'contents', etc., según el evento.
        const customData = eventDetails || {};

        // Construir el payload según el formato de Meta
        const eventData = {
            event_name: eventName,
            event_time: eventTime,
            action_source: 'website',
            user_data: userData,
        };

        // 💡 MEJORA: Añadir source_url para mejor coincidencia
        if (sourceUrl) {
            eventData.event_source_url = sourceUrl;
        }

        // Añadir custom_data solo si tiene contenido
        if (Object.keys(customData).length > 0) {
            eventData.custom_data = customData;
        }

        // Añadir event_id para deduplicación si está disponible
        if (eventId) {
            eventData.event_id = eventId;
        }

        // Construir el body de la petición
        const requestBody = {
            data: [eventData],
        };

        // Enviar evento a Meta
        return sendEventToMeta(requestBody, metaAccessToken, metaPixelId, testEventCode, res);

    } catch (error) {
        console.error('❌ Error al trackear evento en Meta:', error);
        // Respondemos 200 para no interrumpir el flujo del usuario
        res.status(200).json({
            success: false,
            message: 'Error al procesar evento',
            error: error.message,
            tracked: false
        });
    }
});

// Endpoint para servir el CSV del catálogo de productos con el tipo MIME correcto
// ⚠️ Nota: Cambiado a asíncrono para mejor rendimiento
app.get('/product-feed.csv', async (req, res) => {
    const csvPath = path.join(__dirname, 'product-feed.csv');

    // Verificar que el archivo existe
    if (!fs.existsSync(csvPath)) {
        console.warn(`⚠️ Archivo CSV no encontrado en: ${csvPath}`);
        return res.status(404).json({ error: 'Archivo CSV no encontrado' });
    }

    try {
        // Leer el archivo CSV de forma asíncrona
        const csvContent = await fs.promises.readFile(csvPath, 'utf8');

        // Configurar headers para que el navegador/Facebook lo lea correctamente
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'inline; filename="product-feed.csv"');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora

        // Enviar el contenido CSV
        res.send(csvContent);
    } catch (error) {
        console.error('❌ Error al leer o servir el archivo CSV:', error);
        res.status(500).json({ error: 'Error interno al procesar el archivo CSV' });
    }
});

// Endpoint de salud para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

    if (!stripeSecretKey || stripeSecretKey.includes('tu_clave_aqui')) {
        console.error('⚠️  ERROR: STRIPE_SECRET_KEY no está configurada');
        console.error('   Configúrala en Render -> Environment Variables');
    } else {
        console.log('✅ Stripe configurado correctamente');
    }
});

