// Función para aceptar cookies
function acceptCookies() {
    const cookieBanner = document.getElementById('cookieBanner');
    if (cookieBanner) {
        cookieBanner.style.display = 'none';
        // Guardar la preferencia del usuario
        localStorage.setItem('cookiesAceptadas', 'true');
    }
}

// Función para verificar si ya se aceptaron las cookies
function verificarCookies() {
    const cookiesAceptadas = localStorage.getItem('cookiesAceptadas');
    const cookieBanner = document.getElementById('cookieBanner');
    
    if (cookiesAceptadas === 'true' && cookieBanner) {
        cookieBanner.style.display = 'none';
    }
}

// Función para descargar imagen en formato JPEG
function descargarImagenJPEG(imagenSrc, nombreProducto) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // Usar la URL original de la imagen
    img.crossOrigin = 'anonymous';
    
    img.onload = function() {
        try {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            
            // Convertir a JPEG con calidad 0.9
            canvas.toBlob(function(blob) {
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${nombreProducto.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s]/g, '_').trim()}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }
            }, 'image/jpeg', 0.9);
        } catch (error) {
            console.error('Error al procesar la imagen:', error);
        }
    };
    
    img.onerror = function() {
        console.error('Error al cargar la imagen:', imagenSrc);
    };
    
    img.src = imagenSrc;
}

// Función para interceptar la descarga de imágenes
function configurarDescargaJPEG() {
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('producto-imagen')) {
            const imagen = e.target;
            const productoCard = imagen.closest('.producto-card');
            const nombreProducto = productoCard.querySelector('.producto-nombre').textContent;
            
            // Interceptar el evento de descarga
            imagen.addEventListener('click', function(e) {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    descargarImagenJPEG(imagen.src, nombreProducto);
                }
            });
            
            // También interceptar el evento de arrastrar
            imagen.addEventListener('dragstart', function(e) {
                e.preventDefault();
                descargarImagenJPEG(imagen.src, nombreProducto);
            });
        }
    });
}

// Variable global para almacenar los productos
let productosCargados = false;

// Función para cargar las categorías
async function cargarCategorias() {
    try {
        const response = await fetch('/productos.json');
        const data = await response.json();
        const categoriasGrid = document.querySelector('.categorias-grid');
        
        data.categorias.forEach(categoria => {
            const categoriaElement = document.createElement('div');
            categoriaElement.className = 'categoria-item';
            categoriaElement.innerHTML = `
                <h2 class="categoria-titulo">${categoria.titulo}</h2>
                <p class="categoria-descripcion">${categoria.descripcion}</p>
                <div class="productos-categoria" id="${categoria.id}">
                    <!-- Los productos de esta categoría se cargarán aquí -->
                </div>
            `;
            categoriasGrid.appendChild(categoriaElement);
        });
        
        // Cargar productos después de que las categorías estén listas
        await cargarProductos();
        productosCargados = true;
    } catch (error) {
        console.error('Error al cargar las categorías:', error);
    }
}

// Función para cargar los productos
async function cargarProductos() {
    try {
        const response = await fetch('/productos.json');
        const data = await response.json();
        
        data.categorias.forEach(categoria => {
            const productosContainer = document.getElementById(categoria.id);
            if (productosContainer) {
                // Limpiar el contenedor antes de añadir productos
                productosContainer.innerHTML = '';
                
                categoria.productos.forEach(producto => {
                    const productoElement = document.createElement('div');
                    productoElement.className = 'producto-card';
                    const imagenUrl = producto.imagen;
                    productoElement.innerHTML = `
                        <a href="producto.html?id=${producto.id}" class="producto-link">
                            <img src="${imagenUrl}" alt="${producto.nombre}" class="producto-imagen">
                            <div class="producto-info">
                                <h3 class="producto-nombre">${producto.nombre}</h3>
                                <p class="producto-precio">${producto.precio.toFixed(2)} €</p>
                            </div>
                        </a>
                    `;
                    productosContainer.appendChild(productoElement);
                });
            }
        });
    } catch (error) {
        console.error('Error al cargar los productos:', error);
    }
}

// Función para normalizar texto (eliminar tildes y caracteres especiales)
function normalizarTexto(texto) {
    return texto.normalize('NFD')
               .replace(/[\u0300-\u036f]/g, '')
               .toLowerCase()
               .trim()
               .replace(/[^a-z0-9\s]/g, '');
}

// Función para mostrar/ocultar el spinner
function toggleSpinner(mostrar) {
    const spinnerContainer = document.querySelector('.spinner-container');
    const spinnerOverlay = document.querySelector('.spinner-overlay');
    
    // Si no existe el spinner, lo creamos
    if (!spinnerContainer) {
        const spinnerHTML = `
            <div class="spinner-container">
                <div class="spinner"></div>
            </div>
            <div class="spinner-overlay"></div>
        `;
        document.body.insertAdjacentHTML('beforeend', spinnerHTML);
    }
    
    // Ahora sí podemos acceder a los elementos
    document.querySelector('.spinner-container').style.display = mostrar ? 'block' : 'none';
    document.querySelector('.spinner-overlay').style.display = mostrar ? 'block' : 'none';
}

// Función para restaurar la vista original
function restaurarProductos() {
    document.querySelectorAll('.categoria-item').forEach(categoria => {
        categoria.style.display = '';
        categoria.querySelectorAll('.producto-card').forEach(producto => {
            producto.style.display = '';
        });
    });
    
    const mensajeNoResultados = document.querySelector('.no-resultados');
    if (mensajeNoResultados) {
        mensajeNoResultados.remove();
    }
}

// Función para buscar productos
async function buscarProductos(termino) {
    console.log('Buscando:', termino);
    
    if (!termino) {
        console.log('Término vacío, restaurando vista');
        restaurarProductos();
        return;
    }

    // Si los productos no están cargados, esperar a que se carguen
    if (!productosCargados) {
        console.log('Esperando a que se carguen los productos...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (!productosCargados) {
            console.error('Los productos no se han cargado correctamente');
            return;
        }
    }

    toggleSpinner(true);

    try {
        const terminoBusqueda = normalizarTexto(termino);
        console.log('Término de búsqueda normalizado:', terminoBusqueda);
        
        const productosCards = document.querySelectorAll('.producto-card');
        console.log('Productos encontrados:', productosCards.length);
        let hayResultados = false;
        
        productosCards.forEach(card => {
            const nombre = normalizarTexto(card.querySelector('.producto-nombre').textContent);
            const categoria = normalizarTexto(card.closest('.categoria-item').querySelector('.categoria-titulo').textContent);
            
            console.log('Comparando:', { nombre, categoria, terminoBusqueda });
            
            // Verificar si el término de búsqueda está presente en cualquiera de los campos
            const coincide = nombre.includes(terminoBusqueda) || 
                           categoria.includes(terminoBusqueda);
            
            if (coincide) {
                console.log('Coincidencia encontrada:', nombre);
                card.style.display = '';
                card.closest('.categoria-item').style.display = '';
                hayResultados = true;
            } else {
                card.style.display = 'none';
            }
        });

        // Ocultar categorías vacías
        document.querySelectorAll('.categoria-item').forEach(categoria => {
            const productosVisibles = categoria.querySelectorAll('.producto-card[style=""]').length;
            if (productosVisibles === 0) {
                categoria.style.display = 'none';
            }
        });

        // Mostrar mensaje si no hay resultados
        const mensajeNoResultados = document.querySelector('.no-resultados');
        if (!hayResultados) {
            if (!mensajeNoResultados) {
                const mensaje = document.createElement('div');
                mensaje.className = 'no-resultados';
                mensaje.innerHTML = `
                    <p>No se encontraron productos que coincidan con "${termino}"</p>
                    <p>Intenta con otras palabras o revisa la ortografía</p>
                `;
                document.querySelector('.productos-section').appendChild(mensaje);
            }
        } else if (mensajeNoResultados) {
            mensajeNoResultados.remove();
        }
    } finally {
        toggleSpinner(false);
    }
}

// Eventos cuando el DOM está listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM cargado, inicializando...');
    
    // Cargar categorías y productos
    await cargarCategorias();
    actualizarContadorCarrito();
    
    // Configurar el menú contextual para descargar imágenes en JPEG
    configurarDescargaJPEG();
    
    // Configurar el buscador
    const buscador = document.getElementById('buscador');
    const buscadorBtn = document.querySelector('.buscador-btn');
    const buscadorBtnMobile = document.querySelector('.buscador-btn-mobile');
    const buscadorCerrar = document.querySelector('.buscador-cerrar');
    const buscadorContainer = document.querySelector('.buscador-container');
    
    // Configurar menú hamburguesa
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    
    // Función para abrir/cerrar el menú
    const toggleMenu = (e) => {
        e.preventDefault();
        e.stopPropagation();
        nav.classList.toggle('active');
        menuToggle.setAttribute('aria-expanded', 
            menuToggle.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
        );
    };

    // Función para cerrar el menú
    const closeMenu = (e) => {
        if (!nav.contains(e.target) && e.target !== menuToggle) {
            nav.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    };

    // Función para abrir el buscador
    const abrirBuscador = (e) => {
        e.preventDefault();
        e.stopPropagation();
        buscadorContainer.classList.add('active');
        buscador.focus();
    };

    // Función para cerrar el buscador
    const cerrarBuscador = (e) => {
        e.preventDefault();
        e.stopPropagation();
        buscadorContainer.classList.remove('active');
        buscador.value = '';
        restaurarProductos();
    };

    // Configurar eventos del menú
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', toggleMenu);
        document.addEventListener('click', closeMenu);
        
        // Prevenir que los clics dentro del menú lo cierren
        nav.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // Configurar eventos del buscador
    if (buscadorBtn) {
        buscadorBtn.addEventListener('click', abrirBuscador);
    }

    if (buscadorBtnMobile) {
        buscadorBtnMobile.addEventListener('click', abrirBuscador);
    }

    if (buscadorCerrar) {
        buscadorCerrar.addEventListener('click', cerrarBuscador);
    }

    // Cerrar buscador al hacer clic fuera
    document.addEventListener('click', (e) => {
        // Si el buscador está activo y el clic NO es dentro del buscador, NI en los botones, NI en un producto
        const esProducto = e.target.closest && (e.target.closest('.producto-card') || e.target.closest('.producto-link'));
        if (
            buscadorContainer.classList.contains('active') && 
            !buscadorContainer.contains(e.target) && 
            e.target !== buscadorBtn && 
            e.target !== buscadorBtnMobile &&
            !esProducto
        ) {
            cerrarBuscador(e);
        }
    });

    // Configurar búsqueda
    let timeoutId;
    if (buscador) {
        buscador.addEventListener('input', (e) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                buscarProductos(e.target.value);
            }, 300);
        });
    }

    // Verificar cookies al cargar la página
    verificarCookies();
});
