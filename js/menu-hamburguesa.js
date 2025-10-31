// Funcionalidad del menú hamburguesa
document.addEventListener('DOMContentLoaded', function() {
    const menuButton = document.querySelector('.nav__menu');
    const mobileMenu = document.querySelector('.mobile-menu');
    const closeButton = document.querySelector('.mobile-menu__close');
    const overlay = document.querySelector('.mobile-menu__overlay');

    // Abrir menú
    menuButton.addEventListener('click', function() {
        mobileMenu.classList.add('is-open');
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
        menuButton.setAttribute('aria-expanded', 'true');
    });

    // Cerrar menú
    function closeMenu() {
        mobileMenu.classList.remove('is-open');
        document.body.style.overflow = ''; // Restaurar scroll del body
        menuButton.setAttribute('aria-expanded', 'false');
    }

    closeButton.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Cerrar con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
            closeMenu();
        }
    });
});
