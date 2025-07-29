document.addEventListener('DOMContentLoaded', function() {
    const cookieBanner = document.getElementById('cookieBanner');
    if (cookieBanner) {
        cookieBanner.style.zIndex = '2147483647';
        cookieBanner.style.position = 'fixed';
        cookieBanner.style.left = '0';
        cookieBanner.style.right = '0';
        cookieBanner.style.bottom = '0';
        cookieBanner.style.display = 'block';
    }
});

function acceptCookies() {
    const cookieBanner = document.getElementById('cookieBanner');
    if (cookieBanner) {
        cookieBanner.classList.add('hidden');
    }
    localStorage.setItem('cookiesAccepted', 'true');
}

// Verificar si las cookies ya fueron aceptadas
document.addEventListener('DOMContentLoaded', function() {
    const cookiesAceptadas = localStorage.getItem('cookiesAccepted');
    const cookieBanner = document.getElementById('cookieBanner');
    if (cookiesAceptadas === 'true' && cookieBanner) {
        cookieBanner.classList.add('hidden');
    }
});

// Función para descargar imagen en formato JPEG
function descargarImagenJPEG(imagenSrc, nombreProducto) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
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
        if (e.target.tagName === 'IMG' && e.target.id === 'producto-imagen') {
            const imagen = e.target;
            const nombreProducto = document.getElementById('producto-nombre').textContent;
            
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

// Función para cargar los datos del producto
async function cargarProducto() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            window.location.href = '/productos.html';
            return;
        }

        const response = await fetch('/productos.json');
        const data = await response.json();
        
        // Buscar el producto en todas las categorías
        let producto = null;
        for (const categoria of data.categorias) {
            const encontrado = categoria.productos.find(p => p.id === productId);
            if (encontrado) {
                producto = encontrado;
                break;
            }
        }
        
        if (producto) {
            // Actualizar el contenido de la página
            document.getElementById('producto-imagen').src = producto.imagen;
            document.getElementById('producto-imagen').alt = producto.nombre;
            document.getElementById('producto-nombre').textContent = producto.nombre;
            document.getElementById('producto-descripcion').textContent = producto.descripcion;
            document.getElementById('producto-precio').textContent = `${producto.precio.toFixed(2)}€`;
            
            // Actualizar el título de la página
            document.title = `${producto.nombre} - Anita Pinturitas`;

            // Configurar el botón del carrito
            document.getElementById('boton-carrito').addEventListener('click', () => {
                añadirAlCarrito(producto);
            });
        } else {
            // Si no se encuentra el producto, redirigir a la página de productos
            window.location.href = '/productos.html';
        }
    } catch (error) {
        console.error('Error al cargar el producto:', error);
        window.location.href = '/productos.html';
    }
}

// Función para manejar el contador
function inicializarContador() {
    const cantidadInput = document.getElementById('cantidad');
    const btnDecrementar = document.getElementById('decrementar');
    const btnIncrementar = document.getElementById('incrementar');

    btnDecrementar.addEventListener('click', () => {
        const valorActual = parseInt(cantidadInput.value);
        if (valorActual > 1) {
            cantidadInput.value = valorActual - 1;
        }
    });

    btnIncrementar.addEventListener('click', () => {
        const valorActual = parseInt(cantidadInput.value);
        if (valorActual < 10) {
            cantidadInput.value = valorActual + 1;
        }
    });
}

// Función para añadir al carrito
function añadirAlCarrito(producto) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const cantidad = parseInt(document.getElementById('cantidad').value);
    
    // Buscar si el producto ya existe en el carrito
    const productoExistente = carrito.find(p => p.id === producto.id);
    
    if (productoExistente) {
        // Si existe, incrementar la cantidad
        productoExistente.cantidad = (productoExistente.cantidad || 0) + cantidad;
    } else {
        // Si no existe, añadir como nuevo producto con la cantidad seleccionada
        carrito.push({
            ...producto,
            cantidad: cantidad
        });
    }
    
    localStorage.setItem('carrito', JSON.stringify(carrito));
    
    // Actualizar todos los contadores del carrito
    document.querySelectorAll('.carrito-cantidad').forEach(element => {
        const totalUnidades = carrito.reduce((total, producto) => total + (producto.cantidad || 1), 0);
        element.textContent = totalUnidades;
    });
    
    mostrarNotificacion(`Se han añadido ${cantidad} ${cantidad === 1 ? 'unidad' : 'unidades'} al carrito`);
}

// Función para mostrar notificación
function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'notificacion';
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);

    setTimeout(() => {
        notificacion.remove();
    }, 3000);
}

// Cargar el producto cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    cargarProducto();
    inicializarContador();
    configurarDescargaJPEG();
}); 