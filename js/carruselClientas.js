// Carrusel de Clientes Satisfechas - Completamente Automático
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.querySelector('.hero__clients-carousel');
    const track = document.querySelector('.hero__clients-track');
    const clientImages = document.querySelectorAll('.hero__client-image');
    
    if (!carousel || !track || clientImages.length === 0) return;
    
    // Deshabilitar todas las interacciones
    carousel.style.pointerEvents = 'none';
    
    // Asegurar que la animación siempre esté corriendo
    track.style.animationPlayState = 'running';
    
    // Forzar que no se pueda pausar
    track.style.animationPlayState = 'running !important';
});
