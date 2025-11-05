// Script para enriquecer el JSON de productos con campos necesarios para Meta
const fs = require('fs');
const path = require('path');

// Configuración
const DOMAIN = 'https://anitapinturitas.es';
const JSON_FILE = path.join(__dirname, '..', 'data', 'cuidadoPiel.json');
const BACKUP_FILE = path.join(__dirname, '..', 'data', 'cuidadoPiel.json.backup');

// Función para generar slug/URL amigable desde el nombre del producto
function generateSlug(nombre) {
    return nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
        .replace(/[^a-z0-9\s-]/g, '') // Eliminar caracteres especiales
        .replace(/\s+/g, '-') // Reemplazar espacios con guiones
        .replace(/-+/g, '-') // Eliminar guiones múltiples
        .trim();
}

// Función para generar URL del producto
function generateProductLink(productId, productName) {
    // Usar el ID del producto en la URL (más confiable que el slug)
    return `${DOMAIN}/html/producto.html?id=${productId}`;
}

// Función para convertir imagen relativa a URL absoluta
function convertImageToAbsolute(imagePath) {
    if (!imagePath) return null;
    // Si ya es una URL absoluta, devolverla tal cual
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    // Si es una ruta relativa, convertirla a absoluta
    if (imagePath.startsWith('/')) {
        return `${DOMAIN}${imagePath}`;
    }
    // Si no empieza con /, añadirla
    return `${DOMAIN}/${imagePath}`;
}

// Función para obtener el tipo de producto basado en la categoría
function getProductType(categoria) {
    // Mapeo de categorías a tipos de producto
    const categoryMap = {
        'alta_cosmética': 'Alta Cosmética',
        'alta_cosmetica': 'Alta Cosmética', // Por si acaso hay variaciones
        'facial': 'Línea Facial',
        'corporal': 'Línea Corporal',
        'capilar': 'Línea Capilar',
        'maquillaje': 'Maquillaje',
        'perfumeria': 'Perfumería',
        'accesorios': 'Accesorios'
    };
    
    return categoryMap[categoria.id] || categoria.titulo || categoria.nombre || 'Cuidado de la Piel';
}

// Función principal
function enrichProducts() {
    try {
        console.log('📖 Leyendo archivo JSON...');
        const jsonContent = fs.readFileSync(JSON_FILE, 'utf8');
        const data = JSON.parse(jsonContent);

        // Crear backup
        console.log('💾 Creando backup...');
        fs.writeFileSync(BACKUP_FILE, jsonContent, 'utf8');
        console.log(`✅ Backup creado en: ${BACKUP_FILE}`);

        let totalProducts = 0;
        let enrichedProducts = 0;

        // Procesar cada categoría
        if (data.categorias && Array.isArray(data.categorias)) {
            data.categorias.forEach(categoria => {
                if (categoria.productos && Array.isArray(categoria.productos)) {
                    categoria.productos.forEach(producto => {
                        totalProducts++;

                        // Añadir campos necesarios para Meta
                        producto.image_link = convertImageToAbsolute(producto.imagen);
                        producto.link = generateProductLink(producto.id, producto.nombre);
                        producto.availability = 'in stock';
                        producto.condition = 'new';
                        producto.brand = 'Anita Pinturitas';
                        producto.product_type = getProductType(categoria);
                        
                        // Asegurar que el precio esté en formato numérico
                        if (typeof producto.precio === 'string') {
                            producto.precio = parseFloat(producto.precio);
                        }

                        enrichedProducts++;
                    });
                }
            });
        }

        // Guardar el JSON enriquecido
        console.log('💾 Guardando JSON enriquecido...');
        fs.writeFileSync(JSON_FILE, JSON.stringify(data, null, 4), 'utf8');

        console.log('\n✅ Proceso completado:');
        console.log(`   - Total de productos procesados: ${totalProducts}`);
        console.log(`   - Productos enriquecidos: ${enrichedProducts}`);
        console.log(`   - Backup guardado en: ${BACKUP_FILE}`);
        console.log('\n📋 Campos añadidos a cada producto:');
        console.log('   - image_link: URL absoluta de la imagen');
        console.log('   - link: URL completa del producto');
        console.log('   - availability: "in stock"');
        console.log('   - condition: "new"');
        console.log('   - brand: "Anita Pinturitas"');
        console.log('   - product_type: Tipo basado en categoría');

    } catch (error) {
        console.error('❌ Error al procesar el archivo:', error);
        process.exit(1);
    }
}

// Ejecutar el script
enrichProducts();

