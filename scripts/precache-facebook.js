// Pre-cachea en Facebook la vista previa (Open Graph) de todas las fichas de producto.
//
// Por qué: la primera vez que se comparte una URL, Facebook tiene que rastrearla en
// ese momento. Desde el compositor del móvil ese rastreo suele perder la carrera y la
// publicación sale con el enlace en texto plano, sin tarjeta. Si la URL ya está
// cacheada, la tarjeta aparece al instante. Esto hace lo mismo que pulsar
// "Scrape Again" en el Sharing Debugger, pero para todos los productos de golpe.
//
// Uso: node scripts/precache-facebook.js
//      node scripts/precache-facebook.js reafirmante_corporal_200_ml   (solo uno)
//
// Necesita un token en .env (cualquiera de los dos):
//   FB_SCRAPE_TOKEN=EAAB...        (token de usuario/system user con la app de Meta)
//   FB_APP_ID=...  FB_APP_SECRET=...  (se combinan como token de app)
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://anitapinturitas.es';
const GRAPH_VERSION = 'v21.0';
const ROOT = path.join(__dirname, '..');
const PAUSA_MS = 500; // margen para no chocar con el rate limit de la Graph API

const token = process.env.FB_SCRAPE_TOKEN
    || (process.env.FB_APP_ID && process.env.FB_APP_SECRET
        ? `${process.env.FB_APP_ID}|${process.env.FB_APP_SECRET}`
        : null);

if (!token) {
    console.error('Falta el token. Define FB_SCRAPE_TOKEN (o FB_APP_ID + FB_APP_SECRET) en .env');
    process.exit(1);
}

function cargarProductos() {
    const productos = [];
    const vistos = new Set();
    for (const file of ['cuidadoPiel.json', 'cuidadoCapilar.json']) {
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
        for (const categoria of data.categorias || []) {
            for (const producto of categoria.productos || []) {
                if (!producto.id || vistos.has(producto.id)) continue;
                vistos.add(producto.id);
                productos.push(producto);
            }
        }
    }
    return productos;
}

async function rascar(url) {
    const endpoint = `https://graph.facebook.com/${GRAPH_VERSION}/`
        + `?id=${encodeURIComponent(url)}&scrape=true&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(endpoint, { method: 'POST' });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.error) {
        return { ok: false, error: body.error?.message || `HTTP ${res.status}` };
    }
    return { ok: true, title: body.title, image: Array.isArray(body.image) ? body.image[0]?.url : undefined };
}

(async () => {
    const filtro = process.argv[2];
    const productos = cargarProductos().filter((p) => !filtro || p.id === filtro);

    if (!productos.length) {
        console.error(filtro ? `No existe ningún producto con id "${filtro}"` : 'No se encontró ningún producto');
        process.exit(1);
    }

    console.log(`Pre-cacheando ${productos.length} producto(s) en Facebook...\n`);
    let ok = 0;
    const fallos = [];

    for (const producto of productos) {
        const url = `${BASE_URL}/html/producto.html?id=${encodeURIComponent(producto.id)}`;
        const r = await rascar(url);
        if (r.ok && r.title && r.image) {
            ok++;
            console.log(`  OK   ${producto.id} -> ${r.title}`);
        } else if (r.ok) {
            // Facebook respondió pero sin título o sin imagen: la tarjeta saldría incompleta
            fallos.push({ id: producto.id, error: `sin ${!r.title ? 'título' : 'imagen'} en la respuesta` });
            console.log(`  AVISO ${producto.id} -> tarjeta incompleta`);
        } else {
            fallos.push({ id: producto.id, error: r.error });
            console.log(`  ERROR ${producto.id} -> ${r.error}`);
        }
        await new Promise((r) => setTimeout(r, PAUSA_MS));
    }

    console.log(`\n${ok}/${productos.length} listos para compartir.`);
    if (fallos.length) {
        console.log('\nRevisar:');
        for (const f of fallos) console.log(`  - ${f.id}: ${f.error}`);
        process.exit(1);
    }
})();
