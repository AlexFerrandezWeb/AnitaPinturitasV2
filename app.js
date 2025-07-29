let mostrador = document.getElementById("mostrador");
let seleccion = document.getElementById("seleccion");
let body = document.getElementById("body");
let imgSeleccionada = document.getElementById("img");
let modeloSeleccionado = document.getElementById("modelo");
let precioSeleccionado = document.getElementById("precio");
let aSeleccionado = document.getElementById("a");

// Función que carga la info del item seleccionado 
function cargar(item) {
    quitarBordes();
    body.style.overflow = "hidden";
    mostrador.style.pointerEvents = "none";
    mostrador.style.width = "100%";
    seleccion.style.width = "min(48vh, 60em)";
    mostrador.style.opacity = "0.5";
    seleccion.style.opacity = "1";
    item.style.border = "5px solid pink";

    imgSeleccionada.src = item.getElementsByTagName("img")[0].src;
    modeloSeleccionado.innerHTML = item.getElementsByTagName("p")[0].innerHTML;
    precioSeleccionado.innerHTML = item.getElementsByTagName("span")[0].innerHTML;
    aSeleccionado.href = item.getElementsByTagName("a")[0].href;
}

function quitarBordes() {
    var items = document.getElementsByClassName("item");
    for(i=0;i < items.length; i++) {
        items[i].style.border = "none";
    }
}

function cerrar() {
    body.style.overflow = "";
    mostrador.style.pointerEvents = "";
    mostrador.style.width = "100%";
    seleccion.style.width = "0";
    seleccion.style.opacity = "0";
    mostrador.style.opacity = "1";
    quitarBordes();
}

// Función para manejar el aviso de cookies
function acceptCookies() {
    // Guardar la preferencia del usuario en localStorage
    localStorage.setItem('cookiesAccepted', 'true');
    // Ocultar el banner
    const cookieBanner = document.getElementById('cookieBanner');
    if (cookieBanner) {
        cookieBanner.classList.add('hidden');
    }
}

// Comprobar si el usuario ya ha aceptado las cookies
document.addEventListener('DOMContentLoaded', function() {
    if (localStorage.getItem('cookiesAccepted') === 'true') {
        const cookieBanner = document.getElementById('cookieBanner');
        if (cookieBanner) {
            cookieBanner.classList.add('hidden');
        }
    }
});

// Función para resetear las cookies y mostrar el banner
function resetCookies() {
    localStorage.removeItem('cookiesAccepted');
    const cookieBanner = document.getElementById('cookieBanner');
    if (cookieBanner) {
        cookieBanner.classList.remove('hidden');
    }
}

// Carrusel de acceso rápido
document.addEventListener('DOMContentLoaded', function() {
    const carrusel = document.querySelector('.acceso-grid');
    if (!carrusel) return;
    const slides = document.querySelectorAll('.acceso-item');
    const dots = document.querySelectorAll('.carrusel-dot');
    let currentSlide = 0;
    let slideInterval;
    let isScrolling = false;

    function updateDots() {
        const scrollPosition = carrusel.scrollLeft;
        const slideWidth = carrusel.clientWidth;
        currentSlide = Math.round(scrollPosition / slideWidth);
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function goToSlide(n) {
        const slideWidth = carrusel.clientWidth;
        carrusel.scrollTo({
            left: n * slideWidth,
            behavior: 'smooth'
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        goToSlide(currentSlide);
    }

    // Iniciar el carrusel automático
    function startSlideShow() {
        if (!isScrolling) {
            slideInterval = setInterval(nextSlide, 8000);
        }
    }

    // Detener el carrusel automático
    function stopSlideShow() {
        clearInterval(slideInterval);
    }

    // Event listeners para los dots
    dots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
            stopSlideShow();
            goToSlide(index);
            startSlideShow();
        });
    });

    // Event listeners para el scroll
    carrusel.addEventListener('scroll', () => {
        isScrolling = true;
        stopSlideShow();
        updateDots();
        
        // Reiniciar el temporizador después de que el usuario deje de hacer scroll
        clearTimeout(carrusel.scrollTimeout);
        carrusel.scrollTimeout = setTimeout(() => {
            isScrolling = false;
            startSlideShow();
        }, 2000);
    });

    // Pausar el carrusel cuando el mouse está sobre él
    carrusel.addEventListener('mouseenter', stopSlideShow);
    carrusel.addEventListener('mouseleave', startSlideShow);

    // Iniciar el carrusel
    startSlideShow();
});

// Función para actualizar el contador del carrito
function actualizarContadorCarrito() {
    try {
        const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
        // Calcular el total de unidades sumando las cantidades
        const totalUnidades = carrito.reduce((total, producto) => total + (producto.cantidad || 1), 0);
        
        // Actualizar todos los contadores
        document.querySelectorAll('.carrito-cantidad').forEach(element => {
            element.textContent = totalUnidades;
        });
    } catch (error) {
        console.error('Error al actualizar el contador del carrito:', error);
    }
}

// Actualizar el contador cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    actualizarContadorCarrito();
});

// Actualizar el contador cuando cambia el localStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'carrito') {
        actualizarContadorCarrito();
    }
});

// Actualizar el contador cuando se modifica el localStorage en la misma ventana
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    if (key === 'carrito') {
        actualizarContadorCarrito();
    }
};