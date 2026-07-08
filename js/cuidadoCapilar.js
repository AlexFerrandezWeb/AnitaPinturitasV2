// Cargar y mostrar productos de cuidado capilar con carga progresiva por scroll
document.addEventListener('DOMContentLoaded', function () {
    const productosContainer = document.getElementById('productos-container');
    const CATEGORIAS_INICIAL = 2;

    fetch('../data/cuidadoCapilar.json')
        .then(response => response.json())
        .then(data => {
            iniciarCargaPorScroll(data.categorias);
        })
        .catch(error => {
            console.error('Error al cargar los productos:', error);
            productosContainer.innerHTML = '<p>Error al cargar los productos. Por favor, intenta de nuevo más tarde.</p>';
        });

    function iniciarCargaPorScroll(categorias) {
        let indice = 0;

        const slugDe = (titulo) => String(titulo || '').toLowerCase()
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

        function cargarSiguietesBatch(cantidad, anteDe = null) {
            const hasta = Math.min(indice + cantidad, categorias.length);
            for (let i = indice; i < hasta; i++) {
                const seccion = crearSeccionCategoria(categorias[i]);
                seccion.id = 'cat-' + slugDe(categorias[i].titulo);
                if (anteDe) {
                    productosContainer.insertBefore(seccion, anteDe);
                } else {
                    productosContainer.appendChild(seccion);
                }
            }
            indice = hasta;
        }

        // Índice de subcategorías: permite saltar directamente a cada sección
        if (categorias.length > 1) {
            const chips = document.createElement('nav');
            chips.className = 'categorias-index';
            chips.setAttribute('aria-label', 'Subcategorías');
            chips.innerHTML = categorias.map((c, i) =>
                `<button type="button" class="categorias-index__chip" data-index="${i}">${c.titulo}</button>`
            ).join('');
            productosContainer.parentNode.insertBefore(chips, productosContainer);

            chips.addEventListener('click', (e) => {
                const chip = e.target.closest('.categorias-index__chip');
                if (!chip) return;
                const objetivo = parseInt(chip.dataset.index, 10);
                const sentinel = productosContainer.querySelector('.lazy-sentinel');
                if (objetivo >= indice) {
                    cargarSiguietesBatch(objetivo - indice + 1, sentinel);
                }
                if (indice >= categorias.length && sentinel) {
                    sentinel.remove();
                }
                const seccion = document.getElementById('cat-' + slugDe(categorias[objetivo].titulo));
                if (seccion) seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }

        // Carga inicial
        cargarSiguietesBatch(CATEGORIAS_INICIAL);

        if (indice >= categorias.length) return;

        // Sentinel para detectar scroll
        const sentinel = document.createElement('div');
        sentinel.className = 'lazy-sentinel';
        sentinel.innerHTML = '<div class="lazy-spinner"><span></span><span></span><span></span></div>';
        productosContainer.appendChild(sentinel);

        const observer = new IntersectionObserver((entries) => {
            if (!entries[0].isIntersecting) return;

            cargarSiguietesBatch(1, sentinel);

            if (indice >= categorias.length) {
                observer.disconnect();
                sentinel.remove();
            }
        }, { rootMargin: '200px' });

        observer.observe(sentinel);
    }

    function crearSeccionCategoria(categoria) {
        const seccion = document.createElement('div');
        seccion.className = 'categoria-section';

        let html = `<h2 class="categoria-titulo">${categoria.titulo}</h2><div class="productos-grid">`;

        categoria.productos.forEach(producto => {
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
                <div class="featured-product-card" onclick="verProducto('${producto.id}')">
                    <a href="producto.html?id=${producto.id}" class="featured-product-card__img-link" onclick="event.stopPropagation()">
                        <img src="${producto.imagen}" alt="${altSeguro}" class="featured-product-card__img" loading="lazy">
                        <span class="featured-product-card__tag">Cabello</span>
                    </a>
                    <div class="featured-product-card__body">
                        <h3 class="featured-product-card__name">${producto.nombre}</h3>
                        <p class="featured-product-card__desc">${producto.descripcion || ''}</p>
                        <p class="featured-product-card__price">${producto.precio.toFixed(2)} €</p>
                        <p class="featured-product-card__iva">IVA incluido</p>
                        <div class="featured-product-card__actions" onclick="event.stopPropagation()">
                            <a href="producto.html?id=${producto.id}" class="featured-product-card__btn featured-product-card__btn--ver">Ver</a>
                            <button type="button" class="featured-product-card__btn featured-product-card__btn--cart" onclick="event.stopPropagation(); addToCartWithAnimation(this, '${producto.id}', '${producto.nombre}', ${producto.precio}, '${producto.imagen}')">
                                Añadir al carrito
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        seccion.innerHTML = html;
        return seccion;
    }

    window.verProducto = function (productoId) {
        window.location.href = `producto.html?id=${productoId}`;
    };

    window.addToCartWithAnimation = function (buttonElement, productoId, nombre, precio, imagen) {
        const productCard = buttonElement.closest('.featured-product-card');
        const productImage = productCard ? productCard.querySelector('.featured-product-card__img') : null;

        if (productImage && typeof window.createFlyToCartAnimationFromButton === 'function') {
            window.createFlyToCartAnimationFromButton(buttonElement, productImage.src, () => {
                if (typeof window.addToCart === 'function') {
                    window.addToCart(productoId, nombre, precio, imagen, 1);
                }
            });

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
            if (typeof window.addToCart === 'function') {
                window.addToCart(productoId, nombre, precio, imagen, 1);
            }

            const originalText = buttonElement.textContent;
            buttonElement.textContent = '✓ Añadido';
            setTimeout(() => {
                buttonElement.textContent = originalText;
            }, 1500);
        }
    };
});
