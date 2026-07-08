// Funcionalidad de la página de producto
document.addEventListener('DOMContentLoaded', function () {
    // Obtener ID del producto de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');

    // Obtener elemento contenedor para controlar la visibilidad (evitar parpadeo)
    const productContainer = document.querySelector('.producto-details');
    if (productContainer) {
        productContainer.style.opacity = '0';
        productContainer.style.transition = 'opacity 0.3s ease';
    }

    // Cargar datos del producto si hay ID
    if (productoId) {
        cargarProducto(productoId);
    } else {
        // Si no hay ID, mostrar el producto por defecto
        if (productContainer) productContainer.style.opacity = '1';
    }

    const decreaseBtn = document.querySelector('#decrease-qty');
    const increaseBtn = document.querySelector('#increase-qty');
    const quantityInput = document.querySelector('#cantidad');
    const addToCartBtn = document.querySelector('#add-to-cart');
    const buyNowBtn = document.querySelector('#buy-now');
    const contactWhatsappBtn = document.querySelector('#contact-whatsapp');

    function recogerDatosProducto() {
        const productId = window.currentProductId || productoId || 'default-' + Date.now();
        let productName = document.querySelector('.producto-details__name').textContent;
        let finalProductId = productId;

        const colorSelector = document.getElementById('color-selector');
        if (colorSelector && colorSelector.value) {
            productName = `${productName} (${colorSelector.value})`;
            finalProductId = `${productId}-${colorSelector.value}`;
        }

        const productPriceText = document.querySelector('.producto-details__price-current').textContent;
        const productPrice = parseFloat(productPriceText.replace('€', '').replace(',', '.')) || 0;

        const firstThumbnail = document.querySelector('.producto-details__thumbnail');
        let productImage;
        if (firstThumbnail && firstThumbnail.getAttribute('data-main-img')) {
            productImage = firstThumbnail.getAttribute('data-main-img');
        } else if (window.currentProductData && window.currentProductData.galeria && window.currentProductData.galeria.length > 0) {
            productImage = window.currentProductData.galeria[0];
        } else if (window.currentProductData && window.currentProductData.imagen) {
            productImage = window.currentProductData.imagen;
        } else {
            const mainImgElement = document.querySelector('#producto-img-principal');
            productImage = mainImgElement ? mainImgElement.src : '../assets/productos/cuidadoPiel/productoPortada1.png';
        }

        if (productId === 'cepillo-detangling-antiestatico-para-desenredar-termix-professional' && colorSelector && colorSelector.value) {
            productImage = `../assets/productos/cuidadoCapilar/cepillo-detangling-antiestatico-termix-professional${colorSelector.value}.jpg`;
        }

        const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
        return { finalProductId, productName, productPrice, productImage, quantity };
    }

    // Función para añadir event listeners a las miniaturas
    function attachThumbnailListeners() {
        const thumbnails = document.querySelectorAll('.producto-details__thumbnail');
        const mainImage = document.querySelector('#producto-img-principal');

        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function () {
                // Remover clase active de todas las miniaturas
                thumbnails.forEach(thumb => thumb.classList.remove('active'));

                // Añadir clase active a la miniatura clicada
                this.classList.add('active');

                // Cambiar imagen principal
                const newImageSrc = this.getAttribute('data-main-img');
                if (mainImage && newImageSrc) {
                    mainImage.src = newImageSrc;
                }
            });
        });
    }

    // Añadir listeners inicialmente
    attachThumbnailListeners();

    // Controlar cantidad
    if (decreaseBtn && quantityInput) {
        decreaseBtn.addEventListener('click', function () {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
    }

    if (increaseBtn && quantityInput) {
        increaseBtn.addEventListener('click', function () {
            let currentValue = parseInt(quantityInput.value);
            const maxValue = parseInt(quantityInput.getAttribute('max')) || 10;
            if (currentValue < maxValue) {
                quantityInput.value = currentValue + 1;
            }
        });
    }

    // Validar cantidad manualmente
    if (quantityInput) {
        quantityInput.addEventListener('change', function () {
            let value = parseInt(this.value);
            const minValue = parseInt(this.getAttribute('min')) || 1;
            const maxValue = parseInt(this.getAttribute('max')) || 10;

            if (isNaN(value) || value < minValue) {
                this.value = minValue;
            } else if (value > maxValue) {
                this.value = maxValue;
            }
        });
    }

    // Añadir al carrito
    if (addToCartBtn) {
        addToCartBtn.addEventListener('click', function () {
            const { finalProductId, productName, productPrice, productImage, quantity } = recogerDatosProducto();

            if (!finalProductId || finalProductId === 'undefined') {
                alert('Error: No se ha podido identificar el producto. Por favor, recarga la página.');
                return;
            }
            if (!productName || productName.trim() === '' || productName === 'undefined') {
                alert('Error: No se ha podido obtener el nombre del producto. Por favor, recarga la página.');
                return;
            }

            if (typeof window.addToCart === 'function') {
                if (typeof window.createFlyToCartAnimationFromButton === 'function') {
                    window.createFlyToCartAnimationFromButton(this, productImage, () => {
                        window.addToCart(finalProductId, productName, productPrice, productImage, quantity);
                    });
                } else {
                    window.addToCart(finalProductId, productName, productPrice, productImage, quantity);
                }
            } else {
                console.error('La función addToCart no está disponible');
            }

            // Feedback visual en el botón
            const originalText = this.textContent;
            this.textContent = '✓ Añadido al carrito';
            this.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';

            setTimeout(() => {
                this.textContent = originalText;
                this.style.background = '';
            }, 2000);
        });
    }

    // Comprar ahora → añadir al carrito y lanzar checkout directamente
    if (buyNowBtn) {
        buyNowBtn.addEventListener('click', function () {
            const { finalProductId, productName, productPrice, productImage, quantity } = recogerDatosProducto();

            if (!finalProductId || finalProductId === 'undefined') {
                alert('Error: No se ha podido identificar el producto. Por favor, recarga la página.');
                return;
            }

            if (typeof window.addToCart === 'function') {
                window.addToCart(finalProductId, productName, productPrice, productImage, quantity);
            }

            const originalText = this.textContent;
            this.textContent = 'Procesando...';
            this.disabled = true;

            if (typeof window.proceedToCheckout === 'function') {
                window.proceedToCheckout();
            }

            // Restaurar el botón por si el checkout falla (red, backend caído, etc.)
            setTimeout(() => {
                this.textContent = originalText;
                this.disabled = false;
            }, 5000);
        });
    }

    // Consultar por WhatsApp
    if (contactWhatsappBtn) {
        contactWhatsappBtn.addEventListener('click', function () {
            const productName = document.querySelector('.producto-details__name').textContent;
            const quantity = quantityInput ? parseInt(quantityInput.value) : 1;
            const message = `Hola Anita, me interesa saber más sobre: ${productName} (Cantidad: ${quantity})`;
            const whatsappUrl = `https://wa.me/34640557787?text=${encodeURIComponent(message)}`;

            // Trackear Contact en Meta Pixel
            if (typeof window.trackContact === 'function') {
                window.trackContact('whatsapp');
            }

            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        });
    }

    // Función para actualizar contador del carrito
    function updateCartCount() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = document.querySelector('.nav__cart-count');

        if (cartCount) {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartCount.textContent = totalItems;
            cartCount.setAttribute('aria-label', `${totalItems} productos en carrito`);
        }
    }

    // Actualizar contador al cargar la página
    updateCartCount();

    // Función para cargar datos del producto desde el JSON
    function cargarProducto(id) {
        obtenerDatosProducto(id)
            .then(result => {
                if (!result || !result.producto) {
                    console.error('Producto no encontrado');
                    // Mostrar aunque falle para no dejar la página en blanco
                    if (productContainer) productContainer.style.opacity = '1';
                    return;
                }

                const { producto } = result;

                // Actualizar los elementos de la página
                document.querySelector('.producto-details__name').textContent = producto.nombre;
                document.querySelector('.producto-details__price-current').textContent = producto.precio.toFixed(2) + '€';
                document.querySelector('.producto-details__description p').textContent = producto.descripcion;

                const categoryElement = document.querySelector('.producto-details__category');
                if (categoryElement) {
                    const defaultCategory = result.origen && result.origen.includes('cuidadoCapilar')
                        ? 'Cuidado Capilar'
                        : 'Cuidado de la Piel';
                    categoryElement.textContent = defaultCategory;
                }
                renderIngredientes(producto.ingredientes);

                // Guardar ID del producto para el carrito
                window.currentProductId = producto.id;
                window.currentProductData = producto;

                // Actualizar imagen principal y galería
                const mainImg = document.querySelector('#producto-img-principal');
                const galeria = Array.isArray(producto.galeria) && producto.galeria.length > 0
                    ? producto.galeria
                    : [producto.imagen];
                const thumbnailsContainer = document.querySelector('.producto-details__thumbnails');

                if (mainImg) {
                    mainImg.src = galeria[0];
                    mainImg.alt = producto.nombre;
                }

                if (thumbnailsContainer) {
                    thumbnailsContainer.innerHTML = galeria.map((imagenSrc, index) => {
                        const isActive = index === 0 ? 'active' : '';
                        const altText = index === 0 ? 'Vista 1' : `Vista ${index + 1}`;
                        return `<img src="${imagenSrc}" alt="${altText}" class="producto-details__thumbnail ${isActive}" data-main-img="${imagenSrc}">`;
                    }).join('');
                    attachThumbnailListeners();
                }

                // Renderizar selector de colores si existen
                const quantitySection = document.querySelector('.producto-details__quantity');
                const existingColorSelector = document.querySelector('.producto-details__colors');
                if (existingColorSelector) {
                    existingColorSelector.remove();
                }

                if (producto.colores && Array.isArray(producto.colores) && producto.colores.length > 0) {
                    const colorContainer = document.createElement('div');
                    colorContainer.className = 'producto-details__colors';
                    colorContainer.style.marginBottom = '20px';
                    colorContainer.innerHTML = `
                        <label for="color-selector" style="display: block; margin-bottom: 10px; font-family: 'Montserrat', sans-serif; font-size: 1rem; color: #333;">Color:</label>
                        <select id="color-selector" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-family: 'Montserrat', sans-serif; font-size: 1rem; color: #333; background-color: #fff;">
                            ${producto.colores.map(color => `<option value="${color}">${color}</option>`).join('')}
                        </select>
                    `;

                    if (quantitySection) {
                        quantitySection.parentNode.insertBefore(colorContainer, quantitySection);
                    }

                    // Lógica para cambiar imagen según color
                    const selector = document.getElementById('color-selector');
                    if (selector) {
                        selector.addEventListener('change', function () {
                            const selectedColor = this.value;
                            const mainImg = document.querySelector('#producto-img-principal');

                            // Construir ruta de imagen basada en el color
                            // Patrón: nombre-base + Color + .jpg
                            // Ejemplo: cepillo-detangling-antiestatico-termix-professionalAzul.jpg

                            // Obtener nombre base de la imagen original o hardcodearla si es este producto específico
                            // Dado que es un requerimiento específico para este producto, podemos asumir la ruta base si estamos en este bloque
                            if (producto.id === 'cepillo-detangling-antiestatico-para-desenredar-termix-professional') {
                                const newImageSrc = `/assets/productos/cuidadoCapilar/cepillo-detangling-antiestatico-termix-professional${selectedColor}.jpg`;

                                if (mainImg) {
                                    mainImg.src = newImageSrc;
                                }
                            }
                        });

                        // Disparar cambio inicial si hay valor seleccionado
                        if (selector.value) {
                            selector.dispatchEvent(new Event('change'));
                        }
                    }
                }

                // Una vez cargado todo, mostrar el contenedor
                if (productContainer) {
                    productContainer.style.opacity = '1';
                }

                renderRelacionados(result.categoria, producto.id);

                // Trackear ViewContent (ver contenido del producto)
                // Usar fbq directamente para asegurar que content_ids y content_type se envíen correctamente
                if (typeof window.fbq === 'function') {
                    // Obtener categoría del producto (product_type o categoría por defecto)
                    const productCategory = producto.product_type ||
                        (result.origen && result.origen.includes('cuidadoCapilar')
                            ? 'Cuidado Capilar'
                            : 'Cuidado de la Piel');

                    window.fbq('track', 'ViewContent', {
                        content_name: producto.nombre,
                        content_category: productCategory,
                        content_ids: [producto.id.toString()], // CLAVE: Envía el ID del catálogo
                        content_type: 'product', // CLAVE: Indica que es un producto
                        value: producto.precio,
                        currency: 'EUR'
                    });
                    console.log('✅ Meta ViewContent trackeado con content_ids:', producto.id);

                    // También llamar a trackViewContent para mantener compatibilidad con CAPI
                    if (typeof window.trackViewContent === 'function') {
                        window.trackViewContent(producto.id, producto.nombre, producto.precio, productCategory);
                    }
                }
            })
            .catch(error => {
                console.error('Error al cargar el producto:', error);
                // Asegurar que se muestra el contenido si hay error, para no bloquear
                if (productContainer) productContainer.style.opacity = '1';
            });
    }

    function obtenerDatosProducto(id) {
        const dataFiles = ['../data/cuidadoPiel.json', '../data/cuidadoCapilar.json'];

        return new Promise((resolve, reject) => {
            const intentarArchivo = (index) => {
                if (index >= dataFiles.length) {
                    resolve(null);
                    return;
                }

                fetch(dataFiles[index])
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`Error al cargar ${dataFiles[index]}: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (!data || !Array.isArray(data.categorias)) {
                            throw new Error(`Formato de datos inválido en ${dataFiles[index]}`);
                        }

                        for (const categoria of data.categorias) {
                            const productoEncontrado = (categoria.productos || []).find(p => p.id === id);
                            if (productoEncontrado) {
                                resolve({ producto: productoEncontrado, categoria: categoria, origen: dataFiles[index] });
                                return;
                            }
                        }

                        // No encontrado en este archivo, intentar con el siguiente
                        intentarArchivo(index + 1);
                    })
                    .catch(error => {
                        console.error(error);
                        intentarArchivo(index + 1);
                    });
            };

            intentarArchivo(0);
        });
    }

    // Botón compartir producto
    const shareBtn = document.querySelector('#share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async function () {
            const productName = document.querySelector('.producto-details__name')?.textContent || 'Producto';
            const url = window.location.href;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `${productName} - Anita Pinturitas`,
                        url
                    });
                } catch (_) { /* usuario canceló */ }
            } else {
                try {
                    await navigator.clipboard.writeText(url);
                    this.classList.add('producto-share-btn--copied');
                    const originalLabel = this.getAttribute('aria-label');
                    this.setAttribute('aria-label', '¡Enlace copiado!');
                    setTimeout(() => {
                        this.classList.remove('producto-share-btn--copied');
                        this.setAttribute('aria-label', originalLabel);
                    }, 2000);
                } catch (_) { /* sin soporte clipboard */ }
            }
        });
    }

    // Renderizar productos de la misma categoría para cross-sell
    function renderRelacionados(categoria, currentId) {
        const section = document.getElementById('producto-related');
        const grid = document.getElementById('producto-related-grid');
        if (!section || !grid || !categoria || !Array.isArray(categoria.productos)) return;

        const candidatos = categoria.productos.filter(p => p.id !== currentId && p.imagen && p.precio);
        if (candidatos.length === 0) return;

        // Mezclar para que no salgan siempre los mismos
        for (let i = candidatos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
        }

        const seleccion = candidatos.slice(0, 4);
        grid.innerHTML = seleccion.map(p => {
            const nombreSeguro = String(p.nombre || '').replace(/</g, '&lt;');
            return `
            <a href="producto.html?id=${encodeURIComponent(p.id)}" class="producto-related-card">
                <img src="${p.imagen}" alt="${nombreSeguro}" class="producto-related-card__img" loading="lazy">
                <div class="producto-related-card__body">
                    <span class="producto-related-card__name">${nombreSeguro}</span>
                    <span class="producto-related-card__price">${p.precio.toFixed(2)} €</span>
                </div>
            </a>`;
        }).join('');
        section.hidden = false;
    }

    // Función para renderizar ingredientes dinamicamente
    function renderIngredientes(ingredientes) {
        const ingredientsSection = document.querySelector('.producto-details__ingredients');
        const ingredientsContent = document.querySelector('.producto-details__ingredients-content');

        if (!ingredientsSection || !ingredientsContent) return;

        const items = [];

        if (Array.isArray(ingredientes)) {
            ingredientes.forEach(ing => {
                if (typeof ing === 'string') {
                    const cleaned = ing.trim();
                    if (cleaned) items.push(cleaned);
                }
            });
        } else if (typeof ingredientes === 'string') {
            const normalized = ingredientes.trim();
            if (normalized) {
                const separator = normalized.includes('\n') ? /\n+/ : /[,;]+/;
                const parts = normalized.split(separator).map(part => part.trim()).filter(Boolean);
                if (parts.length > 1) {
                    items.push(...parts);
                } else {
                    ingredientsContent.textContent = normalized;
                    ingredientsSection.style.display = '';
                    return;
                }
            }
        }

        if (items.length > 0) {
            ingredientsContent.innerHTML = `<ul class="producto-details__ingredients-list">${items.map(item => `<li>${item}</li>`).join('')}</ul>`;
            ingredientsSection.style.display = '';
        } else {
            ingredientsContent.innerHTML = '';
            ingredientsSection.style.display = 'none';
        }
    }
});
