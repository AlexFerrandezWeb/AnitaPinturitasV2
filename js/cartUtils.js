// Utilidades del carrito compartidas entre todas las páginas
(function() {
    'use strict';
    
    // Función para actualizar el contador del carrito
    window.updateCartCount = function() {
        const cart = JSON.parse(localStorage.getItem('cart')) || [];
        const cartCount = document.querySelector('.nav__cart-count');
        
        if (cartCount) {
            const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
            cartCount.textContent = totalItems;
            cartCount.setAttribute('aria-label', `${totalItems} productos en carrito`);
        }
    };
    
    // Función para añadir productos al carrito
    window.addToCart = function(productoId, nombre, precio, imagen, cantidad = 1) {
        console.log('addToCart llamada con:', {productoId, nombre, precio, imagen, cantidad});
        
        // Asegurar que precio sea un número
        const precioNum = typeof precio === 'string' ? parseFloat(precio) : precio;
        
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
        
        // Buscar si el producto ya existe
        const existingItem = cart.find(item => item.id === productoId);
        
        if (existingItem) {
            // Si existe, aumentar la cantidad
            console.log('Producto existente, añadiendo cantidad:', cantidad);
            existingItem.quantity += cantidad;
        } else {
            // Si no existe, añadir nuevo producto
            console.log('Nuevo producto, cantidad inicial:', cantidad);
            cart.push({
                id: productoId,
                nombre: nombre,
                precio: precioNum,
                imagen: imagen,
                quantity: cantidad
            });
        }
        
        // Guardar en localStorage
        localStorage.setItem('cart', JSON.stringify(cart));
        
        // Actualizar contador
        updateCartCount();
        
        // Disparar evento personalizado
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        
        // Trackear AddToCart en Meta Pixel
        if (typeof window.trackAddToCart === 'function') {
            window.trackAddToCart(productoId, nombre, precioNum, cantidad);
        }
        
        // Notificar al carrito si existe
        if (typeof window.renderCart === 'function') {
            setTimeout(() => {
                window.renderCart();
            }, 100);
        }
        
        return true;
    };
    
    // Actualizar contador al cargar
    document.addEventListener('DOMContentLoaded', function() {
        updateCartCount();
        
        // Escuchar cambios en el localStorage
        window.addEventListener('storage', function(e) {
            if (e.key === 'cart') {
                updateCartCount();
            }
        });
    });
})();

