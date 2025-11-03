// Servidor backend para Stripe Checkout
const express = require('express');
const stripe = require('stripe');
const cors = require('cors');
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

        // Crear sesión de checkout
        const session = await stripeClient.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: lineItems,
            mode: 'payment',
            success_url: `${process.env.SUCCESS_URL || 'http://localhost:3000'}/html/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CANCEL_URL || 'http://localhost:3000'}/html/cancel.html`,
            billing_address_collection: 'auto',
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

