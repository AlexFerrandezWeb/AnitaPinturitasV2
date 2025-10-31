// Animación de producto volando al carrito
(function() {
    'use strict';
    
    // Función para crear la animación de vuelo
    window.createFlyToCartAnimation = function(productImage, onComplete) {
        // Obtener elementos necesarios
        const cartIcon = document.querySelector('.nav__cart');
        
        // Si productImage es un string (selector), buscarlo; si es un elemento, usarlo directamente
        const productImg = typeof productImage === 'string' 
            ? document.querySelector(productImage || '#producto-img-principal')
            : productImage;
        
        if (!cartIcon || !productImg) {
            console.warn('No se encontraron los elementos necesarios para la animación');
            if (onComplete) onComplete();
            return;
        }
        
        // Crear imagen voladora
        const flyingImg = document.createElement('img');
        flyingImg.src = productImg.src;
        flyingImg.className = 'product-fly-animation';
        
        // Obtener posiciones
        const productRect = productImg.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();
        
        // Posicionar imagen inicial
        flyingImg.style.left = productRect.left + 'px';
        flyingImg.style.top = productRect.top + 'px';
        
        // Añadir al DOM
        document.body.appendChild(flyingImg);
        
        // Crear partículas (efecto adicional)
        createParticles(productRect.left + productRect.width/2, productRect.top + productRect.height/2);
        
        // Iniciar animación después de un frame
        requestAnimationFrame(() => {
            // Calcular posición final (centro del carrito)
            const finalX = cartRect.left + cartRect.width/2 - 30; // 30 = mitad del ancho de la imagen voladora
            const finalY = cartRect.top + cartRect.height/2 - 30;
            
            // Aplicar transformación
            flyingImg.style.left = finalX + 'px';
            flyingImg.style.top = finalY + 'px';
            flyingImg.classList.add('flying');
            
            // Animar carrito
            cartIcon.classList.add('cart-pulse');
            
            // Limpiar después de la animación
            setTimeout(() => {
                if (flyingImg.parentNode) {
                    flyingImg.parentNode.removeChild(flyingImg);
                }
                cartIcon.classList.remove('cart-pulse');
                
                // Animar contador
                const cartCount = document.querySelector('.nav__cart-count');
                if (cartCount) {
                    cartCount.classList.add('count-bounce');
                    setTimeout(() => {
                        cartCount.classList.remove('count-bounce');
                    }, 500);
                }
                
                if (onComplete) onComplete();
            }, 800);
        });
    };
    
    // Función para crear partículas
    function createParticles(x, y) {
        const particleCount = 6;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'cart-particle';
            
            // Posición aleatoria alrededor del punto
            const offsetX = (Math.random() - 0.5) * 40;
            const offsetY = (Math.random() - 0.5) * 40;
            
            particle.style.left = (x + offsetX) + 'px';
            particle.style.top = (y + offsetY) + 'px';
            
            document.body.appendChild(particle);
            
            // Limpiar partícula después de la animación
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }
    
    // Función para crear animación desde un botón específico
    window.createFlyToCartAnimationFromButton = function(buttonElement, imageSrc, onComplete) {
        // Obtener elementos necesarios
        const cartIcon = document.querySelector('.nav__cart');
        
        if (!cartIcon || !buttonElement) {
            console.warn('No se encontraron los elementos necesarios para la animación');
            if (onComplete) onComplete();
            return;
        }
        
        // Crear imagen voladora
        const flyingImg = document.createElement('img');
        flyingImg.src = imageSrc;
        flyingImg.className = 'product-fly-animation';
        
        // Obtener posiciones del botón y carrito
        const buttonRect = buttonElement.getBoundingClientRect();
        const cartRect = cartIcon.getBoundingClientRect();
        
        // Posicionar imagen inicial en el centro del botón
        flyingImg.style.left = (buttonRect.left + buttonRect.width/2 - 30) + 'px';
        flyingImg.style.top = (buttonRect.top + buttonRect.height/2 - 30) + 'px';
        
        // Añadir al DOM
        document.body.appendChild(flyingImg);
        
        // Crear partículas desde el botón
        createParticles(
            buttonRect.left + buttonRect.width/2, 
            buttonRect.top + buttonRect.height/2
        );
        
        // Iniciar animación después de un frame
        requestAnimationFrame(() => {
            // Calcular posición final (centro del carrito)
            const finalX = cartRect.left + cartRect.width/2 - 30;
            const finalY = cartRect.top + cartRect.height/2 - 30;
            
            // Aplicar transformación
            flyingImg.style.left = finalX + 'px';
            flyingImg.style.top = finalY + 'px';
            flyingImg.classList.add('flying');
            
            // Animar carrito
            cartIcon.classList.add('cart-pulse');
            
            // Limpiar después de la animación
            setTimeout(() => {
                if (flyingImg.parentNode) {
                    flyingImg.parentNode.removeChild(flyingImg);
                }
                cartIcon.classList.remove('cart-pulse');
                
                // Animar contador
                const cartCount = document.querySelector('.nav__cart-count');
                if (cartCount) {
                    cartCount.classList.add('count-bounce');
                    setTimeout(() => {
                        cartCount.classList.remove('count-bounce');
                    }, 500);
                }
                
                if (onComplete) onComplete();
            }, 800);
        });
    };
    
    // Función para integrar con el botón de añadir al carrito
    window.setupCartAnimation = function() {
        const addToCartBtn = document.querySelector('#add-to-cart');
        
        if (addToCartBtn) {
            // Interceptar el click para añadir la animación
            addToCartBtn.addEventListener('click', function(e) {
                // La animación se ejecutará después de que se añada el producto
                // Esto se maneja en producto.js
            });
        }
    };
    
    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        setupCartAnimation();
    });
})();
