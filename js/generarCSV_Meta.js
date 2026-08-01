// Script para generar CSV para Meta Pixel desde el JSON enriquecido
const fs = require('fs');
const path = require('path');

// Configuración
const JSON_FILES = [
    path.join(__dirname, '..', 'data', 'cuidadoPiel.json'),
    path.join(__dirname, '..', 'data', 'cuidadoCapilar.json')
];
const CSV_FILE = path.join(__dirname, '..', 'product-feed.csv');
const CURRENCY = 'EUR';
// Meta exige una cantidad >= 1 para que el producto sea comprable en la tienda.
// No llevamos control de stock por unidades, así que declaramos una cantidad
// fija; la disponibilidad real se gestiona con el campo `availability`.
const CANTIDAD_POR_DEFECTO = 100;

// Función para escapar valores CSV (manejar comillas, comas, saltos de línea)
function escapeCSV(value) {
    if (value === null || value === undefined) {
        return '';
    }
    
    const stringValue = String(value);
    
    // Si contiene comillas, comas o saltos de línea, envolver en comillas y escapar comillas dobles
    if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
}

// Función para formatear precio con moneda
function formatPrice(precio) {
    if (typeof precio === 'string') {
        precio = parseFloat(precio);
    }
    if (isNaN(precio)) {
        return '';
    }
    return `${precio.toFixed(2)} ${CURRENCY}`;
}

// Función principal
function generateCSV() {
    try {
        console.log('📖 Leyendo archivos JSON...');

        const datasets = JSON_FILES.map(filePath => {
            try {
                const jsonContent = fs.readFileSync(filePath, 'utf8');
                const data = JSON.parse(jsonContent);
                return { data, origen: path.basename(filePath) };
            } catch (error) {
                console.error(`❌ Error al leer ${filePath}:`, error.message);
                return null;
            }
        }).filter(Boolean);

        if (!datasets.length) {
            throw new Error('No se pudieron cargar los archivos JSON de productos.');
        }

        // Columnas del CSV según requerimientos de Meta
        const headers = [
            'id',
            'title',
            'description',
            'price',
            'image_link',
            'link',
            'availability',
            'condition',
            'brand',
            'product_type',
            'quantity_to_sell_on_facebook'
        ];

        // Array para almacenar las filas del CSV
        const rows = [headers.join(',')];

        let totalProducts = 0;
        let processedProducts = 0;

        datasets.forEach(({ data, origen }) => {
            if (data.categorias && Array.isArray(data.categorias)) {
                data.categorias.forEach(categoria => {
                    if (categoria.productos && Array.isArray(categoria.productos)) {
                        categoria.productos.forEach(producto => {
                            totalProducts++;

                            if (!producto.id || !producto.nombre) {
                                console.warn(`⚠️  Producto sin ID o nombre, saltando: ${JSON.stringify(producto)}`);
                                return;
                            }

                            const origenDefault = origen.includes('Capilar') ? 'Cuidado Capilar' : 'Cuidado de la Piel';
                            const productTypeFallback = producto.product_type || categoria?.nombre || origenDefault;

                            const row = [
                                escapeCSV(producto.id),
                                escapeCSV(producto.nombre),
                                escapeCSV(producto.descripcion || ''),
                                escapeCSV(formatPrice(producto.precio)),
                                escapeCSV(producto.image_link || producto.imagen || ''),
                                escapeCSV(producto.link || ''),
                                escapeCSV(producto.availability || 'in stock'),
                                escapeCSV(producto.condition || 'new'),
                                escapeCSV(producto.brand || 'Anita Pinturitas'),
                                escapeCSV(productTypeFallback),
                                escapeCSV(producto.cantidad ?? CANTIDAD_POR_DEFECTO)
                            ];

                            rows.push(row.join(','));
                            processedProducts++;
                        });
                    }
                });
            }
        });

        // Escribir el CSV
        console.log('💾 Generando archivo CSV...');
        const csvContent = rows.join('\n');
        fs.writeFileSync(CSV_FILE, csvContent, 'utf8');

        console.log('\n✅ CSV generado exitosamente:');
        console.log(`   - Archivo: ${CSV_FILE}`);
        console.log(`   - Total de productos en JSON: ${totalProducts}`);
        console.log(`   - Productos procesados: ${processedProducts}`);
        console.log(`   - Columnas: ${headers.length}`);
        console.log('\n📋 Columnas del CSV:');
        headers.forEach((header, index) => {
            console.log(`   ${index + 1}. ${header}`);
        });
        console.log('\n📝 Notas:');
        console.log('   - El archivo está listo para subir a Meta Pixel');
        console.log('   - Formato: CSV UTF-8');
        console.log('   - Precios incluyen moneda: EUR');
        console.log('   - Caracteres especiales están escapados correctamente');

    } catch (error) {
        console.error('❌ Error al generar el CSV:', error);
        process.exit(1);
    }
}

// Ejecutar el script
generateCSV();

