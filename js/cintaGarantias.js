/**
 * Cinta de garantias (envio, devolucion, pago seguro, asesoramiento).
 *
 * La cinta son dos listas identicas una detras de otra y se desplaza el ancho
 * de una: al terminar, la copia esta justo donde empezo el original y la vuelta
 * no se ve. El desplazamiento lo hace la animacion de CSS; lo unico que hace
 * este script es medir ese ancho y pasarselo en pixeles exactos, porque con un
 * porcentaje el navegador redondea y en la vuelta se cuela un salto.
 *
 * Tambien ajusta la duracion al ancho medido, para que la cinta pase siempre a
 * la misma velocidad (unos 34 px por segundo) mida lo que mida el texto.
 */
(function () {
    'use strict';

    const VELOCIDAD = 34; // px por segundo

    document.querySelectorAll('.shop-guarantees__cinta').forEach(function (cinta) {
        const lista = cinta.querySelector('.shop-guarantees__list');
        if (!lista) return;

        function medir() {
            const ancho = lista.getBoundingClientRect().width;
            if (!ancho) return;
            cinta.style.setProperty('--cinta-ancho', ancho + 'px');
            cinta.style.setProperty('--cinta-duracion', (ancho / VELOCIDAD) + 's');
        }

        medir();
        // Las medidas cambian al girar el movil y cuando acaban de cargar las
        // tipografias, que es lo que decide el ancho real de cada garantia
        window.addEventListener('resize', medir);
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(medir);
        }
    });
})();
