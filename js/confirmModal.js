// Modal de confirmación para eliminar productos
(function() {
    'use strict';
    
    // Crear el HTML del modal
    function createConfirmModal() {
        const modalHTML = `
            <div class="confirm-modal" id="confirm-modal">
                <div class="confirm-modal__content">
                    <div class="confirm-modal__header">
                        <div class="confirm-modal__icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                        </div>
                        <h3 class="confirm-modal__title">¿Eliminar producto?</h3>
                    </div>
                    
                    <p class="confirm-modal__message">
                        ¿Estás seguro de que quieres eliminar este producto del carrito?
                    </p>
                    
                    <div class="confirm-modal__product" id="confirm-product-info">
                        <!-- Información del producto se insertará aquí -->
                    </div>
                    
                    <div class="confirm-modal__actions">
                        <button class="confirm-modal__btn confirm-modal__btn--cancel" id="confirm-cancel">
                            Cancelar
                        </button>
                        <button class="confirm-modal__btn confirm-modal__btn--confirm" id="confirm-delete">
                            Eliminar
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
    
    // Mostrar modal de confirmación
    window.showRemoveConfirmation = function(productId, productName, productImage, productPrice, productQuantity, onConfirm) {
        let modal = document.getElementById('confirm-modal');
        
        // Crear modal si no existe
        if (!modal) {
            createConfirmModal();
            modal = document.getElementById('confirm-modal');
        }
        
        // Actualizar información del producto
        const productInfo = document.getElementById('confirm-product-info');
        productInfo.innerHTML = `
            <img src="${productImage}" alt="${productName}" class="confirm-modal__product-image">
            <div class="confirm-modal__product-info">
                <div class="confirm-modal__product-name">${productName}</div>
                <div class="confirm-modal__product-details">
                    Cantidad: ${productQuantity} • Precio: ${productPrice.toFixed(2)}€
                </div>
            </div>
        `;
        
        // Configurar botones
        const cancelBtn = document.getElementById('confirm-cancel');
        const confirmBtn = document.getElementById('confirm-delete');
        
        // Función para cerrar modal
        function closeModal() {
            modal.classList.remove('show');
        }
        
        // Función para confirmar eliminación
        function confirmDelete() {
            closeModal();
            if (onConfirm) {
                onConfirm(productId);
            }
        }
        
        // Limpiar eventos anteriores
        cancelBtn.replaceWith(cancelBtn.cloneNode(true));
        confirmBtn.replaceWith(confirmBtn.cloneNode(true));
        
        // Obtener referencias actualizadas
        const newCancelBtn = document.getElementById('confirm-cancel');
        const newConfirmBtn = document.getElementById('confirm-delete');
        
        // Añadir eventos
        newCancelBtn.addEventListener('click', closeModal);
        newConfirmBtn.addEventListener('click', confirmDelete);
        
        // Cerrar con Escape
        function handleEscape(e) {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        }
        document.addEventListener('keydown', handleEscape);
        
        // Cerrar al hacer clic fuera del modal
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
        
        // Mostrar modal
        modal.classList.add('show');
    };
    
    // Inicializar cuando el DOM esté listo
    document.addEventListener('DOMContentLoaded', function() {
        // El modal se crea dinámicamente cuando se necesita
    });
})();
