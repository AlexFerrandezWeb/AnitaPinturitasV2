// Carrusel de reseñas de la home.
// Desplazamiento continuo de derecha a izquierda con requestAnimationFrame:
// permite pausar en hover, arrastrar con el dedo y respetar prefers-reduced-motion,
// cosas que con una animación CSS pura quedan a medias.
//
// initReviewsCarousel() es global a propósito: js/googleReviews.js la llama
// después de repoblar las tarjetas con la API, para rehacer clones y medidas.

(function () {
    const SPEED = 25;              // píxeles por segundo
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let track = null;
    let viewport = null;
    let frameId = null;
    let offset = 0;
    let loopWidth = 0;
    let lastTime = 0;
    let paused = false;
    let dragging = false;
    let dragStartX = 0;
    let dragStartOffset = 0;

    function removeClones() {
        track.querySelectorAll('[data-carousel-clone]').forEach(node => node.remove());
    }

    function originals() {
        return Array.from(track.children).filter(node => !node.hasAttribute('data-carousel-clone'));
    }

    // Duplica las tarjetas hasta cubrir el doble del ancho visible. Así, al saltar
    // hacia atrás un ciclo completo, lo que aparece es idéntico y el salto no se ve.
    function buildClones(cards) {
        const needed = Math.max(1, Math.ceil((viewport.offsetWidth * 2) / Math.max(1, trackWidth(cards))));
        for (let copy = 0; copy < needed; copy++) {
            cards.forEach(card => {
                const clone = card.cloneNode(true);
                clone.setAttribute('data-carousel-clone', '');
                clone.setAttribute('aria-hidden', 'true');
                track.appendChild(clone);
            });
        }
    }

    function trackWidth(cards) {
        return cards.reduce((total, card) => total + card.offsetWidth, 0) + gap() * cards.length;
    }

    function gap() {
        const value = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap);
        return Number.isFinite(value) ? value : 0;
    }

    function stop() {
        if (frameId !== null) {
            cancelAnimationFrame(frameId);
            frameId = null;
        }
    }

    function tick(time) {
        if (!lastTime) lastTime = time;
        const delta = (time - lastTime) / 1000;
        lastTime = time;

        if (!paused && !dragging && loopWidth > 0) {
            offset -= SPEED * delta;
            offset = wrap(offset);
            apply();
        }
        frameId = requestAnimationFrame(tick);
    }

    function wrap(value) {
        if (loopWidth <= 0) return value;
        while (value <= -loopWidth) value += loopWidth;
        while (value > 0) value -= loopWidth;
        return value;
    }

    function apply() {
        track.style.transform = 'translateX(' + offset + 'px)';
    }

    function onPointerDown(event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        dragging = true;
        dragStartX = event.clientX;
        dragStartOffset = offset;
        viewport.setPointerCapture(event.pointerId);
    }

    function onPointerMove(event) {
        if (!dragging) return;
        offset = wrap(dragStartOffset + (event.clientX - dragStartX));
        apply();
    }

    function onPointerUp(event) {
        if (!dragging) return;
        dragging = false;
        if (viewport.hasPointerCapture(event.pointerId)) {
            viewport.releasePointerCapture(event.pointerId);
        }
    }

    function bind() {
        viewport.addEventListener('mouseenter', () => { paused = true; });
        viewport.addEventListener('mouseleave', () => { paused = false; });
        viewport.addEventListener('focusin', () => { paused = true; });
        viewport.addEventListener('focusout', () => { paused = false; });
        viewport.addEventListener('pointerdown', onPointerDown);
        viewport.addEventListener('pointermove', onPointerMove);
        viewport.addEventListener('pointerup', onPointerUp);
        viewport.addEventListener('pointercancel', onPointerUp);

        let resizeTimer = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => window.initReviewsCarousel(), 200);
        });

        reduceMotion.addEventListener('change', () => window.initReviewsCarousel());
    }

    let bound = false;

    window.initReviewsCarousel = function initReviewsCarousel() {
        viewport = document.querySelector('.testimonials__carousel');
        track = document.getElementById('testimonials-grid');
        if (!viewport || !track) return;

        stop();
        removeClones();
        offset = 0;
        lastTime = 0;
        track.style.transform = '';

        const cards = originals();
        if (cards.length === 0) return;

        if (!bound) {
            bind();
            bound = true;
        }

        // Con movimiento reducido no se clona ni se anima: queda un carrusel
        // navegable a mano mediante el scroll horizontal que activa el CSS.
        if (reduceMotion.matches) return;

        loopWidth = trackWidth(cards);
        buildClones(cards);
        frameId = requestAnimationFrame(tick);
    };

    document.addEventListener('DOMContentLoaded', window.initReviewsCarousel);
})();
