// Carrusel de Testimonios con Auto-pase
document.addEventListener('DOMContentLoaded', function() {
    const carousel = document.querySelector('.hero__testimonials-carousel');
    const track = document.querySelector('.hero__testimonials-track');
    const testimonials = document.querySelectorAll('.hero__testimonial');
    const dots = document.querySelectorAll('.hero__testimonials-dot');
    
    if (!carousel || !track || testimonials.length === 0) return;
    
    let currentIndex = 0;
    const totalTestimonials = testimonials.length;
    let autoSlideInterval;
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let initialTransform = 0;
    
    // Función para actualizar la posición del carrusel
    function updateCarousel() {
        const translateX = -currentIndex * 100;
        track.style.transform = `translateX(${translateX}%)`;
        
        // Actualizar puntos de navegación
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentIndex);
        });
        
        // Forzar reflow para asegurar el centrado
        track.offsetHeight;
    }
    
    // Función para ir a un testimonio específico
    function goToSlide(index) {
        currentIndex = index;
        updateCarousel();
    }
    
    // Función para pasar al siguiente testimonio automáticamente
    function nextSlide() {
        currentIndex = (currentIndex + 1) % totalTestimonials;
        updateCarousel();
    }
    
    // Función para iniciar el auto-pase
    function startAutoSlide() {
        autoSlideInterval = setInterval(nextSlide, 7000); // 7 segundos
    }
    
    // Función para detener el auto-pase
    function stopAutoSlide() {
        clearInterval(autoSlideInterval);
    }
    
    // Función para reiniciar el auto-pase
    function restartAutoSlide() {
        stopAutoSlide();
        startAutoSlide();
    }
    
    // Función para manejar el inicio del drag/swipe
    function handleStart(e) {
        isDragging = true;
        stopAutoSlide();
        
        if (e.type === 'mousedown') {
            startX = e.clientX;
        } else if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
        }
        
        initialTransform = -currentIndex * 100;
        track.style.transition = 'none';
    }
    
    // Función para manejar el movimiento del drag/swipe
    function handleMove(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        
        if (e.type === 'mousemove') {
            currentX = e.clientX;
        } else if (e.type === 'touchmove') {
            currentX = e.touches[0].clientX;
        }
        
        const diffX = currentX - startX;
        const translateX = initialTransform + (diffX / carousel.offsetWidth) * 100;
        
        track.style.transform = `translateX(${translateX}%)`;
    }
    
    // Función para manejar el final del drag/swipe
    function handleEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        track.style.transition = 'transform 0.5s ease-in-out';
        
        const diffX = currentX - startX;
        const threshold = carousel.offsetWidth * 0.2; // 20% del ancho como umbral
        
        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe hacia la derecha - testimonio anterior
                currentIndex = (currentIndex - 1 + totalTestimonials) % totalTestimonials;
            } else {
                // Swipe hacia la izquierda - testimonio siguiente
                currentIndex = (currentIndex + 1) % totalTestimonials;
            }
        }
        
        updateCarousel();
        restartAutoSlide();
    }
    
    // Navegación con clics en el carrusel
    carousel.addEventListener('click', function(e) {
        const rect = carousel.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const carouselWidth = rect.width;
        
        if (clickX < carouselWidth / 2) {
            // Click en la mitad izquierda - testimonio anterior
            currentIndex = (currentIndex - 1 + totalTestimonials) % totalTestimonials;
        } else {
            // Click en la mitad derecha - testimonio siguiente
            currentIndex = (currentIndex + 1) % totalTestimonials;
        }
        
        updateCarousel();
        restartAutoSlide(); // Reiniciar auto-pase después de navegación manual
    });
    
    // Navegación con puntos
    dots.forEach((dot, index) => {
        dot.addEventListener('click', function(e) {
            e.stopPropagation();
            goToSlide(index);
            restartAutoSlide(); // Reiniciar auto-pase después de navegación manual
        });
    });
    
    // Navegación con teclado
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            currentIndex = (currentIndex - 1 + totalTestimonials) % totalTestimonials;
            updateCarousel();
            restartAutoSlide(); // Reiniciar auto-pase después de navegación manual
        } else if (e.key === 'ArrowRight') {
            currentIndex = (currentIndex + 1) % totalTestimonials;
            updateCarousel();
            restartAutoSlide(); // Reiniciar auto-pase después de navegación manual
        }
    });
    
    // Pausar auto-pase al hacer hover
    carousel.addEventListener('mouseenter', stopAutoSlide);
    carousel.addEventListener('mouseleave', startAutoSlide);
    
    // Event listeners para scroll lateral (mouse)
    carousel.addEventListener('mousedown', handleStart);
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    
    // Event listeners para scroll lateral (touch)
    carousel.addEventListener('touchstart', handleStart, { passive: false });
    carousel.addEventListener('touchmove', handleMove, { passive: false });
    carousel.addEventListener('touchend', handleEnd);
    
    // Prevenir selección de texto durante el drag
    carousel.addEventListener('selectstart', function(e) {
        e.preventDefault();
    });
    
    // Inicializar carrusel
    updateCarousel();
    startAutoSlide(); // Iniciar auto-pase automáticamente
});
