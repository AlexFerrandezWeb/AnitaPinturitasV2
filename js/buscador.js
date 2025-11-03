// Funcionalidad del buscador
document.addEventListener('DOMContentLoaded', function() {
    // Elementos del buscador
    const searchToggle = document.querySelector('.nav__search-toggle');
    const searchBar = document.querySelector('.search-bar');
    const searchInput = document.querySelector('.search-bar__input');
    const searchForm = document.querySelector('.search-bar__form');
    const searchSubmitButton = document.querySelector('.search-bar__button');
    
    // Cache de productos para búsqueda
    let productosCache = null;
    let productosTextoIndexados = false;

    // Genera variantes simples (plural/singular) y raíz para mejorar coincidencias en español
    function generarVariantesBusqueda(palabra) {
        const variantes = new Set();
        const p = normalizarTexto(palabra);
        if (!p) return variantes;
        variantes.add(p);
        if (p.endsWith('es')) variantes.add(p.slice(0, -2));
        if (p.endsWith('s')) variantes.add(p.slice(0, -1));
        if (p.endsWith('ciones')) variantes.add(p.replace(/ciones$/, 'cion'));
        if (p.endsWith('cion')) variantes.add(p.replace(/cion$/, 'cion'));
        // Raíz por prefijo para aproximar familia de palabras (mín 5 chars)
        if (p.length >= 7) variantes.add(p.slice(0, 7));
        else if (p.length >= 6) variantes.add(p.slice(0, 6));
        else if (p.length >= 5) variantes.add(p.slice(0, 5));
        return variantes;
    }

    function coincideConTexto(textoNormalizado, palabra) {
        const variantes = generarVariantesBusqueda(palabra);
        for (const v of variantes) {
            if (v && textoNormalizado.includes(v)) return true;
        }
        return false;
    }

    // Función para cerrar el buscador
    function closeSearch() {
        if (searchBar) {
            searchBar.classList.remove('is-visible');
        }
        if (searchToggle) {
            searchToggle.setAttribute('aria-expanded', 'false');
        }
        ocultarResultados();
    }

            // Toggle del buscador
            if (searchToggle) {
                searchToggle.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation(); // Evitar que se cierre inmediatamente
                const isVisible = searchBar.classList.contains('is-visible');
                
                if (isVisible) {
                    closeSearch();
                } else {
                    // Añadir clase visible y forzar visibilidad inmediata del input
                    searchBar.classList.add('is-visible');
                    searchToggle.setAttribute('aria-expanded', 'true');
                    
                    const input = searchBar.querySelector('.search-bar__input');
                    if (input) {
                        // Asegurar que el input esté habilitado
                        input.disabled = false;
                        input.readOnly = false;
                        input.style.pointerEvents = 'auto';
                        
                        // Función auxiliar para hacer focus de forma agresiva
                        const forceFocus = () => {
                            input.scrollIntoView({ behavior: 'instant', block: 'nearest' });
                            input.focus({ preventScroll: true });
                            
                            // Si aún no tiene focus, intentar con click
                            if (document.activeElement !== input) {
                                input.click();
                                setTimeout(() => input.focus({ preventScroll: true }), 0);
                            }
                        };
                        
                        // Intentar focus inmediatamente
                        forceFocus();
                        
                        // Reintentar después de que el DOM se actualice
                        setTimeout(forceFocus, 0);
                        setTimeout(forceFocus, 50);
                        setTimeout(forceFocus, 100);
                        
                        // Último intento después de la animación CSS
                        setTimeout(forceFocus, 450);
                    }
                }
            });
            }

    // Cerrar buscador al hacer clic en el body (pero no si se hace clic en los resultados)
    document.addEventListener('click', function(e) {
        const resultadosContainer = document.querySelector('.search-results');
        const clickEnResultados = resultadosContainer && resultadosContainer.contains(e.target);
        if (clickEnResultados) return;

        if (searchBar && searchToggle && 
            searchBar.classList.contains('is-visible') && 
            !searchBar.contains(e.target) && 
            !searchToggle.contains(e.target)) {
            closeSearch();
        }
    });

    // Prevenir que se cierre al hacer clic dentro del buscador
    if (searchBar) {
        searchBar.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Cerrar con tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchBar && searchBar.classList.contains('is-visible')) {
            closeSearch();
        }
    });
    
    // Cargar productos para búsqueda
    async function cargarProductos() {
        if (productosCache) return productosCache;
        
        try {
            console.log('Cargando productos para búsqueda...');
            // Detectar si estamos en la raíz (index.html) o en una subcarpeta
            const isRootPage = window.location.pathname.endsWith('index.html') || 
                              window.location.pathname === '/' || 
                              window.location.pathname.endsWith('/');
            const dataUrl = isRootPage 
                ? 'data/cuidadoPiel.json' 
                : '../data/cuidadoPiel.json';
            const response = await fetch(dataUrl);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Datos cargados:', data);
            
            // Aplanar todos los productos de todas las categorías
            productosCache = [];
            data.categorias.forEach(categoria => {
                categoria.productos.forEach(producto => {
                    const nombre = producto.nombre || '';
                    const descripcion = producto.descripcion || '';
                    const categoriaTitulo = categoria.titulo || '';
                    productosCache.push({
                        ...producto,
                        categoria: categoriaTitulo,
                        // Índice de texto normalizado para rendimiento
                        _textoIndex: normalizarTexto(`${nombre} ${descripcion} ${categoriaTitulo}`)
                    });
                });
            });
            
            console.log('Productos procesados:', productosCache.length);
            return productosCache;
        } catch (error) {
            console.error('Error al cargar productos:', error);
            return [];
        }
    }
    
    // Función para normalizar texto (quitar tildes, guiones, espacios extra, etc.)
    function normalizarTexto(texto) {
        if (!texto) return '';
        
        return texto
            .toLowerCase()
            .normalize('NFD') // Normaliza caracteres Unicode a su forma descompuesta
            .replace(/[\u0300-\u036f]/g, '') // Elimina diacríticos (tildes, acentos)
            .replace(/[-_]/g, ' ') // Reemplaza guiones y guiones bajos con espacios
            .replace(/\s+/g, ' ') // Normaliza espacios múltiples a uno solo
            .trim();
    }
    
    // Función de búsqueda mejorada
    function buscarProductos(termino) {
        if (!termino || termino.length < 2) return [];
        
        const terminoNormalizado = normalizarTexto(termino);
        const terminoLower = termino.toLowerCase();
        const palabrasBusqueda = terminoNormalizado.split(' ').filter(p => p.length > 0);
        
        console.log('Buscando:', termino, '(normalizado:', terminoNormalizado, ') en', productosCache?.length, 'productos');
        
        const resultados = productosCache.filter(producto => {
            // Usar índice precalculado
            const textoN = producto._textoIndex || normalizarTexto(`${producto.nombre} ${producto.descripcion} ${producto.categoria}`);

            if (palabrasBusqueda.length > 1) {
                // Todas las palabras deben aparecer (permitiendo variantes)
                const todas = palabrasBusqueda.every(p => coincideConTexto(textoN, p));
                if (!todas) return false;
                return true;
            }

            const unica = palabrasBusqueda[0];
            // Coincidencia por variantes (plural/singular) y raíz
            if (coincideConTexto(textoN, unica)) return true;

            // Como fallback, includes del término completo
            return textoN.includes(terminoNormalizado);
        });
        
        console.log('Resultados encontrados:', resultados.length);
        return resultados;
    }
    
    // Mostrar resultados de búsqueda
    function mostrarResultados(productos, termino) {
        // Crear o actualizar contenedor de resultados
        let resultadosContainer = document.querySelector('.search-results');
        
        if (!resultadosContainer) {
            resultadosContainer = document.createElement('div');
            resultadosContainer.className = 'search-results';
            document.body.appendChild(resultadosContainer);
        }
        // Posicionar el overlay justo bajo la barra de búsqueda, sin brechas
        const ajustarTopResultados = () => {
            if (searchBar) {
                const rect = searchBar.getBoundingClientRect();
                const top = Math.max(0, Math.round(rect.bottom));
                resultadosContainer.style.top = `${top}px`;
            } else {
                // Fallback si no existe searchBar
                resultadosContainer.style.top = '156px';
            }
        };
        ajustarTopResultados();
        // Actualizar si cambia el viewport
        window.requestAnimationFrame(ajustarTopResultados);
        window.addEventListener('resize', ajustarTopResultados, { passive: true });
        window.addEventListener('scroll', ajustarTopResultados, { passive: true });
        
        if (productos.length === 0) {
            resultadosContainer.innerHTML = `
                <div class="search-results__empty">
                    <p>No se encontraron productos para "${termino}"</p>
                </div>
            `;
        } else {
            const resultadosHTML = productos.map(producto => {
                let altTextoBase = `${producto.nombre} de la categoría ${producto.categoria} - Anita Pinturitas`;
                let altDesdeDescripcion = altTextoBase;
                if (producto.descripcion && producto.descripcion.trim().length > 0) {
                    const primeraFrase = producto.descripcion.split('.')?.[0]?.trim() || '';
                    if (primeraFrase.length >= 20 && primeraFrase.length <= 140) {
                        altDesdeDescripcion = primeraFrase;
                    }
                }
                const altSeguro = (altDesdeDescripcion || altTextoBase).replace(/"/g, '&quot;');

                return `
                <div class="search-result-item" onclick=\"irAProducto('${producto.id}')\">
                    <img src=\"${producto.imagen}\" alt=\"${altSeguro}\" class=\"search-result-item__image\">
                    <div class=\"search-result-item__info\">
                        <h4 class=\"search-result-item__name\">${producto.nombre}</h4>
                        <p class=\"search-result-item__category\">${producto.categoria}</p>
                        <p class=\"search-result-item__price\">${producto.precio.toFixed(2)} €</p>
                    </div>
                </div>`;
            }).join('');
            
            resultadosContainer.innerHTML = `
                <div class="search-results__header">
                    <p>Resultados para "${termino}" (${productos.length})</p>
                </div>
                <div class="search-results__list">
                    ${resultadosHTML}
                </div>
            `;
        }
        
        resultadosContainer.style.display = 'block';
        // Bloquear scroll del body cuando los resultados están visibles
        document.body.style.overflow = 'hidden';
    }
    
    // Ocultar resultados
    function ocultarResultados() {
        const resultadosContainer = document.querySelector('.search-results');
        if (resultadosContainer) {
            resultadosContainer.style.display = 'none';
        }
        // Restaurar scroll del body
        document.body.style.overflow = '';
    }
    
    // Función para ir a un producto
    window.irAProducto = function(productoId) {
        // Detectar si estamos en la raíz (index.html) o en una subcarpeta
        const isRootPage = window.location.pathname.endsWith('index.html') || 
                          window.location.pathname === '/' || 
                          window.location.pathname.endsWith('/');
        const productoUrl = isRootPage 
            ? `html/producto.html?id=${productoId}` 
            : `producto.html?id=${productoId}`;
        window.location.href = productoUrl;
    };
    
    // Manejar envío del formulario
    if (searchForm) {
        searchForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const termino = searchInput.value.trim();
            if (termino.length < 2) {
                ocultarResultados();
                return;
            }
            
            await cargarProductos();
            const resultados = buscarProductos(termino);
            mostrarResultados(resultados, termino);
        });
    }
    
    // Búsqueda en tiempo real
    if (searchInput) {
        let timeoutId;
        
        searchInput.addEventListener('input', async function() {
            clearTimeout(timeoutId);
            
            const termino = this.value.trim();
            
            if (termino.length < 2) {
                ocultarResultados();
                return;
            }
            
            // Debounce para evitar muchas búsquedas
            timeoutId = setTimeout(async () => {
                await cargarProductos();
                const resultados = buscarProductos(termino);
                mostrarResultados(resultados, termino);
                // Asegurar que el buscador permanezca visible cuando hay resultados
                if (searchBar && !searchBar.classList.contains('is-visible')) {
                    searchBar.classList.add('is-visible');
                    if (searchToggle) {
                        searchToggle.setAttribute('aria-expanded', 'true');
                    }
                }
            }, 300);
        });
        
        // Ocultar resultados cuando se pierde el foco
        searchInput.addEventListener('blur', function() {
            // Delay para permitir clicks en los resultados
            setTimeout(() => {
                // En móvil mantener el buscador visible y no ocultar automáticamente
                if (window.innerWidth > 768) {
                    ocultarResultados();
                }
            }, 200);
        });
    }
    
    // Cargar productos al inicializar
    cargarProductos();
    
    // Botón de limpiar siempre visible
    if (searchForm) {
        let clearBtn = searchForm.querySelector('.search-bar__clear');
        if (!clearBtn) {
            clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'search-bar__clear';
            clearBtn.setAttribute('aria-label', 'Limpiar búsqueda');
            clearBtn.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true" width="18" height="18">
                    <line x1="18" y1="6" x2="6" y2="18" stroke="#ba0b5f" stroke-width="2" stroke-linecap="round" />
                    <line x1="6" y1="6" x2="18" y2="18" stroke="#ba0b5f" stroke-width="2" stroke-linecap="round" />
                </svg>
            `;
            // Insertar después del botón de enviar (lupa)
            if (searchSubmitButton) {
                searchSubmitButton.insertAdjacentElement('afterend', clearBtn);
            } else {
                searchForm.appendChild(clearBtn);
            }
        }
        
        clearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (searchInput) {
                searchInput.value = '';
            }
            ocultarResultados();
            closeSearch();
        });
    }
});
