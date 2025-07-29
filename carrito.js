// Clave pública de Stripe (¡reemplázala por la tuya!)
const stripe = Stripe('pk_live_51RiBJlAV1sSXblTcz3sH2w36Nd753TcxPOGaRFdj1qKLi1EfDqd3N6S1zXq8RTRVQgxv3SBT31uW3kmDKxZG1t6A00vdarrbHY');

// --- FUNCIONES DEL CARRITO ---

/**
 * Actualiza el número que se muestra en el icono del carrito en la navegación.
 */
function actualizarContadorCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const totalItems = carrito.reduce((total, producto) => total + (producto.cantidad || 0), 0);
    
    document.querySelectorAll('.carrito-cantidad').forEach(contador => {
        if (contador) {
            contador.textContent = totalItems;
        }
    });
}

/**
 * Renderiza los productos del carrito en la página y actualiza el resumen.
 */
function cargarCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const carritoProductos = document.getElementById('carrito-productos');
    const carritoVacio = document.getElementById('carrito-vacio');
    const carritoContenedor = document.querySelector('.carrito-contenedor');

    if (!carritoContenedor || !carritoProductos || !carritoVacio) return;

    if (carrito.length === 0) {
        carritoVacio.style.display = 'flex';
        carritoContenedor.style.display = 'none';
    } else {
        carritoVacio.style.display = 'none';
        carritoContenedor.style.display = 'grid';
        
        carritoProductos.innerHTML = '';
        let subtotal = 0;

        carrito.forEach((producto, index) => {
            const precio = parseFloat(producto.precio) || 0;
            const cantidad = parseInt(producto.cantidad) || 0;
            subtotal += precio * cantidad;

            carritoProductos.innerHTML += `
                <div class="producto-carrito">
                    <img src="${producto.imagen}" alt="${producto.nombre}" onerror="this.src='/assets/placeholder.jpg';">
                    <div class="producto-info">
                        <h3>${producto.nombre}</h3>
                        <p class="producto-precio">${precio.toFixed(2)} €</p>
                        <div class="cantidad-controls">
                            <button class="btn-cantidad" onclick="actualizarCantidad(${index}, -1)" aria-label="Disminuir cantidad">-</button>
                            <span>${cantidad}</span>
                            <button class="btn-cantidad" onclick="actualizarCantidad(${index}, 1)" aria-label="Aumentar cantidad">+</button>
                        </div>
                    </div>
                    <button class="btn-eliminar" onclick="eliminarProducto(${index})" aria-label="Eliminar producto">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        });

        actualizarResumen(subtotal);
    }

    actualizarContadorCarrito();
    habilitarBotonPago();
}

/**
 * Actualiza la cantidad de un producto en el carrito.
 * @param {number} index - El índice del producto en el array del carrito.
 * @param {number} cambio - El cambio a aplicar en la cantidad (+1 o -1).
 */
function actualizarCantidad(index, cambio) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (carrito[index]) {
        carrito[index].cantidad = Math.max(1, (parseInt(carrito[index].cantidad, 10) || 0) + cambio);
        localStorage.setItem('carrito', JSON.stringify(carrito));
        cargarCarrito();
    }
}

/**
 * Elimina un producto del carrito.
 * @param {number} index - El índice del producto a eliminar.
 */
function eliminarProducto(index) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    cargarCarrito();
}

/**
 * Muestra un banner informativo sobre el envío gratuito en la parte superior.
 * @param {number} subtotal - El subtotal actual.
 */
function mostrarBannerEnvioGratuito(subtotal) {
    const carritoSection = document.querySelector('.carrito-section');
    let bannerEnvio = document.getElementById('banner-envio-gratuito');
    
    // Crear el banner si no existe
    if (!bannerEnvio) {
        bannerEnvio = document.createElement('div');
        bannerEnvio.id = 'banner-envio-gratuito';
        bannerEnvio.className = 'banner-envio-gratuito';
        carritoSection.insertBefore(bannerEnvio, carritoSection.firstChild);
    }

    if (subtotal >= 62) {
        // Envío gratuito conseguido
        bannerEnvio.innerHTML = `
            <div class="banner-contenido banner-gratuito">
                <i class="fas fa-shipping-fast"></i>
                <span>¡Envío gratuito conseguido! Tu pedido será enviado sin costes adicionales.</span>
            </div>
        `;
        bannerEnvio.style.display = 'block';
    } else if (subtotal > 0) {
        // Mostrar cuánto falta para envío gratuito
        const faltante = 62 - subtotal;
        bannerEnvio.innerHTML = `
            <div class="banner-contenido banner-faltante">
                <i class="fas fa-info-circle"></i>
                <span>Añade ${faltante.toFixed(2)}€ más a tu pedido para conseguir envío gratuito</span>
                <a href="/productos.html" class="btn-seguir-comprando-banner">Ver más productos</a>
            </div>
        `;
        bannerEnvio.style.display = 'block';
    } else {
        // Carrito vacío
        bannerEnvio.style.display = 'none';
    }
}

/**
 * Actualiza el resumen del pedido (subtotal, envío y total).
 * @param {number} subtotal - El subtotal de los productos.
 */
function actualizarResumen(subtotal) {
    const envio = subtotal >= 62 ? 0 : 6.95;
    const total = subtotal + envio;
    const faltante = 62 - subtotal;

    document.getElementById('subtotal').textContent = `${subtotal.toFixed(2)} €`;
    document.getElementById('envio').textContent = `${envio.toFixed(2)} €`;
    document.getElementById('total').textContent = `${total.toFixed(2)} €`;

    // Mostrar mensaje sobre envío gratuito
    mostrarMensajeEnvioGratuito(subtotal, faltante);
    // Mostrar banner informativo
    mostrarBannerEnvioGratuito(subtotal);
}

/**
 * Muestra un mensaje informativo sobre el envío gratuito.
 * @param {number} subtotal - El subtotal actual.
 * @param {number} faltante - Cuánto falta para envío gratuito.
 */
function mostrarMensajeEnvioGratuito(subtotal, faltante) {
    const resumenDetalles = document.querySelector('.resumen-detalles');
    let mensajeEnvio = document.getElementById('mensaje-envio-gratuito');
    
    // Crear el elemento de mensaje si no existe
    if (!mensajeEnvio) {
        mensajeEnvio = document.createElement('div');
        mensajeEnvio.id = 'mensaje-envio-gratuito';
        mensajeEnvio.className = 'mensaje-envio';
        resumenDetalles.appendChild(mensajeEnvio);
    }

    if (subtotal >= 62) {
        // Envío gratuito conseguido
        mensajeEnvio.innerHTML = `
            <div class="mensaje-envio-gratuito">
                <i class="fas fa-shipping-fast"></i>
                <span>¡Envío gratuito conseguido!</span>
            </div>
        `;
        mensajeEnvio.style.display = 'block';
    } else if (subtotal > 0) {
        // Mostrar cuánto falta para envío gratuito
        mensajeEnvio.innerHTML = `
            <div class="mensaje-envio-faltante">
                <i class="fas fa-info-circle"></i>
                <span>Añade ${faltante.toFixed(2)}€ más para envío gratuito</span>
            </div>
        `;
        mensajeEnvio.style.display = 'block';
    } else {
        // Carrito vacío
        mensajeEnvio.style.display = 'none';
    }
}

/**
 * Habilita o deshabilita el botón de "Proceder al Pago" según si hay productos.
 */
function habilitarBotonPago() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const btnComprar = document.getElementById('btn-comprar');
    if (btnComprar) {
        if (carrito.length > 0) {
            btnComprar.disabled = false;
            btnComprar.style.opacity = '1';
            btnComprar.style.cursor = 'pointer';
        } else {
            btnComprar.disabled = true;
            btnComprar.style.opacity = '0.5';
            btnComprar.style.cursor = 'not-allowed';
        }
    }
}

// --- LÓGICA DE PAGO CON STRIPE ---

/**
 * Procesa el pago llamando al backend para crear una sesión de Stripe Checkout.
 */
async function procesarPagoConStripe() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const btnComprar = document.getElementById('btn-comprar');

    if (carrito.length === 0) {
        alert("Tu carrito está vacío.");
        return;
    }

    // Mostrar estado de carga
    if (btnComprar) {
        btnComprar.disabled = true;
        btnComprar.classList.add('loading');
        btnComprar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando pago...';
        btnComprar.style.cursor = 'not-allowed';
    }

    try {
        const response = await fetch('https://anita-pinturitas-server.onrender.com/crear-sesion', { // Asegúrate que la URL es correcta
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                carrito: carrito
                // No enviamos nombre ni dirección porque Stripe los pedirá directamente
            })
        });

        const data = await response.json();

        if (response.ok && data.id) {
            // Redirigir a la página de pago de Stripe
            await stripe.redirectToCheckout({ sessionId: data.id });
        } else {
            console.error('Error al crear la sesión de pago:', data.error);
            alert(`Error al procesar el pago: ${data.error || 'Error desconocido del servidor.'}`);
            
            // Restaurar el botón en caso de error
            if (btnComprar) {
                btnComprar.disabled = false;
                btnComprar.classList.remove('loading');
                btnComprar.innerHTML = 'Proceder al Pago';
                btnComprar.style.cursor = 'pointer';
            }
        }
    } catch (error) {
        console.error('Error de conexión:', error);
        alert('No se pudo conectar con el servidor de pagos. Revisa tu conexión o inténtalo más tarde.');
        
        // Restaurar el botón en caso de error
        if (btnComprar) {
            btnComprar.disabled = false;
            btnComprar.classList.remove('loading');
            btnComprar.innerHTML = 'Proceder al Pago';
            btnComprar.style.cursor = 'pointer';
        }
    }
}


// --- EVENT LISTENERS ---

document.addEventListener('DOMContentLoaded', () => {
    // Cargar el carrito en cuanto la página esté lista
    if (document.getElementById('carrito-productos')) {
        cargarCarrito();
    }
    
    // Listener para el botón principal de pago
    const btnComprar = document.getElementById('btn-comprar');
    if (btnComprar) {
        btnComprar.addEventListener('click', (evento) => {
            evento.preventDefault(); // Prevenir cualquier acción por defecto
            procesarPagoConStripe();
        });
    }

    // Actualizar contador en toda la web si otra pestaña modifica el carrito
    window.addEventListener('storage', (e) => {
        if (e.key === 'carrito') {
            actualizarContadorCarrito();
            // Si estamos en la página del carrito, la recargamos para ver cambios
            if (document.getElementById('carrito-productos')) {
                cargarCarrito();
            }
        }
    });
    
    // Asegurarse de que el contador esté siempre actualizado al cargar cualquier página
    actualizarContadorCarrito();
});
