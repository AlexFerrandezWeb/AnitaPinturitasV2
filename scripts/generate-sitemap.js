// Genera sitemap.xml con las páginas estáticas + todas las fichas de producto
// Uso: node scripts/generate-sitemap.js
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://anitapinturitas.es';
const ROOT = path.join(__dirname, '..');
const today = new Date().toISOString().split('T')[0];

const staticUrls = [
    { loc: `${BASE_URL}/`, changefreq: 'weekly', priority: '1.0' },
    { loc: `${BASE_URL}/html/productos.html`, changefreq: 'weekly', priority: '0.9' },
    { loc: `${BASE_URL}/html/cuidadoPiel.html`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/html/cuidadoCapilar.html`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${BASE_URL}/html/avisoLegal.html`, changefreq: 'monthly', priority: '0.3' },
    { loc: `${BASE_URL}/html/politicaPrivacidad.html`, changefreq: 'monthly', priority: '0.3' },
    { loc: `${BASE_URL}/html/politicaCookies.html`, changefreq: 'monthly', priority: '0.3' },
    { loc: `${BASE_URL}/html/politicaDevoluciones.html`, changefreq: 'monthly', priority: '0.3' },
];

const productUrls = [];
const seenIds = new Set();
for (const file of ['cuidadoPiel.json', 'cuidadoCapilar.json']) {
    const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', file), 'utf8'));
    for (const categoria of data.categorias || []) {
        for (const producto of categoria.productos || []) {
            if (!producto.id || seenIds.has(producto.id)) continue;
            seenIds.add(producto.id);
            productUrls.push({
                loc: `${BASE_URL}/html/producto.html?id=${encodeURIComponent(producto.id)}`,
                changefreq: 'monthly',
                priority: '0.7',
            });
        }
    }
}

const escapeXml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const entries = [...staticUrls, ...productUrls].map((u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;

fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
console.log(`sitemap.xml generado: ${staticUrls.length} páginas estáticas + ${productUrls.length} productos`);
