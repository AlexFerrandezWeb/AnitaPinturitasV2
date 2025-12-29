// Cargar y mostrar productos de cuidado de la piel
document.addEventListener('DOMContentLoaded', function () {
    const productosContainer = document.getElementById('productos-container');

    // Cargar datos del JSON
    fetch('../data/cuidadoPiel.json')
        .then(response => response.json())
        .then(data => {
            mostrarProductos(data.categorias);
        })
        .catch(error => {
            console.error('Error al cargar los productos:', error);
            productosContainer.innerHTML = '<p>Error al cargar los productos. Por favor, intenta de nuevo más tarde.</p>';
        });

    function mostrarProductos(categorias) {
        let html = '';

        categorias.forEach(categoria => {
            html += `
                <div class="categoria-section">
                    <h2 class="categoria-titulo">${categoria.titulo}</h2>
                    <div class="productos-grid">
            `;

            categoria.productos.forEach(producto => {
                // Generar alt accesible y SEO-friendly a partir de la descripción si es útil
                let altTextoBase = `${producto.nombre} de la categoría ${categoria.titulo} - Anita Pinturitas`;
                let altDesdeDescripcion = altTextoBase;
                if (producto.descripcion && producto.descripcion.trim().length > 0) {
                    const primeraFrase = producto.descripcion.split('.')?.[0]?.trim() || '';
                    if (primeraFrase.length >= 20 && primeraFrase.length <= 140) {
                        altDesdeDescripcion = primeraFrase;
                    }
                }
                const altSeguro = (altDesdeDescripcion || altTextoBase).replace(/"/g, '&quot;');

                html += `
                    <div class="producto-card" onclick="verProducto('${producto.id}')">
                        <div class="producto-imagen">
                            <img src="${producto.imagen}" alt="${altSeguro}" loading="lazy">
                        </div>
                        <div class="producto-info">
                            <h3 class="producto-nombre">${producto.nombre}</h3>
                            <p class="producto-precio">${producto.precio.toFixed(2)} €</p>
                            <p class="producto-precio-iva">+IVA incluido</p>
                            ${['US-21109-00', 'prod_SdTAGVPaPAE5Wu0', 'prod_SdTAGVPaPAE5Wu01', 'prod_SdTAGVPaPAE5Wu02'].includes(producto.id) ? '<span class="producto-etiqueta producto-etiqueta--nuevo">Nuevo</span>' : ''}
                            <div class="producto-botones" onclick="event.stopPropagation()">
                                <button class="btn-ver" onclick="event.stopPropagation(); verProducto('${producto.id}')">
                                    Ver
                                </button>
                                <button class="btn-comprar" onclick="event.stopPropagation(); addToCartWithAnimation(this, '${producto.id}', '${producto.nombre}', ${producto.precio}, '${producto.imagen}')">
                                    Añadir al carrito
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        productosContainer.innerHTML = html;
    }

    // Función para ver detalles del producto
    window.verProducto = function (productoId) {
        // Redirigir a la página de producto con el ID como parámetro
        window.location.href = `producto.html?id=${productoId}`;
    };

    // Función para añadir al carrito con animación
    window.addToCartWithAnimation = function (buttonElement, productoId, nombre, precio, imagen) {
        // Encontrar la imagen del producto en la tarjeta
        const productCard = buttonElement.closest('.producto-card');
        const productImage = productCard ? productCard.querySelector('.producto-imagen img') : null;

        if (productImage && typeof window.createFlyToCartAnimationFromButton === 'function') {
            // Usar la animación desde el botón
            window.createFlyToCartAnimationFromButton(buttonElement, productImage.src, () => {
                // Añadir al carrito después de la animación
                if (typeof window.addToCart === 'function') {
                    window.addToCart(productoId, nombre, precio, imagen, 1);
                }
            });

            // Feedback visual en el botón
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓ Añadido';
            buttonElement.style.background = 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)';
            buttonElement.style.color = 'white';

            setTimeout(() => {
                buttonElement.textContent = originalText;
                buttonElement.style.background = '';
                buttonElement.style.color = '';
            }, 2000);

        } else {
            // Fallback sin animación
            if (typeof window.addToCart === 'function') {
                window.addToCart(productoId, nombre, precio, imagen, 1);
            }

            // Feedback visual simple
            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓ Añadido';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 1500);
        }
    };
});
