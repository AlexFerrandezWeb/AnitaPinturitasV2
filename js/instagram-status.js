/**
 * Instagram Live Status Checker
 * Anita Pinturitas
 */

document.addEventListener('DOMContentLoaded', () => {
    const liveBadge = document.getElementById('instagram-live-badge');
    const liveBanner = document.getElementById('instagram-live-banner');
    const reelsSection = document.querySelector('.live-section__reels');
    const apiStatus = document.getElementById('instagram-api-status');
    
    const INSTAGRAM_USERNAME = 'anita_pinturitas';
    const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
    let isLiveNow = false;

    if (!liveBadge || !liveBanner) return;

    function getApiCandidates() {
        const origin = window.location.origin;
        const isLiveServer =
            window.location.port === '5500' ||
            window.location.port === '5501' ||
            window.location.port === '5502' ||
            window.location.protocol === 'file:';

        if (isLiveServer) {
            return ['http://localhost:3000', origin];
        }

        return [origin, 'http://localhost:3000'];
    }

    async function fetchFromApi(path) {
        const bases = getApiCandidates();

        for (const base of bases) {
            try {
                const response = await fetch(`${base}${path}`);
                if (response.ok) {
                    return response;
                }
            } catch (error) {
                // Intentar siguiente base
            }
        }

        throw new Error(`No se pudo conectar a la API para ${path}`);
    }

    function setApiStatus(status, message) {
        if (!apiStatus) return;

        apiStatus.classList.remove(
            'live-section__api-status--checking',
            'live-section__api-status--ok',
            'live-section__api-status--error'
        );
        apiStatus.classList.add(`live-section__api-status--${status}`);
        apiStatus.textContent = message;
    }

    function renderLatestReels(reels) {
        if (!reelsSection || !Array.isArray(reels) || reels.length === 0) return;

        reelsSection.innerHTML = reels.map((reel) => {
            const safeUrl = reel.url || (reel.shortcode ? `https://www.instagram.com/reel/${reel.shortcode}/` : 'https://www.instagram.com/anita_pinturitas/reels/');
            const safeCaption = reel.caption ? reel.caption.replace(/"/g, '&quot;') : 'Reel de Instagram';
            const safeThumbnail = reel.thumbnail || 'assets/reel1.jpg';
            const safeVideoUrl = reel.videoUrl || '';

            return `
                <div class="live-section__reel-container">
                    ${safeVideoUrl ? `
                    <video class="live-section__reel-video" controls playsinline preload="metadata" poster="${safeThumbnail}">
                        <source src="${safeVideoUrl}" type="video/mp4">
                        Tu navegador no soporta el formato de video.
                    </video>` : `
                    <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">
                        <img class="live-section__reel-video" src="${safeThumbnail}" alt="${safeCaption}" loading="lazy">
                    </a>
                    <div class="live-section__reel-overlay">
                        <a href="${safeUrl}" class="btn btn--primary" target="_blank" rel="noopener noreferrer">
                            Ver reel en Instagram
                        </a>
                    </div>`}
                </div>
            `;
        }).join('');
    }

    async function loadLatestReels() {
        try {
            const response = await fetchFromApi(`/api/instagram-latest-reels?username=${INSTAGRAM_USERNAME}&limit=3&t=${Date.now()}`);
            const data = await response.json();
            if (Array.isArray(data.reels) && data.reels.length > 0) {
                renderLatestReels(data.reels);
                setApiStatus('ok', 'API conectada');
            } else {
                if (isLiveNow) {
                    setApiStatus('ok', 'Directo activo detectado');
                } else {
                    setApiStatus('checking', 'Instagram sin reels en este momento');
                }
            }
        } catch (error) {
            console.error('Error loading latest Instagram reels:', error);
            if (isLiveNow) {
                setApiStatus('ok', 'Directo activo detectado');
            } else {
                setApiStatus('error', 'API no disponible');
            }
        }
    }

    async function checkLiveStatus() {
        try {
            // First check if there's a manual override in the URL for testing
            const urlParams = new URLSearchParams(window.location.search);
            const isTestLive = urlParams.get('testlive') === 'true';

            let isLive = false;

            if (isTestLive) {
                isLive = true;
            } else {
                const response = await fetchFromApi(`/api/instagram-live-status?username=${INSTAGRAM_USERNAME}`);
                const data = await response.json();
                isLive = data.isLive;
            }
            isLiveNow = isLive;

            // Update UI based on live status
            if (isLive) {
                liveBadge.style.display = 'inline-flex';
                liveBanner.style.display = 'flex';
                if (reelsSection) reelsSection.style.display = 'none';
                setApiStatus('ok', 'Directo activo detectado');
            } else {
                liveBadge.style.display = 'none';
                liveBanner.style.display = 'none';
                if (reelsSection) reelsSection.style.display = 'grid'; // O el display original
            }
        } catch (error) {
            console.error('Error checking Instagram live status:', error);
            // On error, we default to hidden
            liveBadge.style.display = 'none';
            liveBanner.style.display = 'none';
            if (reelsSection) reelsSection.style.display = 'grid';
        }
    }

    async function syncInstagramSection() {
        // Forzamos orden: primero live, luego reels
        await checkLiveStatus();
        await loadLatestReels();
    }

    // Initial check with deterministic order
    syncInstagramSection();

    // Set interval for periodic checks
    setInterval(syncInstagramSection, CHECK_INTERVAL);
});
