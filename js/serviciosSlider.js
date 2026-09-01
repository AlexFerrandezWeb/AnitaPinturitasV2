/**
 * Pases horizontales de la home. Hay dos y comparten clases:
 *   - .svc-slider          Servicios destacados (Masajes / Maderoterapia / Bodas)
 *   - .svc-slider--cabina  Las tarjetas de cabina, solo en movil
 *
 * El desplazamiento lo hace el navegador: el viewport es un contenedor con
 * scroll horizontal y scroll-snap, asi que el gesto de deslizar en movil
 * funciona solo. Este script unicamente anade las flechas, los puntos, el
 * teclado y el giro automatico, y mantiene sincronizado cual esta activo.
 *
 * Giro automatico: se activa poniendo data-auto="<milisegundos>" en la raiz.
 * Sin el atributo, el pase solo se mueve cuando el usuario quiere.
 */
(function () {
    'use strict';

    document.querySelectorAll('.svc-slider').forEach(iniciar);

    function iniciar(slider) {
        const viewport = slider.querySelector('.svc-slider__viewport');
        const slides = Array.from(slider.querySelectorAll('.svc-slider__slide'));
        const prev = slider.querySelector('.svc-slider__arrow--prev');
        const next = slider.querySelector('.svc-slider__arrow--next');
        const dots = Array.from(slider.querySelectorAll('.svc-slider__dot'));

        if (!viewport || slides.length === 0) return;

        let indice = 0;

        function indiceVisible() {
            // El ancho de diapositiva se mide en vivo: cambia al redimensionar
            const ancho = anchoDiapositiva();
            return ancho ? Math.round(viewport.scrollLeft / ancho) : 0;
        }

        // No siempre coincide con el ancho del viewport: en el pase de cabina la
        // diapositiva mide un 88 % para que asome la siguiente
        function anchoDiapositiva() {
            return slides[0].getBoundingClientRect().width || viewport.clientWidth;
        }

        function pintarEstado() {
            dots.forEach(function (dot, n) {
                dot.classList.toggle('is-active', n === indice);
            });
            if (prev) prev.disabled = indice === 0;
            if (next) next.disabled = indice === slides.length - 1;
        }

        function irA(n) {
            indice = Math.max(0, Math.min(slides.length - 1, n));
            viewport.scrollTo({ left: indice * anchoDiapositiva(), behavior: 'smooth' });
            pintarEstado();
        }

        if (prev) prev.addEventListener('click', function () { irA(indice - 1); });
        if (next) next.addEventListener('click', function () { irA(indice + 1); });

        dots.forEach(function (dot, n) {
            dot.addEventListener('click', function () { irA(n); });
        });

        viewport.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowRight') { e.preventDefault(); irA(indice + 1); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); irA(indice - 1); }
        });

        // Los puntos siguen al dedo: mientras el viewport se mueve se les da el
        // ancho y el color a mano, con la posicion real del scroll (que trae
        // decimales), asi que el punto crece a la vez que entra la tarjeta en vez
        // de saltar al final. El rebote de gelatina se lo deja al CSS, que entra
        // al soltar: por eso aqui se apagan transicion y animacion.
        function seguirAlDedo() {
            const ancho = anchoDiapositiva();
            if (!ancho) return;
            const posicion = viewport.scrollLeft / ancho;
            dots.forEach(function (dot, n) {
                // 1 cuando la diapositiva esta centrada, 0 a una de distancia
                const cerca = Math.max(0, 1 - Math.abs(posicion - n));
                dot.classList.add('is-siguiendo');
                dot.style.width = (10 + 18 * cerca) + 'px';
                // El punto apagado es el mismo color al 28 %: subir la opacidad
                // hasta 1 lo lleva justo al color del activo
                dot.style.background = 'rgba(152, 7, 79, ' + (0.28 + 0.72 * cerca) + ')';
            });
        }

        // Al soltar se devuelve el mando al CSS: se quitan los estilos a mano y
        // la clase is-active hace el ultimo tramo con su rebote
        function soltar() {
            dots.forEach(function (dot) {
                dot.classList.remove('is-siguiendo');
                dot.style.width = '';
                dot.style.background = '';
            });
        }

        // Al deslizar con el dedo no pasa por irA(), asi que hay que releer la
        // posicion real para que los puntos y las flechas no se desincronicen
        let pendiente;
        viewport.addEventListener('scroll', function () {
            seguirAlDedo();
            window.clearTimeout(pendiente);
            pendiente = window.setTimeout(function () {
                const actual = indiceVisible();
                if (actual !== indice) {
                    indice = actual;
                }
                soltar();
                pintarEstado();
            }, 100);
        }, { passive: true });

        // Al cambiar el ancho, el scrollLeft guardado deja de cuadrar con la diapositiva
        window.addEventListener('resize', function () {
            viewport.scrollLeft = indice * anchoDiapositiva();
        });

        pintarEstado();
        automatico();

        /* ===== Giro automatico ===== */
        function automatico() {
            const espera = parseInt(slider.dataset.auto, 10);
            if (!espera) return;

            // Quien ha pedido no ver animaciones no quiere esto moviendose solo
            const quieto = window.matchMedia('(prefers-reduced-motion: reduce)');
            if (quieto.matches) return;

            let reloj = null;
            let visible = true;

            function paso() {
                // En escritorio el pase de cabina se desmonta (display:contents),
                // asi que no hay nada que desplazar: el viewport no tiene caja
                if (!visible || viewport.clientWidth === 0) return;
                if (viewport.scrollWidth <= viewport.clientWidth) return;
                // Vuelta al principio despues de la ultima
                irA(indice >= slides.length - 1 ? 0 : indice + 1);
            }

            reloj = window.setInterval(paso, espera);

            // En cuanto el usuario toma el mando, el pase deja de moverse solo:
            // que la tarjeta cambie mientras la esta leyendo es peor que util
            function parar() {
                window.clearInterval(reloj);
                reloj = null;
            }
            ['pointerdown', 'keydown', 'wheel'].forEach(function (evento) {
                slider.addEventListener(evento, parar, { once: true, passive: true });
            });

            // Fuera de pantalla no tiene sentido gastar pases: si no, al volver
            // a la seccion se la encuentra ya por la ultima tarjeta
            if ('IntersectionObserver' in window) {
                new IntersectionObserver(function (entradas) {
                    visible = entradas[0].isIntersecting;
                }, { threshold: 0.2 }).observe(slider);
            }
        }
    }
})();
