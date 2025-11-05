// Utilidades para trackear eventos de Meta Pixel (frontend + CAPI)
(function() {
    'use strict';

    // Función para leer cookies
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    // Función para generar un ID de evento único
    function generateEventId(eventName) {
        return `${eventName.toLowerCase()}_${new Date().getTime()}_${Math.random().toString(36).substring(2)}`;
    }

    // Función para obtener la URL del backend
    function getBackendUrl() {
        return window.location.origin;
    }

    // Función para trackear evento tanto en Pixel como en CAPI
    function trackEvent(eventName, eventData = {}, pixelData = {}) {
        // Generar ID único del evento
        const eventId = generateEventId(eventName);

        // Leer cookies de Meta
        const fbc = getCookie('_fbc');
        const fbp = getCookie('_fbp');

        // Obtener URL actual
        const sourceUrl = window.location.href;

        // 1. Disparar Pixel en frontend (si está disponible)
        if (typeof fbq === 'function') {
            fbq('track', eventName, pixelData, { eventID: eventId });
        }

        // 2. Enviar evento a backend (CAPI)
        const backendUrl = getBackendUrl();
        
        fetch(`${backendUrl}/api/track-event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eventName: eventName,
                email: eventData.email || null,
                phone: eventData.phone || null,
                firstName: eventData.firstName || null,
                lastName: eventData.lastName || null,
                value: eventData.value || null,
                currency: eventData.currency || 'EUR',
                contentName: eventData.contentName || null,
                contentIds: eventData.contentIds || null,
                searchString: eventData.searchString || null,
                fbc: fbc,
                fbp: fbp,
                eventId: eventId,
                sourceUrl: sourceUrl
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.tracked) {
                console.log(`✅ Evento ${eventName} trackeado en Meta correctamente (CAPI)`);
            } else {
                console.log(`⚠️ Evento ${eventName} recibido pero no trackeado:`, result.message);
            }
        })
        .catch(error => {
            console.error(`Error al trackear evento ${eventName} en Meta:`, error);
            // No interrumpir la experiencia del usuario si falla el tracking
        });
    }

    // Funciones específicas para cada tipo de evento

    // ViewContent: Ver contenido (página de producto)
    window.trackViewContent = function(productId, productName, productPrice) {
        trackEvent('ViewContent', {
            contentName: productName,
            contentIds: productId ? [productId] : null,
            value: productPrice || null
        }, {
            content_name: productName,
            content_ids: productId ? [productId] : null,
            value: productPrice || null,
            currency: 'EUR'
        });
    };

    // AddToCart: Agregar al carrito
    window.trackAddToCart = function(productId, productName, productPrice, quantity = 1) {
        const totalValue = productPrice * quantity;
        trackEvent('AddToCart', {
            contentName: productName,
            contentIds: productId ? [productId] : null,
            value: totalValue,
            currency: 'EUR'
        }, {
            content_name: productName,
            content_ids: productId ? [productId] : null,
            value: totalValue,
            currency: 'EUR',
            quantity: quantity
        });
    };

    // Search: Búsqueda realizada
    window.trackSearch = function(searchTerm) {
        trackEvent('Search', {
            searchString: searchTerm
        }, {
            search_string: searchTerm
        });
    };

    // Contact: Contactar (WhatsApp, email, etc.)
    window.trackContact = function(contactMethod = 'whatsapp') {
        trackEvent('Contact', {}, {
            content_name: `Contact via ${contactMethod}`
        });
    };

    // InitiateCheckout: Iniciar proceso de pago
    window.trackInitiateCheckout = function(cartValue, cartItems = []) {
        const contentIds = cartItems.map(item => item.id || item.productId).filter(Boolean);
        trackEvent('InitiateCheckout', {
            value: cartValue,
            currency: 'EUR',
            contentIds: contentIds.length > 0 ? contentIds : null
        }, {
            value: cartValue,
            currency: 'EUR',
            content_ids: contentIds.length > 0 ? contentIds : null,
            num_items: cartItems.length
        });
    };

    // Purchase: Compra completada (ya implementado en success.html, pero aquí para referencia)
    window.trackPurchase = function(email, phone, firstName, lastName, value) {
        trackEvent('Purchase', {
            email: email,
            phone: phone,
            firstName: firstName,
            lastName: lastName,
            value: value,
            currency: 'EUR'
        }, {
            value: value,
            currency: 'EUR'
        });
    };

    console.log('✅ Meta Pixel Tracking utilities cargadas');
})();

