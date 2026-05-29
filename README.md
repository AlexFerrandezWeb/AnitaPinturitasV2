# Anita Pinturitas - Tienda Online de Cosmética Natural

## Descripción del Proyecto

Anita Pinturitas es una tienda online especializada en productos de cosmética natural, con un enfoque en marcas como Younique y Naturnua. La web ofrece una experiencia de compra completa con carrito de compras lateral, procesamiento de pagos con Stripe, integración con Meta Pixel y GA4, y sección de reels de Instagram.

## URL de Producción

- **Sitio Web:** https://anitapinturitas.es
- **Servidor Backend:** Render (Node.js)

## Tecnologías Utilizadas

### Frontend
- **HTML5** - Estructura semántica
- **CSS3** - Estilos y diseño responsive
- **JavaScript (ES6+)** - Funcionalidad interactiva
- **Stripe.js** - Procesamiento de pagos

### Backend
- **Node.js** - Entorno de ejecución
- **Express** - Framework web
- **Stripe API** - Procesamiento de pagos
- **Meta Conversions API** - Tracking de eventos server-side

### Hosting y Servicios
- **Render** - Hosting del backend (sirve también el frontend estático)
- **GitHub** - Control de versiones
- **Stripe** - Pasarela de pagos
- **Meta Pixel** - Tracking de marketing
- **Google Analytics 4** - Analytics

## Estructura del Proyecto

```
anitaPinturitasV3/
│
├── index.html                  # Página principal
├── server.js                   # Servidor Express (backend + estáticos)
├── package.json
├── render.yaml                 # Configuración de Render
├── robots.txt
├── sitemap.xml
├── product-feed.csv            # Feed de productos para Meta
│
├── html/                       # Páginas internas
│   ├── productos.html          # Catálogo general
│   ├── producto.html           # Página individual de producto
│   ├── cuidadoPiel.html        # Catálogo cuidado de la piel
│   ├── cuidadoCapilar.html     # Catálogo cuidado capilar
│   ├── success.html            # Página de éxito de compra
│   ├── cancel.html             # Página de cancelación de pago
│   ├── politicaDevoluciones.html
│   ├── politicaPrivacidad.html
│   ├── politicaCookies.html
│   └── avisoLegal.html
│
├── css/                        # Estilos
│   ├── index.css
│   ├── nav.css
│   ├── footer.css
│   ├── productos.css
│   ├── producto.css
│   ├── carrito.css
│   ├── cuidadoPiel.css
│   ├── cuidadoCapilar.css
│   ├── cartAnimation.css
│   ├── confirmModal.css
│   ├── searchResults.css
│   ├── botonFlotante.css
│   └── reset.css
│
├── js/                         # JavaScript frontend
│   ├── carrito.js              # Lógica del carrito lateral
│   ├── producto.js             # Página de producto individual
│   ├── cuidadoPiel.js          # Catálogo cuidado piel
│   ├── cuidadoCapilar.js       # Catálogo cuidado capilar
│   ├── buscador.js             # Búsqueda de productos
│   ├── nav.js                  # Navegación
│   ├── metaPixelTracking.js    # Eventos Meta Pixel (client-side)
│   ├── enriquecerProductosMeta.js
│   ├── instagram-status.js     # Estado live de Instagram
│   ├── cartAnimation.js
│   ├── cartUtils.js
│   ├── confirmModal.js
│   ├── menu-hamburguesa.js
│   ├── botonFlotante.js
│   ├── carruselClientas.js
│   └── carruselTestimonios.js
│
├── data/                       # Datos de productos y caché
│   ├── cuidadoPiel.json        # Catálogo cuidado piel
│   ├── cuidadoCapilar.json     # Catálogo cuidado capilar
│   ├── instagramReelsCache.json
│   └── instagramReelsManual.json
│
└── assets/                     # Imágenes y recursos multimedia
```

## Funcionalidades Principales

### Página Principal (index.html)
- Hero section con productos destacados
- Carrusel de testimonios y clientas
- Sección de reels de Instagram con reproducción directa
- Indicador de estado live de Instagram
- Navegación responsive con carrito lateral

### Carrito de Compras (sidebar)
- Gestión de productos en tiempo real
- Cálculo automático de totales
- Envío gratuito a partir de 62€
- Checkout con Stripe (tarjeta, PayPal, Klarna, Google Pay)

### Catálogo de Productos
- Catálogo general y por categorías (cuidado piel / capilar)
- Búsqueda de productos
- Animación de añadir al carrito

### Página de Producto
- Información detallada del producto
- Galería de imágenes
- Añadir al carrito con animación
- Meta tags y canonical URLs optimizados

## Sistema de Pagos

### Stripe Integration
- **Sesión de checkout:** `POST /api/create-checkout-session`
- **Verificar sesión:** `GET /api/checkout-session/:sessionId`
- **Webhook:** `POST /webhook-stripe` (evento `checkout.session.completed`)
- Métodos de pago: tarjeta, PayPal, Klarna, Google Pay

## API Endpoints del Servidor

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/create-checkout-session` | Crear sesión de pago Stripe |
| GET | `/api/checkout-session/:id` | Verificar estado de sesión |
| POST | `/webhook-stripe` | Webhook de Stripe (HQC Meta) |
| POST | `/api/track-purchase` | Trackear compra en Meta CAPI |
| POST | `/api/track-event` | Trackear evento genérico en Meta CAPI |
| GET | `/api/instagram-latest-reels` | Obtener últimos reels |
| GET | `/api/instagram-live-status` | Estado live de Instagram |
| GET | `/api/instagram-reel-video/:shortcode` | Resolver URL de vídeo de reel |
| GET | `/product-feed.csv` | Feed de productos para Meta |
| GET | `/api/health` | Estado del servidor |

## Configuración del Entorno

### Instalación Local
```bash
git clone https://github.com/AlexFerrandezWeb/AnitaPinturitasV2.git
cd AnitaPinturitasV2
npm install
```

Crear archivo `.env`:
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
META_ACCESS_TOKEN=...
META_PIXEL_ID=...
SUCCESS_URL=https://anitapinturitas.es
CANCEL_URL=https://anitapinturitas.es
NODE_ENV=development

# Instagram Reels (Graph API - opcional)
INSTAGRAM_GRAPH_ACCESS_TOKEN=...
INSTAGRAM_BUSINESS_ACCOUNT_ID=...

# Forzar estado live de Instagram (opcional)
FORCE_INSTAGRAM_LIVE=false
```

Iniciar servidor:
```bash
node server.js
# o en desarrollo:
npx nodemon server.js
```

### Despliegue en Render
1. Conectar repositorio GitHub (`AnitaPinturitasV2`)
2. Build command: `npm install`
3. Start command: `node server.js`
4. Configurar variables de entorno en el dashboard de Render

## Reels de Instagram

El servidor intenta obtener reels por este orden de prioridad:

1. **Variables de entorno** `INSTAGRAM_REEL_1_VIDEO_URL` / `_2` / `_3` — máxima prioridad
2. **Archivo manual** `data/instagramReelsManual.json` con `"useAsPrimary": true`
3. **Instagram Graph API** (requiere token configurado)
4. **Caché** `data/instagramReelsCache.json` — fallback

## SEO

- Canonical URLs en todas las páginas
- Sitemap en `/sitemap.xml`
- Redirects 301 para URLs antiguas indexadas por Google
- `robots.txt` configurado

## Responsive Design

La web está optimizada para:
- **Desktop** (1200px+)
- **Tablet** (768px - 1199px)
- **Mobile** (320px - 767px)

## Analytics y Marketing

- **Google Analytics 4:** Tracking completo del funnel de conversión
- **Meta Pixel:** Eventos client-side + server-side (CAPI via webhook Stripe)
- **Google Tag Manager:** Configurado en todas las páginas

## Seguridad

- HTTPS en producción
- Verificación de firma en webhook de Stripe
- Variables de entorno para claves sensibles
- CORS configurado

## Contacto

- **Desarrollador:** Alex Ferrandez
- **Cliente:** Ana María Ramos Rodríguez
- **Web:** https://anitapinturitas.es

---

**Última actualización:** Mayo 2026  
**Versión:** 3.0.0
