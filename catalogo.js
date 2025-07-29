// Funciones globales para manejo de imágenes
function handleImageLoad(img) {
    img.classList.add('loaded');
    img.style.opacity = '1';
}

function handleImageError(img) {
    img.onerror = null; // Prevenir bucles infinitos
    img.src = '/assets/placeholder.jpg';
    img.classList.add('error');
    const errorDiv = img.nextElementSibling;
    if (errorDiv && errorDiv.classList.contains('imagen-error')) {
        errorDiv.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado');

    // Elementos del DOM
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    const buscadorBtn = document.querySelector('.buscador-btn');
    const buscadorBtnMobile = document.querySelector('.buscador-btn-mobile');
    const buscadorContainer = document.querySelector('.buscador-container');
    const buscadorCerrar = document.querySelector('.buscador-cerrar');
    const buscadorInput = document.querySelector('#buscador');
    const spinnerContainer = document.querySelector('.spinner-container');
    const spinnerOverlay = document.querySelector('.spinner-overlay');

    // Toggle menú móvil
    menuToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
    });

    // Toggle buscador
    const toggleBuscador = () => {
        buscadorContainer.style.display = buscadorContainer.style.display === 'block' ? 'none' : 'block';
        if (buscadorContainer.style.display === 'block') {
            buscadorInput.focus();
        }
    };

    buscadorBtn.addEventListener('click', toggleBuscador);
    buscadorBtnMobile.addEventListener('click', toggleBuscador);
    buscadorCerrar.addEventListener('click', toggleBuscador);

    // Cerrar buscador al hacer clic fuera
    document.addEventListener('click', (e) => {
        if (!buscadorContainer.contains(e.target) && 
            !buscadorBtn.contains(e.target) && 
            !buscadorBtnMobile.contains(e.target)) {
            buscadorContainer.style.display = 'none';
        }
    });

    // Función para mostrar/ocultar spinner
    const toggleSpinner = (show) => {
        if (spinnerContainer && spinnerOverlay) {
            spinnerContainer.style.display = show ? 'block' : 'none';
            spinnerOverlay.style.display = show ? 'block' : 'none';
        }
    };

    // Función para cargar los productos desde el JSON
    async function cargarProductos() {
        console.log('Iniciando carga de productos');
        try {
            toggleSpinner(true);
            console.log('Intentando cargar catalogo.json');
            const response = await fetch('catalogo.json');
            console.log('Respuesta recibida:', response);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Datos cargados:', data);
            
            const mostrador = document.querySelector('#mostrador');
            if (!mostrador) {
                console.error('No se encontró el elemento #mostrador');
                return;
            }
            
            console.log('Limpiando mostrador');
            mostrador.innerHTML = '';

            // Cargar productos de cuidado de la piel
            if (data.categorias && data.categorias.piel) {
                console.log('Cargando productos de cuidado de la piel');
                const pielSection = document.createElement('section');
                pielSection.className = 'product-section';
                pielSection.innerHTML = '<h2 class="section-title">Cuidado de la Piel</h2>';
                
                const productosRow = document.createElement('div');
                productosRow.className = 'product-row';
                
                for (const producto of data.categorias.piel.productos) {
                    console.log('Procesando producto de piel:', producto.descripcion);
                    const productoCard = document.createElement('div');
                    productoCard.className = 'product-card';
                    const imagenPath = producto.imagen.startsWith('/') ? producto.imagen : `/assets/${producto.imagen}`;
                    
                    productoCard.innerHTML = `
                        <div class="producto">
                            <div class="imagen-container">
                                <img src="${imagenPath}" 
                                     alt="${producto.descripcion}" 
                                     loading="lazy" 
                                     width="300" 
                                     height="300"
                                     onerror="this.onerror=null; this.src='/assets/placeholder.jpg'; this.classList.add('error'); this.nextElementSibling.style.display='block';"
                                     onload="handleImageLoad(this)">
                                <div class="imagen-error" style="display: none;">
                                    <i class="fas fa-exclamation-circle"></i>
                                    <p>Imagen no disponible</p>
                                </div>
                            </div>
                            <h4>${producto.descripcion}</h4>
                            <p class="price">${producto.precio || 'Pincha y descubre el precio'}</p>
                            <a class="btn" href="${producto.url}">Comprar en Younique</a>
                        </div>
                    `;
                    productosRow.appendChild(productoCard);
                }
                
                pielSection.appendChild(productosRow);
                mostrador.appendChild(pielSection);
            }

            // Cargar productos de maquillaje
            if (data.categorias && data.categorias.maquillaje) {
                console.log('Cargando productos de maquillaje');
                const maquillajeSection = document.createElement('section');
                maquillajeSection.className = 'product-section';
                maquillajeSection.innerHTML = '<h2 class="section-title">Maquillaje</h2>';
                
                // Cargar productos de ojos
                if (data.categorias.maquillaje.ojos) {
                    const ojosSection = document.createElement('div');
                    ojosSection.className = 'product-category';
                    ojosSection.innerHTML = '<h3 class="category-title">Ojos</h3>';
                    
                    const productosRow = document.createElement('div');
                    productosRow.className = 'product-row';
                    
                    for (const producto of data.categorias.maquillaje.ojos) {
                        const productoCard = document.createElement('div');
                        productoCard.className = 'product-card';
                        const imagenPath = producto.imagen.startsWith('/') ? producto.imagen : `/assets/${producto.imagen}`;
                        
                        productoCard.innerHTML = `
                            <div class="producto">
                                <div class="imagen-container">
                                    <img src="${imagenPath}" 
                                         alt="${producto.descripcion}" 
                                         loading="lazy" 
                                         width="300" 
                                         height="300"
                                         onerror="handleImageError(this)"
                                         onload="handleImageLoad(this)">
                                    <div class="imagen-error" style="display: none;">
                                        <i class="fas fa-exclamation-circle"></i>
                                        <p>Imagen no disponible</p>
                                    </div>
                                </div>
                                <h4>${producto.descripcion}</h4>
                                <p class="price">${producto.precio || 'Pincha y descubre el precio'}</p>
                                <a class="btn" href="${producto.url}" target="_blank">Comprar en Younique</a>
                            </div>
                        `;
                        productosRow.appendChild(productoCard);
                    }
                    
                    ojosSection.appendChild(productosRow);
                    maquillajeSection.appendChild(ojosSection);
                }

                // Cargar productos de labios
                if (data.categorias.maquillaje.labios) {
                    const labiosSection = document.createElement('div');
                    labiosSection.className = 'product-category';
                    labiosSection.innerHTML = '<h3 class="category-title">Labios</h3>';
                    
                    const productosRow = document.createElement('div');
                    productosRow.className = 'product-row';
                    
                    for (const producto of data.categorias.maquillaje.labios) {
                        const productoCard = document.createElement('div');
                        productoCard.className = 'product-card';
                        const imagenPath = producto.imagen.startsWith('/') ? producto.imagen : `/assets/${producto.imagen}`;
                        
                        productoCard.innerHTML = `
                            <div class="producto">
                                <div class="imagen-container">
                                    <img src="${imagenPath}" 
                                         alt="${producto.descripcion}" 
                                         loading="lazy" 
                                         width="300" 
                                         height="300"
                                         onerror="handleImageError(this)"
                                         onload="handleImageLoad(this)">
                                    <div class="imagen-error" style="display: none;">
                                        <i class="fas fa-exclamation-circle"></i>
                                        <p>Imagen no disponible</p>
                                    </div>
                                </div>
                                <h4>${producto.descripcion}</h4>
                                <p class="price">${producto.precio || 'Pincha y descubre el precio'}</p>
                                <a class="btn" href="${producto.url}" target="_blank">Comprar en Younique</a>
                            </div>
                        `;
                        productosRow.appendChild(productoCard);
                    }
                    
                    labiosSection.appendChild(productosRow);
                    maquillajeSection.appendChild(labiosSection);
                }

                // Cargar productos de rostro
                if (data.categorias.maquillaje.rostro) {
                    const rostroSection = document.createElement('div');
                    rostroSection.className = 'product-category';
                    rostroSection.innerHTML = '<h3 class="category-title">Rostro</h3>';
                    
                    const productosRow = document.createElement('div');
                    productosRow.className = 'product-row';
                    
                    for (const producto of data.categorias.maquillaje.rostro) {
                        const productoCard = document.createElement('div');
                        productoCard.className = 'product-card';
                        const imagenPath = producto.imagen.startsWith('/') ? producto.imagen : `/assets/${producto.imagen}`;
                        
                        productoCard.innerHTML = `
                            <div class="producto">
                                <div class="imagen-container">
                                    <img src="${imagenPath}" 
                                         alt="${producto.descripcion}" 
                                         loading="lazy" 
                                         width="300" 
                                         height="300"
                                         onerror="handleImageError(this)"
                                         onload="handleImageLoad(this)">
                                    <div class="imagen-error" style="display: none;">
                                        <i class="fas fa-exclamation-circle"></i>
                                        <p>Imagen no disponible</p>
                                    </div>
                                </div>
                                <h4>${producto.descripcion}</h4>
                                <p class="price">${producto.precio || 'Pincha y descubre el precio'}</p>
                                <a class="btn" href="${producto.url}" target="_blank">Comprar en Younique</a>
                            </div>
                        `;
                        productosRow.appendChild(productoCard);
                    }
                    
                    rostroSection.appendChild(productosRow);
                    maquillajeSection.appendChild(rostroSection);
                }
                
                mostrador.appendChild(maquillajeSection);
            }
            
            console.log('Carga de productos completada');
            toggleSpinner(false);
        } catch (error) {
            console.error('Error al cargar los productos:', error);
            toggleSpinner(false);
            const mostrador = document.querySelector('#mostrador');
            if (mostrador) {
                mostrador.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Error al cargar los productos. Por favor, intente nuevamente más tarde.</p>
                    </div>
                `;
            }
        }
    }

    // Función para mostrar el detalle de un producto
    function cargar(producto) {
        const seleccion = document.querySelector('#seleccion');
        const img = document.querySelector('#img');
        const modelo = document.querySelector('#modelo');
        const precio = document.querySelector('#precio');
        const link = document.querySelector('#a');

        img.src = producto.imagen;
        img.alt = producto.descripcion;
        modelo.textContent = producto.descripcion;
        precio.textContent = producto.precio;
        link.href = producto.url;

        seleccion.style.display = 'flex';
    }

    // Función para cerrar el detalle del producto
    function cerrar() {
        const seleccion = document.querySelector('#seleccion');
        seleccion.style.display = 'none';
    }

    // Función para cargar categorías
    const cargarCategorias = async () => {
        try {
            toggleSpinner(true);
            const response = await fetch('/api/categorias');
            const categorias = await response.json();
            
            const categoriasGrid = document.querySelector('.categorias-grid');
            categoriasGrid.innerHTML = categorias.map(categoria => `
                <div class="categoria-card">
                    <h3>${categoria.nombre}</h3>
                    <p>${categoria.descripcion}</p>
                </div>
            `).join('');
        } catch (error) {
            console.error('Error al cargar categorías:', error);
        } finally {
            toggleSpinner(false);
        }
    };

    // Función para mostrar el spinner de carga
    function showSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'spinner';
        spinner.innerHTML = '<div class="spinner-inner"></div>';
        document.body.appendChild(spinner);
    }

    // Función para ocultar el spinner de carga
    function hideSpinner() {
        const spinner = document.querySelector('.spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    // Función para agregar al carrito
    const agregarAlCarrito = async (e) => {
        const productoId = e.target.dataset.id;
        try {
            toggleSpinner(true);
            const response = await fetch('/api/carrito/agregar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ productoId })
            });
            
            if (response.ok) {
                actualizarContadorCarrito();
                // Mostrar mensaje de éxito
                alert('Producto agregado al carrito');
            } else {
                throw new Error('Error al agregar al carrito');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al agregar el producto al carrito');
        } finally {
            toggleSpinner(false);
        }
    };

    // Función para actualizar contador del carrito
    const actualizarContadorCarrito = async () => {
        try {
            const response = await fetch('/api/carrito/cantidad');
            const { cantidad } = await response.json();
            
            document.querySelectorAll('.carrito-cantidad').forEach(element => {
                element.textContent = cantidad;
            });
        } catch (error) {
            console.error('Error al actualizar contador del carrito:', error);
        }
    };

    // Búsqueda de productos
    let timeoutId;
    buscadorInput.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            const busqueda = e.target.value.trim();
            if (busqueda.length >= 2) {
                buscarProductos(busqueda);
            } else {
                cargarProductos(); // Si el input está vacío o muy corto, mostrar todos
            }
        }, 300);
    });

    // Nueva función de búsqueda local en catalogo.json
    const buscarProductos = async (termino) => {
        try {
            toggleSpinner(true);
            const response = await fetch('catalogo.json');
            const data = await response.json();
            const mostrador = document.querySelector('#mostrador');
            mostrador.innerHTML = '';
            const terminoLower = termino.toLowerCase();
            let resultados = [];

            // Helper para filtrar productos
            function filtrarProductos(productos, categoria) {
                return productos.filter(producto => {
                    return (
                        (producto.descripcion && producto.descripcion.toLowerCase().includes(terminoLower)) ||
                        (producto.precio && producto.precio.toLowerCase().includes(terminoLower)) ||
                        (categoria && categoria.toLowerCase().includes(terminoLower))
                    );
                }).map(producto => ({...producto, _categoria: categoria}));
            }

            // Piel
            if (data.categorias && data.categorias.piel && data.categorias.piel.productos) {
                resultados = resultados.concat(filtrarProductos(data.categorias.piel.productos, 'Piel'));
            }
            // Maquillaje - Ojos
            if (data.categorias && data.categorias.maquillaje && data.categorias.maquillaje.ojos) {
                resultados = resultados.concat(filtrarProductos(data.categorias.maquillaje.ojos, 'Ojos'));
            }
            // Maquillaje - Labios
            if (data.categorias && data.categorias.maquillaje && data.categorias.maquillaje.labios) {
                resultados = resultados.concat(filtrarProductos(data.categorias.maquillaje.labios, 'Labios'));
            }
            // Maquillaje - Rostro
            if (data.categorias && data.categorias.maquillaje && data.categorias.maquillaje.rostro) {
                resultados = resultados.concat(filtrarProductos(data.categorias.maquillaje.rostro, 'Rostro'));
            }

            if (resultados.length === 0) {
                mostrador.innerHTML = `<div class="no-resultados">No se encontraron productos para "${termino}"</div>`;
            } else {
                // Agrupar por categoría para mostrar bonito
                const categorias = {};
                resultados.forEach(p => {
                    if (!categorias[p._categoria]) categorias[p._categoria] = [];
                    categorias[p._categoria].push(p);
                });
                Object.keys(categorias).forEach(cat => {
                    const section = document.createElement('section');
                    section.className = 'product-section';
                    section.innerHTML = `<h2 class="section-title">${cat}</h2>`;
                    const row = document.createElement('div');
                    row.className = 'product-row';
                    categorias[cat].forEach(producto => {
                        const card = document.createElement('div');
                        card.className = 'product-card';
                        const imagenPath = producto.imagen.startsWith('/') ? producto.imagen : `/assets/${producto.imagen}`;
                        card.innerHTML = `
                            <div class="producto">
                                <div class="imagen-container">
                                    <img src="${imagenPath}" alt="${producto.descripcion}" loading="lazy" width="300" height="300" onerror="handleImageError(this)" onload="handleImageLoad(this)">
                                    <div class="imagen-error" style="display: none;">
                                        <i class="fas fa-exclamation-circle"></i>
                                        <p>Imagen no disponible</p>
                                    </div>
                                </div>
                                <h4>${producto.descripcion}</h4>
                                <p class="price">${producto.precio || 'Pincha y descubre el precio'}</p>
                                <a class="btn" href="${producto.url}" target="_blank">Comprar en Younique</a>
                            </div>
                        `;
                        row.appendChild(card);
                    });
                    section.appendChild(row);
                    mostrador.appendChild(section);
                });
            }
        } catch (error) {
            console.error('Error en la búsqueda:', error);
            const mostrador = document.querySelector('#mostrador');
            if (mostrador) {
                mostrador.innerHTML = '<div class="error-message">Error al realizar la búsqueda</div>';
            }
        } finally {
            toggleSpinner(false);
        }
    };

    // Inicializar
    cargarCategorias();
    cargarProductos();
    actualizarContadorCarrito();
}); 