// Genera una imagen dedicada para las vistas previas al compartir (Facebook,
// WhatsApp, Instagram) en assets/og/<id-producto>.jpg
//
// Por qué: Facebook pinta la foto de la tarjeta al ancho completo de la publicación
// (~2200 px reales en un móvil moderno). Las fotos de producto son de 600-850 px, así
// que las escala 2-3 veces y las recomprime: se ven borrosas. Estas versiones salen a
// 1200x1200 sobre lienzo blanco, que es lo que recomienda Meta, y con una compresión
// mucho más suave que la del sitio (estas imágenes solo las descargan los rastreadores,
// no afectan al rendimiento de la web).
//
// Uso: node scripts/generate-og-images.js
//      node scripts/generate-og-images.js --force   (regenera las que ya existen)
//
// Después de ejecutarlo hay que refrescar la caché de Facebook:
//      npm run precache-fb
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'assets', 'og');
const LADO = 1200;       // recomendación de Meta para og:image
const CALIDAD = 88;      // suave: son ficheros que solo ve el rastreador
const force = process.argv.includes('--force');

function cargarProductos() {
    const productos = [];
    const vistos = new Set();
    for (const file of ['cuidadoPiel.json', 'cuidadoCapilar.json']) {
        const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
        for (const categoria of data.categorias || []) {
            for (const producto of categoria.productos || []) {
                if (!producto.id || vistos.has(producto.id) || !producto.imagen) continue;
                vistos.add(producto.id);
                productos.push(producto);
            }
        }
    }
    return productos;
}

(async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const productos = cargarProductos();

    let generadas = 0;
    let saltadas = 0;
    const sinResolucion = [];   // fuentes por debajo de 1200 px: hay que ampliarlas
    const errores = [];

    for (const producto of productos) {
        const origen = path.join(ROOT, producto.imagen.replace(/^\//, ''));
        const destino = path.join(OUT_DIR, `${producto.id}.jpg`);

        if (!force && fs.existsSync(destino)) { saltadas++; continue; }

        try {
            const meta = await sharp(origen).metadata();
            const ampliada = Math.max(meta.width, meta.height) < LADO;
            if (ampliada) {
                sinResolucion.push({ id: producto.id, w: meta.width, h: meta.height });
            }

            let pipeline = sharp(origen)
                // "contain" y no "cover": las fotos verticales no se recortan, se
                // rellena con blanco, que es el fondo de las fotos de producto.
                .resize(LADO, LADO, {
                    fit: 'contain',
                    background: { r: 255, g: 255, b: 255 },
                    kernel: sharp.kernel.lanczos3,
                })
                .flatten({ background: { r: 255, g: 255, b: 255 } });  // quita transparencias

            // Máscara de enfoque solo en las que hemos tenido que ampliar: al
            // interpolar píxeles el texto pequeño de los envases queda blando y esto
            // le devuelve buena parte de la definición. En las fotos que ya venían a
            // 1200 px o más sería sobreenfocar.
            if (ampliada) {
                pipeline = pipeline.sharpen({ sigma: 1.2, m1: 0.6, m2: 2.5 });
            }

            await pipeline.jpeg({ quality: CALIDAD, mozjpeg: true }).toFile(destino);
            generadas++;
        } catch (err) {
            errores.push({ id: producto.id, error: err.message });
        }
    }

    console.log(`Imágenes de vista previa: ${generadas} generadas, ${saltadas} ya existían, ${errores.length} con error`);

    if (sinResolucion.length) {
        console.log(`\n${sinResolucion.length} productos tienen la foto original por debajo de ${LADO} px.`);
        console.log('Se han ampliado, pero saldrán mejor el día que se sustituya la foto por una de más resolución:');
        for (const s of sinResolucion.slice(0, 15)) console.log(`  - ${s.id} (${s.w}x${s.h})`);
        if (sinResolucion.length > 15) console.log(`  ... y ${sinResolucion.length - 15} más`);
    }

    if (errores.length) {
        console.log('\nErrores:');
        for (const e of errores) console.log(`  - ${e.id}: ${e.error}`);
        process.exit(1);
    }
})();
