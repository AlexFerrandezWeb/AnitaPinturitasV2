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
const INSTAGRAM_REELS_CACHE_PATH = path.join(__dirname, 'data', 'instagramReelsCache.json');
const INSTAGRAM_REELS_MANUAL_PATH = path.join(__dirname, 'data', 'instagramReelsManual.json');
const GOOGLE_REVIEWS_CACHE_PATH = path.join(__dirname, 'data', 'googleReviewsCache.json');
const GOOGLE_REVIEWS_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
const GRAPH_API_VERSION = process.env.INSTAGRAM_GRAPH_API_VERSION || 'v21.0';

function httpsGetFacebookGraph(pathAndQuery, timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
        const request = https.get(
            {
                hostname: 'graph.facebook.com',
                path: pathAndQuery,
                method: 'GET',
                timeout: timeoutMs
            },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => {
                    raw += chunk;
                });
                res.on('end', () => {
                    try {
                        const json = JSON.parse(raw);
                        if (json.error) {
                            reject(new Error(json.error.message || JSON.stringify(json.error)));
                        } else {
                            resolve(json);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            }
        );
        request.on('error', reject);
        request.on('timeout', () => {
            request.destroy(new Error('Instagram Graph API request timeout'));
        });
    });
}

async function fetchLatestReelsFromInstagramGraph(igUserId, accessToken, limit) {
    const fields = 'id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp';
    const pathQuery = `/${GRAPH_API_VERSION}/${encodeURIComponent(igUserId)}/media?fields=${encodeURIComponent(fields)}&limit=50&access_token=${encodeURIComponent(accessToken)}`;
    const data = await httpsGetFacebookGraph(pathQuery);
    const items = Array.isArray(data.data) ? data.data : [];

    const reelItems = items.filter((m) => {
        if (!m || !m.media_url) return false;
        if (m.media_product_type === 'REELS') return true;
        if (m.media_type === 'VIDEO' && m.permalink && /\/reel\//.test(m.permalink)) return true;
        return false;
    });

    reelItems.sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));

    return reelItems.slice(0, limit).map((m) => {
        const perm = m.permalink || '';
        const shortcodeMatch = perm.match(/\/reel\/([A-Za-z0-9_-]+)/);
        const shortcode = shortcodeMatch ? shortcodeMatch[1] : '';
        const captionText = typeof m.caption === 'string' ? m.caption : '';
        return {
            shortcode: shortcode || null,
            url: perm || (shortcode ? `https://www.instagram.com/reel/${shortcode}/` : null),
            caption: captionText,
            thumbnail: m.thumbnail_url || null,
            videoUrl: m.media_url || null,
            timestamp: m.timestamp || null
        };
    }).filter((r) => r.shortcode);
}

// Middleware
app.use(cors());

// Middleware condicional: excluir webhook de Stripe del parsing JSON
// porque necesita el body raw para verificar la firma
app.use((req, res, next) => {
    if (req.path === '/webhook-stripe') {
        // Para el webhook, usar express.raw() en lugar de express.json()
        express.raw({ type: 'application/json' })(req, res, next);
    } else {
        // Para el resto de endpoints, usar express.json()
        express.json()(req, res, next);
    }
});

// Middleware WebP: sirve .webp si el navegador lo soporta y el archivo existe
app.use((req, res, next) => {
    if (!/\.(jpe?g|png)$/i.test(req.path)) return next();
    if (!req.headers.accept || !req.headers.accept.includes('image/webp')) return next();

    const webpPath = path.join(__dirname, req.path.replace(/\.(jpe?g|png)$/i, '.webp'));
    if (fs.existsSync(webpPath)) {
        res.set('Content-Type', 'image/webp');
        res.set('Vary', 'Accept');
        return res.sendFile(webpPath);
    }
    next();
});

// Dynamic OG meta tags for product pages (must be before static middleware)
// WhatsApp/Facebook crawlers don't execute JS, so OG tags must be server-rendered
function escapeHtmlAttr(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function findProductById(id) {
    const dataFiles = [
        path.join(__dirname, 'data', 'cuidadoPiel.json'),
        path.join(__dirname, 'data', 'cuidadoCapilar.json')
    ];
    for (const dataFile of dataFiles) {
        try {
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            if (!Array.isArray(data.categorias)) continue;
            for (const categoria of data.categorias) {
                const found = (categoria.productos || []).find(p => p.id === id);
                if (found) return found;
            }
        } catch (_) { /* continue */ }
    }
    return null;
}

app.get('/html/producto.html', (req, res, next) => {
    const productId = req.query.id;
    if (!productId) return next();

    const producto = findProductById(productId);
    if (!producto) return next();

    try {
        const htmlPath = path.join(__dirname, 'html', 'producto.html');
        let html = fs.readFileSync(htmlPath, 'utf8');

        const BASE_URL = 'https://anitapinturitas.es';
        const imageUrl = producto.image_link ||
            (producto.imagen
                ? (producto.imagen.startsWith('http') ? producto.imagen : `${BASE_URL}${producto.imagen.startsWith('/') ? '' : '/'}${producto.imagen}`)
                : `${BASE_URL}/assets/anita-pinturitas_logo.png`);
        const productUrl = `${BASE_URL}/html/producto.html?id=${encodeURIComponent(productId)}`;
        const title = escapeHtmlAttr(`${producto.nombre} - Anita Pinturitas`);
        const description = escapeHtmlAttr(
            producto.descripcion ? producto.descripcion.substring(0, 200) : 'Producto de belleza testado y recomendado. Ideal para piel madura.'
        );
        const safeImageUrl = escapeHtmlAttr(imageUrl);
        const safeProductUrl = escapeHtmlAttr(productUrl);

        html = html.replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${safeProductUrl}">`);
        html = html.replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${title}">`);
        html = html.replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${description}">`);
        html = html.replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${safeImageUrl}">`);
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
        html = html.replace(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${safeProductUrl}">`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch (error) {
        console.error('Error serving dynamic product OG tags:', error);
        next();
    }
});

app.use(express.static('.'));

// 301 redirects for old/incorrect URLs indexed by Google
app.get('/index', (req, res) => res.redirect(301, '/'));
app.get('/index.html', (req, res) => res.redirect(301, '/'));
app.get('/carrito', (req, res) => res.redirect(301, '/'));
app.get('/carrito.html', (req, res) => res.redirect(301, '/'));
app.get('/producto', (req, res) => {
    const id = req.query.id;
    res.redirect(301, id ? `/html/producto.html?id=${id}` : '/html/productos.html');
});
app.get('/producto.html', (req, res) => {
    const id = req.query.id;
    res.redirect(301, id ? `/html/producto.html?id=${id}` : '/html/productos.html');
});
app.get('/productos', (req, res) => res.redirect(301, '/html/productos.html'));
app.get('/productos.html', (req, res) => res.redirect(301, '/html/productos.html'));
app.get('/politica-devoluciones.html', (req, res) => res.redirect(301, '/html/politicaDevoluciones.html'));
app.get('/politica-privacidad.html', (req, res) => res.redirect(301, '/html/politicaPrivacidad.html'));
app.get('/politica-cookies.html', (req, res) => res.redirect(301, '/html/politicaCookies.html'));
app.get('/aviso-legal.html', (req, res) => res.redirect(301, '/html/avisoLegal.html'));

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
app.post('/webhook-stripe', async (req, res) => {
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
            const testEventCode = process.env.META_TEST_EVENT_CODE || 'TEST48945'; // Usar variable de entorno o fallback

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
        const testEventCode = process.env.META_TEST_EVENT_CODE || 'TEST48945';

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
        const testEventCode = process.env.META_TEST_EVENT_CODE || 'TEST48945';

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


// Endpoint to check Instagram Live status
// Best-effort detection + Manual override via environment variable
app.get('/api/instagram-live-status', async (req, res) => {
    const { username } = req.query;
    
    // Check if manual override is set in environment variables
    // This allows the user to force "Live" status via Render Dashboard or .env
    const forceLive = process.env.FORCE_INSTAGRAM_LIVE === 'true';
    if (forceLive) {
        return res.json({ isLive: true, source: 'manual_override' });
    }

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    try {
        // Best-effort check: Try to fetch the live URL
        // Note: Instagram often blocks server-side requests. 
        // This is a minimal implementation that can be expanded with proxies if needed.
        const options = {
            hostname: 'www.instagram.com',
            path: `/${username}/live/`,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
            },
            timeout: 5000
        };

        const request = https.get(options, (instaRes) => {
            // If it redirects to profiles (302) or returns 404, they are likely not live
            // If it returns 200, they might be live
            const isLive = instaRes.statusCode === 200;
            
            res.json({ 
                isLive, 
                statusCode: instaRes.statusCode,
                username 
            });
        });

        request.on('error', (e) => {
            console.error('Instagram check error:', e.message);
            res.json({ isLive: false, error: 'Connection error' });
        });

        request.end();

    } catch (error) {
        console.error('Error in /api/instagram-live-status:', error);
        res.json({ isLive: false });
    }
});

// Endpoint para resolver la URL de vídeo de un reel por shortcode
app.get('/api/instagram-reel-video/:shortcode', async (req, res) => {
    const shortcode = (req.params.shortcode || '').toString().trim();

    if (!/^[A-Za-z0-9_-]+$/.test(shortcode)) {
        return res.status(400).json({ error: 'Invalid shortcode' });
    }

    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
    };

    function getHtml(hostname, requestPath) {
        return new Promise((resolve, reject) => {
            const request = https.get({
                hostname,
                path: requestPath,
                method: 'GET',
                headers,
                timeout: 8000
            }, (apiRes) => {
                let raw = '';
                apiRes.on('data', (chunk) => { raw += chunk; });
                apiRes.on('end', () => {
                    if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
                        return reject(new Error(`Instagram responded with ${apiRes.statusCode}`));
                    }
                    resolve(raw);
                });
            });

            request.on('error', reject);
            request.on('timeout', () => request.destroy(new Error('Instagram request timeout')));
        });
    }

    try {
        const html = await getHtml('www.instagram.com', `/reel/${encodeURIComponent(shortcode)}/`);
        const match = html.match(/<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i);
        const videoUrl = match ? match[1].replace(/&amp;/g, '&') : null;

        if (!videoUrl) {
            return res.status(404).json({ error: 'Video URL not found' });
        }

        return res.redirect(302, videoUrl);
    } catch (error) {
        console.error('Error in /api/instagram-reel-video:', error.message);
        return res.status(503).json({ error: 'Unable to resolve reel video now' });
    }
});

// Endpoint para obtener los últimos reels públicos de una cuenta
app.get('/api/instagram-latest-reels', async (req, res) => {
    const username = (req.query.username || '').toString().trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 3, 6);

    if (!username) {
        return res.status(400).json({ error: 'Username is required' });
    }

    const instagramHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'X-IG-App-ID': '936619743392459',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache'
    };

    function instagramShortcodeFromUrl(u) {
        if (!u || typeof u !== 'string') return null;
        const m = String(u).trim().match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/i);
        return m ? m[1] : null;
    }

    function readReelsCache() {
        try {
            if (!fs.existsSync(INSTAGRAM_REELS_CACHE_PATH)) {
                return null;
            }
            const raw = fs.readFileSync(INSTAGRAM_REELS_CACHE_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.reels)) {
                return null;
            }
            return parsed;
        } catch (error) {
            console.warn('⚠️ Error reading reels cache:', error.message);
            return null;
        }
    }

    function readManualReelsConfig() {
        const envReels = [];
        for (let i = 1; i <= 3; i++) {
            const videoRaw = process.env[`INSTAGRAM_REEL_${i}_VIDEO_URL`];
            const videoUrl = videoRaw ? String(videoRaw).trim() : '';
            const igUrl = String(process.env[`INSTAGRAM_REEL_${i}_URL`] || '').trim();
            if (!videoUrl && !igUrl) continue;

            const shortcode = instagramShortcodeFromUrl(igUrl);
            const thumb = String(process.env[`INSTAGRAM_REEL_${i}_THUMB_URL`] || '').trim() || null;
            envReels.push({
                shortcode,
                url: igUrl || (shortcode ? `https://www.instagram.com/reel/${shortcode}/` : 'https://www.instagram.com/anita_pinturitas/reels/'),
                caption: '',
                thumbnail: thumb,
                videoUrl: videoUrl || null,
                timestamp: null
            });
        }
        if (envReels.length > 0) {
            return { manualReels: envReels, fromEnv: true, useAsPrimary: false };
        }

        try {
            if (!fs.existsSync(INSTAGRAM_REELS_MANUAL_PATH)) {
                return { manualReels: [], fromEnv: false, useAsPrimary: false };
            }
            const raw = fs.readFileSync(INSTAGRAM_REELS_MANUAL_PATH, 'utf8');
            const parsed = JSON.parse(raw);
            if (!parsed || !Array.isArray(parsed.manualReels)) {
                return { manualReels: [], fromEnv: false, useAsPrimary: false };
            }
            return {
                ...parsed,
                fromEnv: false,
                useAsPrimary: parsed.useAsPrimary === true
            };
        } catch (error) {
            console.warn('⚠️ Error reading manual reels config:', error.message);
            return { manualReels: [], fromEnv: false, useAsPrimary: false };
        }
    }

    function applyManualOverrides(reels, manualConfig) {
        if (!Array.isArray(reels) || reels.length === 0) {
            return [];
        }

        const byShortcode = new Map(
            (manualConfig?.manualReels || [])
                .filter((item) => item && item.shortcode)
                .map((item) => [item.shortcode, item])
        );

        return reels.map((reel) => {
            const manual = byShortcode.get(reel.shortcode);
            if (!manual) return reel;

            return {
                ...reel,
                // Si defines videoUrl en data/instagramReelsManual.json, tendrá prioridad para reproducir en web.
                videoUrl: manual.videoUrl || reel.videoUrl || null,
                thumbnail: manual.thumbnail || reel.thumbnail || null,
                caption: manual.caption || reel.caption || ''
            };
        });
    }

    function writeReelsCache(payload) {
        try {
            const cachePayload = {
                updatedAt: new Date().toISOString(),
                username: payload.username,
                count: payload.count,
                reels: payload.reels
            };
            fs.writeFileSync(INSTAGRAM_REELS_CACHE_PATH, JSON.stringify(cachePayload, null, 2), 'utf8');
        } catch (error) {
            console.warn('⚠️ Error writing reels cache:', error.message);
        }
    }

    function getJson(hostname, requestPath, headers = instagramHeaders) {
        return new Promise((resolve, reject) => {
            const request = https.get({
                hostname,
                path: requestPath,
                method: 'GET',
                headers,
                timeout: 8000
            }, (apiRes) => {
                let raw = '';
                apiRes.on('data', (chunk) => {
                    raw += chunk;
                });
                apiRes.on('end', () => {
                    if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
                        return reject(new Error(`Instagram responded with ${apiRes.statusCode} on ${hostname}${requestPath}`));
                    }
                    try {
                        resolve(JSON.parse(raw));
                    } catch (parseError) {
                        reject(parseError);
                    }
                });
            });

            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy(new Error('Instagram request timeout'));
            });
        });
    }

    function getHtml(hostname, requestPath, headers = instagramHeaders) {
        return new Promise((resolve, reject) => {
            const request = https.get({
                hostname,
                path: requestPath,
                method: 'GET',
                headers,
                timeout: 8000
            }, (apiRes) => {
                let raw = '';
                apiRes.on('data', (chunk) => {
                    raw += chunk;
                });
                apiRes.on('end', () => {
                    if (apiRes.statusCode < 200 || apiRes.statusCode >= 300) {
                        return reject(new Error(`Instagram HTML responded with ${apiRes.statusCode} on ${hostname}${requestPath}`));
                    }
                    resolve(raw);
                });
            });

            request.on('error', reject);
            request.on('timeout', () => {
                request.destroy(new Error('Instagram HTML request timeout'));
            });
        });
    }

    function matchMetaContent(html, property) {
        if (!html) return null;
        const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i');
        const match = html.match(regex);
        return match ? match[1] : null;
    }

    async function enrichReelsWithPublicMeta(reels) {
        const enriched = [];
        for (const reel of reels) {
            if (reel.videoUrl && reel.thumbnail) {
                enriched.push(reel);
                continue;
            }

            try {
                const reelHtml = await getHtml('www.instagram.com', `/reel/${encodeURIComponent(reel.shortcode)}/`);
                enriched.push({
                    ...reel,
                    videoUrl: reel.videoUrl || matchMetaContent(reelHtml, 'og:video') || null,
                    thumbnail: reel.thumbnail || matchMetaContent(reelHtml, 'og:image') || null,
                    caption: reel.caption || matchMetaContent(reelHtml, 'og:title') || ''
                });
            } catch (error) {
                enriched.push(reel);
            }
        }
        return enriched;
    }

    async function getJsonWithRetry(hostname, requestPath, headers = instagramHeaders, retries = 2) {
        let lastError = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                return await getJson(hostname, requestPath, headers);
            } catch (error) {
                lastError = error;
                if (attempt < retries) {
                    await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
                }
            }
        }
        throw lastError;
    }

    try {
        const manualConfig = readManualReelsConfig();
        const graphToken = process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN;
        const graphIgUserId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.INSTAGRAM_IG_USER_ID;

        if (manualConfig.fromEnv && manualConfig.manualReels.length > 0) {
            const enriched = await enrichReelsWithPublicMeta(manualConfig.manualReels.slice(0, limit));
            const responsePayload = {
                username,
                count: enriched.length,
                reels: enriched,
                source: 'manual_env'
            };
            writeReelsCache(responsePayload);
            return res.json(responsePayload);
        }

        if (manualConfig.useAsPrimary && manualConfig.manualReels.length > 0) {
            const normalized = manualConfig.manualReels.slice(0, limit).map((item) => {
                const sc = (item && item.shortcode) || instagramShortcodeFromUrl(item?.url || '');
                return {
                    shortcode: sc,
                    url: (item && item.url) || (sc ? `https://www.instagram.com/reel/${sc}/` : null),
                    caption: (item && item.caption) || '',
                    thumbnail: (item && item.thumbnail) || null,
                    videoUrl: (item && item.videoUrl) || null,
                    timestamp: (item && item.timestamp) || null
                };
            });
            const enriched = await enrichReelsWithPublicMeta(normalized);
            const responsePayload = {
                username,
                count: enriched.length,
                reels: enriched,
                source: 'manual_file'
            };
            writeReelsCache(responsePayload);
            return res.json(responsePayload);
        }

        if (graphToken && graphIgUserId) {
            try {
                const graphReels = await fetchLatestReelsFromInstagramGraph(graphIgUserId, graphToken, limit);
                if (graphReels.length > 0) {
                    const finalReels = applyManualOverrides(graphReels, manualConfig);
                    const responsePayload = {
                        username,
                        count: finalReels.length,
                        reels: finalReels,
                        source: 'instagram_graph'
                    };
                    writeReelsCache(responsePayload);
                    return res.json(responsePayload);
                }
            } catch (graphErr) {
                console.warn('Instagram Graph API reels failed, fallback scraping:', graphErr.message);
            }
        }

        const profileData = await getJsonWithRetry(
            'www.instagram.com',
            `/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`,
            instagramHeaders
        );

        const userId = profileData?.data?.user?.id;
        if (!userId) {
            return res.status(200).json({ username, count: 0, reels: [], error: 'Instagram user not found' });
        }

        const feedData = await getJsonWithRetry(
            'i.instagram.com',
            `/api/v1/feed/user/${encodeURIComponent(userId)}/?count=50`,
            instagramHeaders
        );

        const feedItems = Array.isArray(feedData?.items) ? feedData.items : [];
        const reels = feedItems
            .filter((item) => item && item.media_type === 2 && item.product_type === 'clips' && item.code)
            .slice(0, limit)
            .map((item) => ({
                shortcode: item.code,
                url: `https://www.instagram.com/reel/${item.code}/`,
                caption: item.caption?.text || '',
                thumbnail: item.image_versions2?.candidates?.[0]?.url || null,
                videoUrl: item.video_versions?.[0]?.url || null,
                timestamp: item.taken_at || null
            }));

        if (reels.length > 0) {
            const enrichedReels = applyManualOverrides(await enrichReelsWithPublicMeta(reels), manualConfig);
            const responsePayload = { username, count: enrichedReels.length, reels: enrichedReels, source: 'instagram_live' };
            writeReelsCache(responsePayload);
            return res.json(responsePayload);
        }

        // Fallback: usar timeline del profile endpoint si el feed no devuelve reels.
        const timelineReels = (profileData?.data?.user?.edge_owner_to_timeline_media?.edges || [])
            .map((edge) => edge?.node)
            .filter((node) => node && node.is_video && (node.product_type === 'clips' || node.__typename === 'GraphVideo'))
            .slice(0, limit)
            .map((node) => ({
                shortcode: node.shortcode,
                url: `https://www.instagram.com/reel/${node.shortcode}/`,
                caption: node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
                thumbnail: node.display_url || null,
                videoUrl: null,
                timestamp: node.taken_at_timestamp || null
            }));

        if (timelineReels.length > 0) {
            const enrichedTimelineReels = applyManualOverrides(await enrichReelsWithPublicMeta(timelineReels), manualConfig);
            const responsePayload = { username, count: enrichedTimelineReels.length, reels: enrichedTimelineReels, source: 'instagram_timeline' };
            writeReelsCache(responsePayload);
            return res.json(responsePayload);
        }

        const cache = readReelsCache();
        if (cache && cache.reels.length > 0) {
            const cachedReels = cache.reels.slice(0, limit);
            const enrichedCachedReels = applyManualOverrides(await enrichReelsWithPublicMeta(cachedReels), manualConfig);
            const cacheResponsePayload = {
                username,
                count: enrichedCachedReels.length,
                reels: enrichedCachedReels,
                source: 'cache',
                cachedAt: cache.updatedAt
            };
            if (enrichedCachedReels.some((reel) => reel.videoUrl || reel.thumbnail)) {
                writeReelsCache(cacheResponsePayload);
            }
            return res.json({
                ...cacheResponsePayload
            });
        }

        // Último fallback: usar manualReels si existen en config.
        if (manualConfig.manualReels.length > 0) {
            const fallbackManualReels = manualConfig.manualReels.slice(0, limit).map((item) => ({
                shortcode: item.shortcode || null,
                url: item.url || (item.shortcode ? `https://www.instagram.com/reel/${item.shortcode}/` : null),
                caption: item.caption || '',
                thumbnail: item.thumbnail || null,
                videoUrl: item.videoUrl || null,
                timestamp: item.timestamp || null
            }));
            return res.json({
                username,
                count: fallbackManualReels.length,
                reels: fallbackManualReels,
                source: 'manual'
            });
        }

        return res.status(200).json({ username, count: 0, reels: [], error: 'Unable to fetch reels now' });
    } catch (error) {
        console.error('Error in /api/instagram-latest-reels:', error.message);
        const cache = readReelsCache();
        const manualConfig = readManualReelsConfig();
        if (cache && cache.reels.length > 0) {
            return res.json({
                username,
                count: Math.min(limit, cache.reels.length),
                reels: applyManualOverrides(cache.reels.slice(0, limit), manualConfig),
                source: 'cache',
                cachedAt: cache.updatedAt
            });
        }

        if (manualConfig.manualReels.length > 0) {
            return res.json({
                username,
                count: Math.min(limit, manualConfig.manualReels.length),
                reels: manualConfig.manualReels.slice(0, limit),
                source: 'manual'
            });
        }

        return res.status(200).json({ username, count: 0, reels: [], error: 'Unable to fetch reels now' });
    }
});

// ===== GOOGLE REVIEWS =====
function readGoogleReviewsCache() {
    try {
        if (!fs.existsSync(GOOGLE_REVIEWS_CACHE_PATH)) return null;
        const raw = fs.readFileSync(GOOGLE_REVIEWS_CACHE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.reviews)) return null;
        const age = Date.now() - new Date(parsed.updatedAt).getTime();
        if (age > GOOGLE_REVIEWS_CACHE_TTL_MS) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeGoogleReviewsCache(data) {
    try {
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(GOOGLE_REVIEWS_CACHE_PATH, JSON.stringify({ updatedAt: new Date().toISOString(), ...data }, null, 2), 'utf8');
    } catch (err) {
        console.warn('⚠️ Error writing Google reviews cache:', err.message);
    }
}

function googleMapsGet(urlPath) {
    return new Promise((resolve, reject) => {
        const request = https.get(
            { hostname: 'maps.googleapis.com', path: urlPath, timeout: 10000 },
            (res) => {
                let raw = '';
                res.on('data', (chunk) => { raw += chunk; });
                res.on('end', () => {
                    try { resolve(JSON.parse(raw)); }
                    catch (e) { reject(e); }
                });
            }
        );
        request.on('error', reject);
        request.on('timeout', () => request.destroy(new Error('Google Maps API timeout')));
    });
}

async function resolveGooglePlaceId(apiKey) {
    const placeId = process.env.GOOGLE_PLACE_ID;
    if (placeId) return placeId;

    const businessName = process.env.GOOGLE_BUSINESS_NAME || 'Anita Pinturitas Asturias';
    const params = new URLSearchParams({ input: businessName, inputtype: 'textquery', fields: 'place_id', language: 'es', key: apiKey });
    const data = await googleMapsGet(`/maps/api/place/findplacefromtext/json?${params}`);

    if (data.status !== 'OK' || !data.candidates?.[0]?.place_id) {
        throw new Error(`No se encontró el negocio "${businessName}" en Google. Status: ${data.status}`);
    }

    const found = data.candidates[0].place_id;
    console.log(`✅ Google Place ID encontrado automáticamente: ${found}`);
    return found;
}

async function fetchGooglePlaceDetails(placeId, apiKey) {
    const params = new URLSearchParams({
        place_id: placeId,
        fields: 'rating,user_ratings_total,reviews',
        language: 'es',
        reviews_sort: 'newest',
        key: apiKey
    });
    return googleMapsGet(`/maps/api/place/details/json?${params}`);
}

app.get('/api/google-reviews', async (req, res) => {
    const cached = readGoogleReviewsCache();
    if (cached) return res.json(cached);

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'Falta GOOGLE_PLACES_API_KEY en las variables de entorno.' });
    }

    try {
        const placeId = await resolveGooglePlaceId(apiKey);
        const data = await fetchGooglePlaceDetails(placeId, apiKey);

        if (data.status !== 'OK') {
            console.error('Google Places API error:', data.status, data.error_message);
            return res.status(502).json({ error: `Google API error: ${data.status}` });
        }

        const reviews = (data.result.reviews || [])
            .filter(r => r.rating >= 4)
            .map(r => ({
                author: r.author_name,
                photo: r.profile_photo_url || null,
                rating: r.rating,
                text: r.text,
                time: r.relative_time_description
            }));

        const payload = {
            rating: data.result.rating,
            total: data.result.user_ratings_total,
            reviews,
            placeId
        };

        writeGoogleReviewsCache(payload);
        res.json(payload);
    } catch (err) {
        console.error('Error fetching Google reviews:', err.message);
        res.status(503).json({ error: err.message });
    }
});

// Endpoint de salud para verificar que el servidor funciona
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor funcionando correctamente' });
});

app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);

    if (
        process.env.INSTAGRAM_REEL_1_VIDEO_URL ||
        process.env.INSTAGRAM_REEL_2_VIDEO_URL ||
        process.env.INSTAGRAM_REEL_3_VIDEO_URL
    ) {
        console.log('✅ Reels manuales por entorno: INSTAGRAM_REEL_*_VIDEO_URL (prioridad sobre Graph y scraping)');
    } else if (process.env.INSTAGRAM_GRAPH_ACCESS_TOKEN && (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.INSTAGRAM_IG_USER_ID)) {
        console.log('✅ Instagram Graph API configurada (reels automáticos con media_url)');
    } else {
        console.log('ℹ️ Instagram Graph API no configurada: reels usan scraping/cache/manual (menos fiable en hosting)');
    }

    if (stripeSecretKey && !stripeSecretKey.includes('tu_clave_aqui')) {
        console.log('✅ Stripe configurado correctamente');
    }
});

