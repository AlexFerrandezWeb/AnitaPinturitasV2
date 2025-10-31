// Funcionalidad del botón WhatsApp flotante
document.addEventListener('DOMContentLoaded', function() {
    const whatsappButton = document.querySelector('.whatsapp-button');
    const whatsappText = document.querySelector('.whatsapp-button__text');
    
    if (whatsappButton && whatsappText) {
        // Iniciar en modo solo logo
        whatsappButton.classList.add('logo-only');
        
        // Función para mostrar texto con transición
        function mostrarTexto(texto) {
            whatsappButton.classList.remove('logo-only');
            whatsappText.textContent = texto;
            whatsappText.classList.add('is-visible');
        }
        
        // Función para ocultar texto con transición
        function ocultarTexto() {
            whatsappText.classList.remove('is-visible');
            // Esperar a que termine la transición antes de encoger el botón
            setTimeout(function() {
                whatsappButton.classList.add('logo-only');
            }, 300);
        }
        
        // Función para volver al estado inicial (solo logo)
        function volverAlInicio() {
            whatsappText.classList.remove('is-visible');
            // Esperar a que termine la transición del texto antes de encoger el botón
            setTimeout(function() {
                whatsappButton.classList.add('logo-only');
                // Limpiar el texto después de encoger el botón
                setTimeout(function() {
                    whatsappText.textContent = '';
                }, 100);
            }, 300);
        }
        
        // Secuencia de animación:
        // 1. Después de 10 segundos: mostrar "¡Hola!"
        setTimeout(function() {
            mostrarTexto('¡Hola!');
        }, 10000);
        
        // 2. Después de 12 segundos (2 segundos más): mostrar "¿Te ayudo?"
        setTimeout(function() {
            mostrarTexto('¿Te ayudo?');
        }, 12000);
        
        // 3. Después de 17 segundos (5 segundos más): volver al estado inicial
        setTimeout(function() {
            volverAlInicio();
        }, 17000);
        
    }
});
