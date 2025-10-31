// Navegación - Menú hamburguesa y buscador
document.addEventListener('DOMContentLoaded', function() {
    const menuButton = document.querySelector('.nav__menu');
    const menuClose = document.querySelector('.mobile-menu__close');
    const mobileMenu = document.querySelector('.mobile-menu');
    const searchToggle = document.querySelector('.nav__search-toggle');
    const searchBar = document.querySelector('.search-bar');

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

    // Toggle buscador
    if (searchToggle && searchBar) {
        searchToggle.addEventListener('click', function() {
            const isVisible = searchBar.classList.contains('is-visible');
            
            if (isVisible) {
                searchBar.classList.remove('is-visible');
                searchToggle.setAttribute('aria-expanded', 'false');
            } else {
                searchBar.classList.add('is-visible');
                searchToggle.setAttribute('aria-expanded', 'true');
                // Focus al input cuando se abre
                const searchInput = searchBar.querySelector('.search-bar__input');
                if (searchInput) {
                    setTimeout(() => searchInput.focus(), 300);
                }
            }
        });
    }

    // Cerrar buscador al hacer scroll
    window.addEventListener('scroll', function() {
        if (searchBar && searchBar.classList.contains('is-visible')) {
            searchBar.classList.remove('is-visible');
            if (searchToggle) {
                searchToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });
});





