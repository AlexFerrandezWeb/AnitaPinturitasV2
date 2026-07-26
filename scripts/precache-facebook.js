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
//      node scripts/precache-facebook.js --force    (rehace también los ya hechos)
//
// La Graph API limita las peticiones por hora y el catálogo entero no cabe en una
// tanda. El script apunta lo que va consiguiendo en .fb-precache-state.json y, si se
// topa con el límite, para y avisa: basta con volver a lanzarlo al cabo de una hora y
// sigue por donde se quedó.
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
const ESTADO = path.join(ROOT, '.fb-precache-state.json');

function leerEstado() {
    try { return JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch (_) { return { hechos: {} }; }
}
function guardarEstado(estado) {
    fs.writeFileSync(ESTADO, JSON.stringify(estado, null, 2), 'utf8');
}

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
        const msg = body.error?.message || `HTTP ${res.status}`;
        // (#4) y (#17) son los límites de peticiones: no sirve de nada seguir
        // intentándolo, hay que esperar a que se abra la siguiente ventana.
        const limite = body.error?.code === 4 || body.error?.code === 17 || /request limit/i.test(msg);
        return { ok: false, error: msg, limite };
    }
    return { ok: true, title: body.title, image: Array.isArray(body.image) ? body.image[0]?.url : undefined };
}

(async () => {
    const args = process.argv.slice(2);
    const force = args.includes('--force');
    const filtro = args.find((a) => !a.startsWith('--'));

    const estado = leerEstado();
    const todos = cargarProductos().filter((p) => !filtro || p.id === filtro);
    const productos = todos.filter((p) => force || filtro || !estado.hechos[p.id]);

    if (!todos.length) {
        console.error(filtro ? `No existe ningún producto con id "${filtro}"` : 'No se encontró ningún producto');
        process.exit(1);
    }
    if (!productos.length) {
        console.log(`Los ${todos.length} productos ya están pre-cacheados. Usa --force para rehacerlos.`);
        return;
    }

    const yaHechos = todos.length - productos.length;
    console.log(`Pre-cacheando ${productos.length} producto(s) en Facebook`
        + (yaHechos ? ` (${yaHechos} ya hechos en tandas anteriores)` : '') + '...\n');

    let ok = 0;
    let cortadoPorLimite = false;
    const fallos = [];

    for (const producto of productos) {
        const url = `${BASE_URL}/html/producto.html?id=${encodeURIComponent(producto.id)}`;
        const r = await rascar(url);
        if (r.ok && r.title && r.image) {
            ok++;
            estado.hechos[producto.id] = new Date().toISOString();
            console.log(`  OK   ${producto.id} -> ${r.title}`);
        } else if (r.limite) {
            cortadoPorLimite = true;
            break;
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

    guardarEstado(estado);
    const hechos = Object.keys(estado.hechos).length;
    console.log(`\n${ok} en esta tanda. Total pre-cacheados: ${hechos}/${todos.length}.`);

    if (cortadoPorLimite) {
        console.log(`\nFacebook ha cortado por límite de peticiones. Quedan ${todos.length - hechos}.`);
        console.log('Vuelve a lanzar "npm run precache-fb" dentro de una hora y sigue donde lo dejó.');
    }
    if (fallos.length) {
        console.log('\nRevisar:');
        for (const f of fallos) console.log(`  - ${f.id}: ${f.error}`);
    }
    // exitCode y no process.exit(): con la pausa aún pendiente, salir de golpe hace
    // que libuv suelte un "Assertion failed" en Windows.
    if (fallos.length || cortadoPorLimite) process.exitCode = 1;
})();
