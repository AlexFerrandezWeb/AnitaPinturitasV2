// Botón flotante "Volver arriba" para las páginas de catálogo largas.
// Aparece al bajar y desaparece cerca del inicio.
document.addEventListener('DOMContentLoaded', function () {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'volver-arriba';
    btn.setAttribute('aria-label', 'Volver arriba');
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(btn);

    const MOSTRAR_DESDE = 500; // px de scroll a partir de los que aparece
    function toggle() {
        if (window.scrollY > MOSTRAR_DESDE) {
            btn.classList.add('is-visible');
        } else {
            btn.classList.remove('is-visible');
        }
    }

    window.addEventListener('scroll', toggle, { passive: true });
    toggle();

    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
