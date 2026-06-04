// Convierte todas las imágenes de assets/ a WebP y las guarda junto a los originales.
// Ejecutar una sola vez: node scripts/compress-images.js
// Los archivos originales NO se borran (fallback para navegadores antiguos).

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const QUALITY_WEBP = 82;
const QUALITY_JPEG = 82;
const SKIP_ALREADY_WEBP = true;

let converted = 0;
let skipped = 0;
let errors = 0;
let savedBytes = 0;

function getAllImages(dir) {
    const results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            results.push(...getAllImages(full));
        } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

async function processImage(filePath) {
    const webpPath = filePath.replace(/\.(jpe?g|png)$/i, '.webp');

    if (SKIP_ALREADY_WEBP && fs.existsSync(webpPath)) {
        skipped++;
        return;
    }

    try {
        const originalSize = fs.statSync(filePath).size;
        await sharp(filePath).webp({ quality: QUALITY_WEBP }).toFile(webpPath);
        const newSize = fs.statSync(webpPath).size;
        const saved = originalSize - newSize;
        savedBytes += saved;
        const pct = Math.round((saved / originalSize) * 100);
        console.log(`✅ ${path.relative(ASSETS_DIR, filePath)} → .webp (${(originalSize/1024).toFixed(0)}KB → ${(newSize/1024).toFixed(0)}KB, -${pct}%)`);
        converted++;
    } catch (err) {
        console.error(`❌ Error: ${filePath}: ${err.message}`);
        errors++;
    }
}

async function main() {
    console.log('🖼️  Comprimiendo imágenes a WebP...\n');
    const images = getAllImages(ASSETS_DIR);
    console.log(`📂 ${images.length} imágenes encontradas\n`);

    for (const img of images) {
        await processImage(img);
    }

    console.log(`\n🎉 Completado:`);
    console.log(`   ✅ Convertidas: ${converted}`);
    console.log(`   ⏭️  Saltadas (ya existían): ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);
    console.log(`   💾 Espacio ahorrado: ${(savedBytes / 1024 / 1024).toFixed(1)} MB`);
}

main();
