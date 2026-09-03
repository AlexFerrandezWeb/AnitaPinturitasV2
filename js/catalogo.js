// Catalogo unificado: las 183 referencias de las dos familias en una sola
// rejilla filtrable.
//
// Antes esta pagina solo tenia dos enlaces de categoria y ningun producto, asi
// que quien pulsaba "Productos" en el menu no veia nada que comprar y tenia que
// adivinar por donde seguir. Ahora las familias son un filtro, no una
// bifurcacion: capilar nunca queda escondido detras de una decision.
//
// Las tarjetas reutilizan el marcado y las clases de cuidadoPiel.js
// (.featured-product-card / .productos-grid) para que compartan estilos.
document.addEventListener('DOMContentLoaded', function () {
    const grid = document.getElementById('catalogo-grid');
    if (!grid) return;

    const contenedorFamilias = document.getElementById('catalogo-familias');
    const contenedorSubs = document.getElementById('catalogo-subcategorias');
    const contador = document.getElementById('catalogo-contador');
    const campoBuscar = document.getElementById('catalogo-buscar');
    const mensajeVacio = document.getElementById('catalogo-vacio');

    const FAMILIAS = [
        { id: 'piel', etiqueta: 'Cuidado de la piel', tag: 'Piel', archivo: '../data/cuidadoPiel.json' },
        { id: 'capilar', etiqueta: 'Cuidado capilar', tag: 'Capilar', archivo: '../data/cuidadoCapilar.json' }
    ];

    let productos = [];
    let filtroFamilia = 'todo';
    let filtroSub = null;
    let texto = '';
    let visibles = [];

    const normalizar = (s) => String(s || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '');

    // En el chip sobra el parentesis del titulo: "Linea eco-marina (con
    // certificacion ecologica)" parte la etiqueta en dos lineas en movil. El
    // titulo completo se sigue usando para filtrar y en la pagina de categoria.
    const etiquetaChip = (titulo) => String(titulo || '').replace(/\s*\([^)]*\)/g, '').trim();

    const escapar = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    // --- Carga de datos -----------------------------------------------------

    Promise.all(FAMILIAS.map(familia =>
        fetch(familia.archivo)
            .then(respuesta => {
                if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status + ' en ' + familia.archivo);
                return respuesta.json();
            })
            .then(datos => ({ familia, datos }))
    ))
        .then(cargas => {
            cargas.forEach(({ familia, datos }) => {
                (datos.categorias || []).forEach(categoria => {
                    (categoria.productos || []).forEach(producto => {
                        productos.push({
                            id: producto.id,
                            nombre: producto.nombre,
                            precio: producto.precio,
                            imagen: producto.imagen,
                            descripcion: producto.descripcion || '',
                            familia: familia.id,
                            tag: familia.tag,
                            subcategoria: categoria.titulo,
                            busqueda: normalizar([producto.nombre, producto.descripcion, categoria.titulo].join(' '))
                        });
                    });
                });
            });

            pintarFiltroFamilias();
            aplicarFiltros();
        })
        .catch(error => {
            console.error('Error al cargar el catálogo:', error);
            grid.innerHTML = '<p class="catalogo__error">No hemos podido cargar el catálogo. Recarga la página en un momento.</p>';
        });

    // --- Filtros ------------------------------------------------------------

    function pintarFiltroFamilias() {
        const opciones = [{ id: 'todo', etiqueta: 'Todo', total: productos.length }].concat(
            FAMILIAS.map(familia => ({
                id: familia.id,
                etiqueta: familia.etiqueta,
                total: productos.filter(producto => producto.familia === familia.id).length
            }))
        );

        contenedorFamilias.innerHTML = opciones.map(opcion => `
            <button type="button" class="catalogo__chip catalogo__chip--familia${opcion.id === filtroFamilia ? ' is-activo' : ''}"
                    data-familia="${opcion.id}" aria-pressed="${opcion.id === filtroFamilia}">
                ${escapar(opcion.etiqueta)} <span class="catalogo__chip-num">${opcion.total}</span>
            </button>
        `).join('');
    }

    function pintarFiltroSubcategorias() {
        // Con "Todo" seleccionado serian 21 chips: demasiado ruido para elegir nada
        if (filtroFamilia === 'todo') {
            contenedorSubs.innerHTML = '';
            contenedorSubs.hidden = true;
            return;
        }

        const deLaFamilia = productos.filter(producto => producto.familia === filtroFamilia);
        const subcategorias = [];
        deLaFamilia.forEach(producto => {
            if (!subcategorias.includes(producto.subcategoria)) subcategorias.push(producto.subcategoria);
        });

        const chips = [`
            <button type="button" class="catalogo__chip catalogo__chip--sub${filtroSub === null ? ' is-activo' : ''}"
                    data-sub="" aria-pressed="${filtroSub === null}">Todas</button>
        `].concat(subcategorias.map(sub => {
            const total = deLaFamilia.filter(producto => producto.subcategoria === sub).length;
            return `
            <button type="button" class="catalogo__chip catalogo__chip--sub${filtroSub === sub ? ' is-activo' : ''}"
                    data-sub="${escapar(sub)}" title="${escapar(sub)}" aria-pressed="${filtroSub === sub}">
                ${escapar(etiquetaChip(sub))} <span class="catalogo__chip-num">${total}</span>
            </button>`;
        }));

        contenedorSubs.innerHTML = chips.join('');
        contenedorSubs.hidden = false;
    }

    contenedorFamilias.addEventListener('click', function (evento) {
        const chip = evento.target.closest('.catalogo__chip--familia');
        if (!chip) return;
        filtroFamilia = chip.dataset.familia;
        filtroSub = null;
        pintarFiltroFamilias();
        aplicarFiltros();
    });

    contenedorSubs.addEventListener('click', function (evento) {
        const chip = evento.target.closest('.catalogo__chip--sub');
        if (!chip) return;
        filtroSub = chip.dataset.sub || null;
        aplicarFiltros();
    });

    // El evento de busqueda lo mandaba buscador.js, que ya no se carga. Se
    // reporta desde aqui para no perder la unica senal que dice que busca la
    // gente. Se espera a que deje de teclear para no mandar una por letra.
    let temporizadorBusqueda = null;
    function reportarBusqueda(termino) {
        if (termino.length < 2) return;
        if (typeof window.trackSearch === 'function') window.trackSearch(termino);
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'search', { search_term: termino });
        }
    }

    if (campoBuscar) {
        campoBuscar.addEventListener('input', function () {
            const termino = campoBuscar.value.trim();
            texto = normalizar(termino);
            aplicarFiltros();

            clearTimeout(temporizadorBusqueda);
            temporizadorBusqueda = setTimeout(() => reportarBusqueda(termino), 900);
        });

        // Se llega aqui desde la lupa del header, que apunta a #buscar
        if (window.location.hash === '#buscar') {
            campoBuscar.focus({ preventScroll: true });
        }
    }

    function aplicarFiltros() {
        visibles = productos.filter(producto => {
            if (filtroFamilia !== 'todo' && producto.familia !== filtroFamilia) return false;
            if (filtroSub && producto.subcategoria !== filtroSub) return false;
            if (texto && !producto.busqueda.includes(texto)) return false;
            return true;
        });

        pintarFiltroSubcategorias();
        reiniciarRejilla();
    }

    // --- Rejilla ------------------------------------------------------------

    // Se pintan todas de golpe. Se probo a cargarlas por lotes con un
    // IntersectionObserver y no compensa: los datos ya estan en memoria, asi que
    // no hay nada que "cargar", y el centinela daba dos problemas — se quedaba
    // uno huerfano por cada refiltrado (y el buscador refiltra en cada tecla) y
    // la carga se atascaba cuando seguia visible despues de pintar, porque el
    // observer solo dispara al cambiar de estado. Con 183 fichas como techo, el
    // coste de pintarlas enteras es despreciable y las imagenes ya son lazy.
    function reiniciarRejilla() {
        contador.textContent = visibles.length === 1
            ? '1 producto'
            : visibles.length + ' productos';

        mensajeVacio.hidden = visibles.length > 0;
        grid.innerHTML = visibles.map(tarjeta).join('');
    }

    function tarjeta(producto) {
        const alt = producto.descripcion
            ? (producto.descripcion.split('.')[0] || producto.nombre).trim()
            : producto.nombre;

        return `
            <div class="featured-product-card" onclick="verProducto('${escapar(producto.id)}')">
                <a href="producto.html?id=${encodeURIComponent(producto.id)}" class="featured-product-card__img-link" onclick="event.stopPropagation()">
                    <img src="${escapar(producto.imagen)}" alt="${escapar(alt)}" class="featured-product-card__img" loading="lazy">
                    <span class="featured-product-card__tag">${escapar(producto.tag)}</span>
                </a>
                <div class="featured-product-card__body">
                    <h3 class="featured-product-card__name">${escapar(producto.nombre)}</h3>
                    <p class="featured-product-card__desc">${escapar(producto.descripcion)}</p>
                    <p class="featured-product-card__price">${producto.precio.toFixed(2)} €</p>
                    <p class="featured-product-card__iva">IVA incluido</p>
                    <div class="featured-product-card__actions" onclick="event.stopPropagation()">
                        <a href="producto.html?id=${encodeURIComponent(producto.id)}" class="featured-product-card__btn featured-product-card__btn--ver">Ver</a>
                        <button type="button" class="featured-product-card__btn featured-product-card__btn--cart"
                                data-id="${escapar(producto.id)}">Añadir al carrito</button>
                    </div>
                </div>
            </div>
        `;
    }

    // El boton no lleva onclick inline para no tener que escapar nombres con
    // comillas dentro del atributo: se delega desde la rejilla.
    grid.addEventListener('click', function (evento) {
        const boton = evento.target.closest('.featured-product-card__btn--cart');
        if (!boton) return;
        evento.stopPropagation();

        const producto = productos.find(item => item.id === boton.dataset.id);
        if (!producto) return;

        anadirAlCarrito(boton, producto);
    });

    function anadirAlCarrito(boton, producto) {
        const tarjetaDom = boton.closest('.featured-product-card');
        const imagen = tarjetaDom ? tarjetaDom.querySelector('.featured-product-card__img') : null;

        const guardar = () => {
            if (typeof window.addToCart === 'function') {
                window.addToCart(producto.id, producto.nombre, producto.precio, producto.imagen, 1);
            }
        };

        if (imagen && typeof window.createFlyToCartAnimationFromButton === 'function') {
            window.createFlyToCartAnimationFromButton(boton, imagen.src, guardar);
        } else {
            guardar();
        }

        const textoOriginal = boton.textContent;
        boton.textContent = '✓ Añadido';
        boton.classList.add('is-anadido');
        setTimeout(() => {
            boton.textContent = textoOriginal;
            boton.classList.remove('is-anadido');
        }, 1800);
    }

    if (typeof window.verProducto !== 'function') {
        window.verProducto = function (productoId) {
            window.location.href = 'producto.html?id=' + encodeURIComponent(productoId);
        };
    }
});
