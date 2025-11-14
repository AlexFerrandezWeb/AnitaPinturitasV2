// Carrito lateral
document.addEventListener('DOMContentLoaded', function() {
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartToggle = document.querySelector('.nav__cart');
    const cartClose = document.querySelector('.cart-sidebar__close');
    const cartOverlay = document.querySelector('.cart-sidebar__overlay');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.querySelector('.cart-total__amount');
    const cartCheckout = document.querySelector('.cart-checkout');
    const cartCount = document.querySelector('.nav__cart-count');

    // Función de utilidad para mostrar mensajes no bloqueantes (Reemplazo de alert())
    // Compatible con Canvas y entornos donde alert() no funciona
    function showUserMessage(message, type = 'error') {
        // Intentar usar un elemento de mensaje si existe en el DOM
        const messageBox = document.getElementById('user-message-box');
        if (messageBox) {
            messageBox.textContent = message;
            messageBox.className = `user-message user-message--${type}`;
            messageBox.classList.add('visible');
            // Auto-ocultar después de 5 segundos
            setTimeout(() => {
                messageBox.classList.remove('visible');
            }, 5000);
            return;
        }

        // Fallback: usar console para depuración (no bloqueante)
        if (type === 'error') {
            console.error('⚠️ Mensaje al usuario:', message);
        } else {
            console.warn('ℹ️ Mensaje al usuario:', message);
        }

        // Si hay un sistema de notificaciones disponible, usarlo
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        }
    }

    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Exponer cart globalmente para actualización desde otras páginas
    window.cartData = cart;

    // Abrir carrito
    if (cartToggle) {
        cartToggle.addEventListener('click', function(e) {
            e.preventDefault();
            cartSidebar.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            
            // Ocultar botón flotante de WhatsApp
            const whatsappButton = document.querySelector('.whatsapp-button');
            if (whatsappButton) {
                whatsappButton.style.display = 'none';
            }
        });
    }

    // Cerrar carrito
    function closeCart() {
        cartSidebar.classList.remove('is-open');
        document.body.style.overflow = '';
        
        // Mostrar botón flotante de WhatsApp
        const whatsappButton = document.querySelector('.whatsapp-button');
        if (whatsappButton) {
            whatsappButton.style.display = 'block';
        }
    }

    if (cartClose) {
        cartClose.addEventListener('click', closeCart);
    }

    if (cartOverlay) {
        cartOverlay.addEventListener('click', closeCart);
    }

    // Cerrar con Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && cartSidebar.classList.contains('is-open')) {
            closeCart();
        }
    });

    // Renderizar carrito
    window.renderCart = function() {
        // Verificar que existan los elementos necesarios
        if (!cartItems) {
            console.error('cartItems no existe en el DOM');
            return;
        }
        
        // Actualizar cart desde localStorage
        cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        console.log('Renderizando carrito con', cart.length, 'productos');
        console.log('Datos del carrito:', cart);
        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div class="cart-empty">
                    <svg class="cart-empty__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16 11V7a4 4 0 10-8 0v4M5 8h14l-1 11H6L5 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>Tu carrito está vacío</p>
                </div>
            `;
            if (cartCheckout) cartCheckout.disabled = true;
            if (cartCount) cartCount.textContent = '0';
            if (cartTotal) cartTotal.textContent = '0.00 €';
            return;
        }

        cartItems.innerHTML = cart.map(item => {
            // Asegurar que precio sea un número
            const precio = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio) || 0;
            
            return `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.imagen}" alt="${item.nombre}" class="cart-item__image">
                <div class="cart-item__details">
                    <h4 class="cart-item__name">${item.nombre}</h4>
                    <p class="cart-item__price">${precio.toFixed(2)} €</p>
                    <div class="cart-item__quantity">
                        <button class="cart-item__qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                        <span class="cart-item__qty">${item.quantity}</span>
                        <button class="cart-item__qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                </div>
                <button class="cart-item__remove" onclick="removeFromCart('${item.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            `;
        }).join('');

        // Calcular total
        const total = cart.reduce((sum, item) => {
            const precio = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio) || 0;
            return sum + (precio * item.quantity);
        }, 0);
        if (cartTotal) cartTotal.textContent = `${total.toFixed(2)} €`;
        if (cartCount) cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
        if (cartCheckout) cartCheckout.disabled = false;
    };

    // La función addToCart se define en cartUtils.js

    // Actualizar cantidad
    window.updateQuantity = function(productoId, change) {
        // Obtener carrito actual del localStorage
        cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        const item = cart.find(item => item.id === productoId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(productoId);
                return;
            }
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart();
        }
    };

    // Eliminar del carrito (con confirmación)
    window.removeFromCart = function(productoId) {
        // Obtener carrito actual del localStorage
        cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Encontrar el producto a eliminar
        const productToRemove = cart.find(item => item.id === productoId);
        
        if (!productToRemove) {
            console.warn('Producto no encontrado en el carrito');
            return;
        }
        
        // Mostrar confirmación si la función está disponible
        if (typeof window.showRemoveConfirmation === 'function') {
            window.showRemoveConfirmation(
                productoId,
                productToRemove.nombre,
                productToRemove.imagen,
                productToRemove.precio,
                productToRemove.quantity,
                function(confirmedProductId) {
                    // Callback de confirmación - eliminar realmente
                    actuallyRemoveFromCart(confirmedProductId);
                }
            );
        } else {
            // Fallback sin confirmación
            actuallyRemoveFromCart(productoId);
        }
    };
    
    // Función interna para eliminar realmente del carrito
    function actuallyRemoveFromCart(productoId) {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
        cart = cart.filter(item => item.id !== productoId);
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
    }

    // Limpiar productos inválidos del carrito
    function cleanInvalidProducts() {
        cart = cart.filter(item => {
            // Validar que el producto tenga los datos necesarios
            const hasValidId = item.id && item.id !== 'undefined' && item.id !== '';
            const hasValidName = item.nombre && item.nombre !== 'undefined' && item.nombre.trim() !== '';
            const hasValidPrice = item.precio !== undefined && item.precio !== null && item.precio !== 0;
            
            return hasValidId && hasValidName && hasValidPrice;
        });
        
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    
    // Limpiar carrito al cargar la página
    cleanInvalidProducts();
    
    // Inicializar carrito
    renderCart();
    
    // Escuchar actualizaciones del carrito desde otras páginas
    window.addEventListener('cartUpdated', function() {
        renderCart();
    });

    // Funcionalidad del botón "Proceder al pago"
    if (cartCheckout) {
        cartCheckout.addEventListener('click', function() {
            proceedToCheckout();
        });
    }

    // Función para proceder al pago con Stripe
    window.proceedToCheckout = function() {
        // Obtener carrito actual
        const currentCart = JSON.parse(localStorage.getItem('cart')) || [];
        
        if (currentCart.length === 0) {
            // Reemplazo de alert() - compatible con Canvas
            showUserMessage('Tu carrito está vacío. Añade productos para proceder al pago.', 'warning');
            return;
        }

        // Calcular total
        const total = currentCart.reduce((sum, item) => {
            const precio = typeof item.precio === 'number' ? item.precio : parseFloat(item.precio) || 0;
            return sum + (precio * item.quantity);
        }, 0);

        // ============================================
        // CONFIGURACIÓN DE STRIPE CHECKOUT
        // ============================================
        // Detectar automáticamente la URL del backend
        // - Producción: mismo origen (Render) => usar window.location.origin
        // - Local: si estás sirviendo estático desde un servidor distinto, puedes definir window.BACKEND_URL en HTML
        // - Fallback dev: localhost:3000
        const origin = (window && window.location && window.location.origin) ? window.location.origin : '';
        const BACKEND_URL = (window && window.BACKEND_URL) ? window.BACKEND_URL
                           : (origin && origin.startsWith('http')) ? origin
                           : 'http://localhost:3000';
        const backendCheckoutUrl = `${BACKEND_URL}/api/create-checkout-session`;
        
        // Construir datos del carrito para enviar
        const cartData = {
            items: currentCart.map(item => ({
                id: item.id,
                nombre: item.nombre,
                precio: typeof item.precio === 'number' ? item.precio : parseFloat(item.precio) || 0,
                cantidad: item.quantity,
                imagen: item.imagen
            })),
            total: total,
            totalFormatted: total.toFixed(2) + ' €'
        };
        
        // Guardar datos del carrito en sessionStorage para referencia
        sessionStorage.setItem('checkoutCart', JSON.stringify(cartData));
        
        // Trackear InitiateCheckout en Meta Pixel
        if (typeof window.trackInitiateCheckout === 'function') {
            window.trackInitiateCheckout(total, currentCart);
        }
        
        // Capturar cookies de Meta para HQC (serán guardadas en metadata de Stripe)
        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }
        const fbc = getCookie('_fbc');
        const fbp = getCookie('_fbp');
        
        // Añadir cookies de Meta a los datos del checkout
        const checkoutPayload = {
            ...cartData,
            ...(fbc && { fbc: fbc }),
            ...(fbp && { fbp: fbp })
        };
        
        // Mostrar indicador de carga
        if (cartCheckout) {
            cartCheckout.disabled = true;
            cartCheckout.textContent = 'Procesando...';
        }
        
        // Crear sesión de checkout en el backend (con cookies de Meta para HQC)
        fetch(backendCheckoutUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(checkoutPayload)
        })
        .then(response => {
            if (!response.ok) {
                // Leer el error del cuerpo si está disponible
                return response.json().then(errorData => {
                    throw new Error(errorData.error || `Error HTTP: ${response.status}`);
                }).catch(() => {
                    // Si no se puede parsear el error, usar el status
                    throw new Error(`Error HTTP: ${response.status}`);
                });
            }
            return response.json();
        })
        .then(data => {
            if (data.checkout_url) {
                // Redirigir a Stripe Checkout
                window.location.href = data.checkout_url;
            } else {
                throw new Error('No se recibió la URL de checkout');
            }
        })
        .catch(error => {
            console.error('Error al crear sesión de checkout:', error);
            // Reemplazo de alert() - compatible con Canvas
            const errorMessage = error.message || 'Error al procesar el pago. Por favor, inténtalo de nuevo.';
            showUserMessage(`${errorMessage}\n\nSi el problema persiste, verifica que el servidor backend esté corriendo.`, 'error');
            
            // Restaurar botón
            if (cartCheckout) {
                cartCheckout.disabled = false;
                cartCheckout.textContent = 'Proceder al pago';
            }
        });
    };
});
