// Navegación - Menú hamburguesa y buscador
document.addEventListener('DOMContentLoaded', function() {
    const menuButton = document.querySelector('.nav__menu');
    const menuClose = document.querySelector('.mobile-menu__close');
    const mobileMenu = document.querySelector('.mobile-menu');

    // Abrir menú hamburguesa
    if (menuButton) {
        menuButton.addEventListener('click', function() {
            mobileMenu.classList.add('is-open');
            menuButton.setAttribute('aria-expanded', 'true');
        });
    }

    // Cerrar menú hamburguesa
    if (menuClose) {
        menuClose.addEventListener('click', function() {
            mobileMenu.classList.remove('is-open');
            menuButton.setAttribute('aria-expanded', 'false');
        });
    }

    // Cerrar menú con overlay
    const overlay = document.querySelector('.mobile-menu__overlay');
    if (overlay) {
        overlay.addEventListener('click', function() {
            mobileMenu.classList.remove('is-open');
            menuButton.setAttribute('aria-expanded', 'false');
        });
    }

    // La lupa ya no despliega la barra: ahora es un enlace al catalogo, que es
    // un buscador con filtros y con las 183 fichas detras. La barra desplegable
    // y buscador.js se retiraron; .search-bar sigue en el marcado pero nunca
    // recibe .is-visible, asi que queda plegada.

    // Nav vidriera al hacer scroll, sólido tras 1.5s de inactividad
    const nav = document.querySelector('.nav');
    if (nav) {
        let idleTimer = null;

        function resetIdleTimer() {
            clearTimeout(idleTimer);
            // Arriba del todo el nav va solido: en la home la primera seccion
            // es la foto de la cabina y en vidriera se transparentaba encima
            if (window.scrollY <= 10) {
                nav.classList.remove('nav--transparent');
                return;
            }
            nav.classList.add('nav--transparent');
            idleTimer = setTimeout(function() {
                nav.classList.remove('nav--transparent');
            }, 1500);
        }

        resetIdleTimer();
        window.addEventListener('scroll', resetIdleTimer, { passive: true });
    }

});





