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

    /**
     * Normaliza datos PII (email, firstName, lastName, phone) antes de enviar al backend.
     * Esto facilita el hasheo del lado del servidor.
     */
    function normalizePII(data) {
        const normalized = {};
        if (data.email) {
            normalized.email = data.email.toLowerCase().trim();
        }
        if (data.firstName) {
            normalized.firstName = data.firstName.toLowerCase().trim().replace(/\s+/g, ' ');
        }
        if (data.lastName) {
            normalized.lastName = data.lastName.toLowerCase().trim().replace(/\s+/g, ' ');
        }
        if (data.phone) {
            // CRÍTICO: Limpiar el número de teléfono para que sólo contenga dígitos (ej. "34666112233")
            normalized.phone = data.phone.replace(/\D/g, '');
        }
        return normalized;
    }

    /**
     * Recopila todos los datos de conexión necesarios para CAPI.
     * Captura cookies _fbc y _fbp, userAgent y otros datos esenciales.
     * @param {object} piiData - Datos de PII (email, name, etc.) si están disponibles.
     * @returns {object} - Payload base para enviar al servidor.
     */
    function getCapiPayload(piiData = {}) {
        // 1. Capturar cookies _fbc y _fbp (esenciales para calidad de coincidencia)
        const fbc = getCookie('_fbc');
        const fbp = getCookie('_fbp');

        // 2. Capturar User Agent (navegador del usuario)
        const userAgent = navigator.userAgent;

        // 3. Obtener URL actual
        const sourceUrl = window.location.href;

        // 4. Normalizar PII antes de enviar
        const normalizedPII = normalizePII(piiData);
        
        // 5. Crear un objeto base con los datos de contexto (fbc, fbp, userAgent, sourceUrl)
        // y mezclar con los PII normalizados.
        const basePayload = {
            // Datos de conexión (clave para ViewContent y AddToCart)
            fbc: fbc,
            fbp: fbp,
            userAgent: userAgent,
            sourceUrl: sourceUrl,
            
            // Datos de PII normalizados
            ...normalizedPII,
        };
        
        // El resto de datos de eventos (value, currency, eventId, eventName, eventDetails, etc.) se agregan desde piiData, 
        // pero se eliminan los campos PII originales para evitar sobrescribir los normalizados.
        const eventDataCopy = { ...piiData };
        delete eventDataCopy.email;
        delete eventDataCopy.firstName;
        delete eventDataCopy.lastName;
        delete eventDataCopy.phone;

        return {
            ...basePayload,
            ...eventDataCopy, // Mantener campos de evento (value, currency, etc.)
        };
    }

    // Función para trackear evento tanto en Pixel como en CAPI
    function trackEvent(eventName, eventData = {}, pixelData = {}) {
        // Generar ID único del evento
        const eventId = generateEventId(eventName);

        // Construir eventDetails estructurado para el backend
        // Este objeto se enviará directamente como custom_data en CAPI
        const eventDetails = {};
        
        // Copiar campos relevantes de pixelData a eventDetails
        if (pixelData.value !== undefined && pixelData.value !== null) {
            eventDetails.value = parseFloat(pixelData.value).toFixed(2);
        }
        if (pixelData.currency) {
            eventDetails.currency = pixelData.currency;
        }
        if (pixelData.content_name) {
            eventDetails.content_name = pixelData.content_name;
        }
        if (pixelData.content_ids && Array.isArray(pixelData.content_ids)) {
            eventDetails.content_ids = pixelData.content_ids;
        }
        if (pixelData.content_category) {
            eventDetails.content_category = pixelData.content_category;
        }
        if (pixelData.content_type) {
            eventDetails.content_type = pixelData.content_type;
        }
        if (pixelData.contents && Array.isArray(pixelData.contents)) {
            eventDetails.contents = pixelData.contents;
        }
        if (pixelData.quantity !== undefined) {
            eventDetails.quantity = pixelData.quantity;
        }
        if (pixelData.num_items !== undefined) {
            eventDetails.num_items = pixelData.num_items;
        }
        if (pixelData.search_string) {
            eventDetails.search_string = pixelData.search_string;
        }

        // Construir payload base con datos de conexión y eventDetails
        const basePayload = getCapiPayload({
            eventName: eventName,
            email: eventData.email || null,
            phone: eventData.phone || null,
            firstName: eventData.firstName || null,
            lastName: eventData.lastName || null,
            eventId: eventId,
            eventDetails: eventDetails // ✅ Enviar eventDetails estructurado
        });

        // 1. Disparar Pixel en frontend (si está disponible)
        if (typeof fbq === 'function') {
            fbq('track', eventName, pixelData, { eventID: eventId });
        }

        // 2. Enviar evento a backend (CAPI) con todos los datos de conexión
        const backendUrl = getBackendUrl();
        
        fetch(`${backendUrl}/api/track-event`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(basePayload)
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
    window.trackViewContent = function(productId, productName, productPrice, productCategory = null) {
        const pixelData = {
            content_name: productName,
            content_ids: productId ? [productId] : null,
            content_type: 'product',
            value: productPrice || null,
            currency: 'EUR'
        };
        
        // Añadir content_category si está disponible
        if (productCategory) {
            pixelData.content_category = productCategory;
        }
        
        trackEvent('ViewContent', {
            contentName: productName,
            contentIds: productId ? [productId] : null,
            contentCategory: productCategory || null,
            value: productPrice || null
        }, pixelData);
    };

    // AddToCart: Agregar al carrito
    window.trackAddToCart = function(productId, productName, productPrice, quantity = 1) {
        const totalValue = productPrice * quantity;
        
        // Estructura contents para Dynamic Product Ads (DPA)
        const contents = [{
            id: productId.toString(),
            quantity: quantity,
            item_price: parseFloat(productPrice).toFixed(2)
        }];
        
        trackEvent('AddToCart', {
            contentName: productName,
            contentIds: productId ? [productId] : null,
            value: totalValue,
            currency: 'EUR'
        }, {
            content_name: productName,
            content_ids: productId ? [productId] : null,
            content_type: 'product',
            value: totalValue,
            currency: 'EUR',
            quantity: quantity,
            contents: contents // ✅ Estructura contents para DPA
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
        
        // Estructura contents para Dynamic Product Ads (DPA)
        const contents = cartItems.map(item => ({
            id: (item.id || item.productId || '').toString(),
            quantity: item.cantidad || item.quantity || 1,
            item_price: parseFloat(item.precio || item.price || 0).toFixed(2)
        })).filter(item => item.id);
        
        trackEvent('InitiateCheckout', {
            value: cartValue,
            currency: 'EUR',
            contentIds: contentIds.length > 0 ? contentIds : null
        }, {
            value: cartValue,
            currency: 'EUR',
            content_type: 'product',
            content_ids: contentIds.length > 0 ? contentIds : null,
            num_items: cartItems.length,
            contents: contents // ✅ Estructura contents para DPA
        });
    };

    // Purchase: Compra completada (ya implementado en success.html, pero aquí para referencia)
    window.trackPurchase = function(email, phone, firstName, lastName, value, cartItems = []) {
        const contentIds = cartItems.length > 0 
            ? cartItems.map(item => item.id || item.productId).filter(Boolean)
            : null;
        
        // Estructura contents para Dynamic Product Ads (DPA)
        const contents = cartItems.length > 0
            ? cartItems.map(item => ({
                id: (item.id || item.productId || '').toString(),
                quantity: item.cantidad || item.quantity || 1,
                item_price: parseFloat(item.precio || item.price || 0).toFixed(2)
            })).filter(item => item.id)
            : [];
        
        const pixelData = {
            value: value,
            currency: 'EUR'
        };
        
        if (contentIds && contentIds.length > 0) {
            pixelData.content_ids = contentIds;
            pixelData.content_type = 'product';
        }
        
        if (contents.length > 0) {
            pixelData.contents = contents;
        }
        
        trackEvent('Purchase', {
            email: email,
            phone: phone,
            firstName: firstName,
            lastName: lastName,
            value: value,
            currency: 'EUR'
        }, pixelData);
    };

    console.log('✅ Meta Pixel Tracking utilities cargadas');
})();

