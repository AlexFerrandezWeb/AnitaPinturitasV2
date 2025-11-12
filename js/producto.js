// Funcionalidad de la página de producto
document.addEventListener('DOMContentLoaded', function() {
    // Obtener ID del producto de la URL
    const urlParams = new URLSearchParams(window.location.search);
    const productoId = urlParams.get('id');
    
    // Cargar datos del producto si hay ID
    if (productoId) {
        cargarProducto(productoId);
    }
    
    const decreaseBtn = document.querySelector('#decrease-qty');
    const increaseBtn = document.querySelector('#increase-qty');
    const quantityInput = document.querySelector('#cantidad');
    const addToCartBtn = document.querySelector('#add-to-cart');
    const contactWhatsappBtn = document.querySelector('#contact-whatsapp');

    // Función para añadir event listeners a las miniaturas
    function attachThumbnailListeners() {
        const thumbnails = document.querySelectorAll('.producto-details__thumbnail');
        const mainImage = document.querySelector('#producto-img-principal');
        
        thumbnails.forEach(thumbnail => {
            thumbnail.addEventListener('click', function() {
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
        decreaseBtn.addEventListener('click', function() {
            let currentValue = parseInt(quantityInput.value);
            if (currentValue > 1) {
                quantityInput.value = currentValue - 1;
            }
        });
    }

    if (increaseBtn && quantityInput) {
        increaseBtn.addEventListener('click', function() {
            let currentValue = parseInt(quantityInput.value);
            const maxValue = parseInt(quantityInput.getAttribute('max')) || 10;
            if (currentValue < maxValue) {
                quantityInput.value = currentValue + 1;
            }
        });
    }

    // Validar cantidad manualmente
    if (quantityInput) {
        quantityInput.addEventListener('change', function() {
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
        addToCartBtn.addEventListener('click', function() {
            // Obtener datos del producto (usar el ID del producto cargado o de la URL)
            const productId = window.currentProductId || productoId || 'default-' + Date.now();
            const productName = document.querySelector('.producto-details__name').textContent;
            const productPriceText = document.querySelector('.producto-details__price-current').textContent;
            const productPrice = parseFloat(productPriceText.replace('€', '').replace(',', '.')) || 0;
            const productImage = document.querySelector('#producto-img-principal') ? 
                                 document.querySelector('#producto-img-principal').src : 
                                 '../assets/productos/cuidadoPiel/productoPortada1.png';
            const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

            // Validar que todos los datos sean válidos
            if (!productId || productId === 'undefined') {
                alert('Error: No se ha podido identificar el producto. Por favor, recarga la página.');
                return;
            }
            
            if (!productName || productName.trim() === '' || productName === 'undefined') {
                alert('Error: No se ha podido obtener el nombre del producto. Por favor, recarga la página.');
                return;
            }
            
            // Usar la función global addToCart
            if (typeof window.addToCart === 'function') {
                // Ejecutar animación desde el botón antes de añadir al carrito
                if (typeof window.createFlyToCartAnimationFromButton === 'function') {
                    window.createFlyToCartAnimationFromButton(this, productImage, () => {
                        // Añadir al carrito después de la animación
                        window.addToCart(productId, productName, productPrice, productImage, quantity);
                        console.log('Producto añadido al carrito:', {productId, productName, productPrice, productImage, quantity});
                    });
                } else {
                    // Si no hay animación disponible, añadir directamente
                    window.addToCart(productId, productName, productPrice, productImage, quantity);
                    console.log('Producto añadido al carrito:', {productId, productName, productPrice, productImage, quantity});
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

    // Consultar por WhatsApp
    if (contactWhatsappBtn) {
        contactWhatsappBtn.addEventListener('click', function() {
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
                    : [producto.imagen, '../assets/frase1.jpg', '../assets/frase2.jpg'];
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
                
                // Trackear ViewContent (ver contenido del producto)
                if (typeof window.trackViewContent === 'function') {
                    window.trackViewContent(producto.id, producto.nombre, producto.precio);
                }
                
                // Actualizar las miniaturas (imágenes del producto + frases inspiracionales)
                // const thumbnailsContainer = document.querySelector('.producto-details__thumbnails');
                // if (thumbnailsContainer) {
                //     thumbnailsContainer.innerHTML = `
                //         <img src="${producto.imagen}" alt="Vista 1" class="producto-details__thumbnail active" data-main-img="${producto.imagen}">
                //         <img src="../assets/frase1.jpg" alt="Frase inspiracional 1" class="producto-details__thumbnail" data-main-img="../assets/frase1.jpg">
                //         <img src="../assets/frase2.jpg" alt="Frase inspiracional 2" class="producto-details__thumbnail" data-main-img="../assets/frase2.jpg">
                //     `;
                    // Re-añadir listeners a las nuevas miniaturas
                    // attachThumbnailListeners();
                // }
            })
            .catch(error => {
                console.error('Error al cargar el producto:', error);
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
                                resolve({ producto: productoEncontrado, origen: dataFiles[index] });
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

