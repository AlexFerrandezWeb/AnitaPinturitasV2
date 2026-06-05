(async function () {
    const grid = document.getElementById('weekly-favorites-grid');
    if (!grid) return;

    function getISOWeek(date) {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
        const day = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - day);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }

    function seededRandom(seed) {
        let s = seed >>> 0;
        return function () {
            s = Math.imul(1664525, s) + 1013904223 >>> 0;
            return s / 0x100000000;
        };
    }

    function formatPrice(price) {
        return price.toFixed(2).replace('.', ',') + ' €';
    }

    function renderCard(p) {
        const imgSrc = p.imagen.replace(/^\//, '');
        const tagClass = p.categoria === 'piel'
            ? 'featured-product-card__tag--piel'
            : 'featured-product-card__tag--cabello';
        const tagLabel = p.categoria === 'piel' ? 'Piel' : 'Cabello';
        const nombre = p.nombre.length > 50 ? p.nombre.slice(0, 50).trimEnd() + '…' : p.nombre;
        const desc = p.descripcion.length > 100 ? p.descripcion.slice(0, 100).trimEnd() + '…' : p.descripcion;
        const imgEscaped = imgSrc.replace(/'/g, "\\'");
        const nombreEscaped = p.nombre.replace(/'/g, "\\'");

        return `<div class="featured-product-card">
            <a href="html/producto.html?id=${p.id}" class="featured-product-card__img-link">
                <img src="${imgSrc}" alt="${nombre}" class="featured-product-card__img" loading="lazy">
                <span class="featured-product-card__tag ${tagClass}">${tagLabel}</span>
            </a>
            <div class="featured-product-card__body">
                <h3 class="featured-product-card__name">${nombre}</h3>
                <p class="featured-product-card__desc">${desc}</p>
                <p class="featured-product-card__price">${formatPrice(p.precio)}</p>
                <p class="featured-product-card__iva">IVA incluido</p>
                <div class="featured-product-card__actions">
                    <a href="html/producto.html?id=${p.id}" class="featured-product-card__btn featured-product-card__btn--ver">Ver</a>
                    <button type="button" class="featured-product-card__btn featured-product-card__btn--cart"
                        onclick="addToCart('${p.id}','${nombreEscaped}',${p.precio},'${imgEscaped}');updateCartCount();">Añadir al carrito</button>
                </div>
            </div>
        </div>`;
    }

    try {
        const [pielData, capilarData] = await Promise.all([
            fetch('/data/cuidadoPiel.json').then(r => r.json()),
            fetch('/data/cuidadoCapilar.json').then(r => r.json()),
        ]);

        const pielProducts = pielData.categorias
            .flatMap(cat => cat.productos)
            .filter(p => p.imagen && p.precio)
            .map(p => ({ ...p, categoria: 'piel' }));

        const capilarProducts = capilarData.categorias
            .flatMap(cat => cat.productos)
            .filter(p => p.imagen && p.precio)
            .map(p => ({ ...p, categoria: 'cabello' }));

        const all = [...pielProducts, ...capilarProducts];

        const now = new Date();
        const seed = now.getFullYear() * 100 + getISOWeek(now);
        const rand = seededRandom(seed);

        const shuffled = [...all].sort(() => rand() - 0.5);
        const picks = shuffled.slice(0, 4);

        grid.innerHTML = picks.map(renderCard).join('');
    } catch (_) {
        // Deja el contenido estático como fallback
    }
})();
