const GOOGLE_G_SVG = `<svg class="testimonials__glogo" viewBox="0 0 48 48" role="img" aria-label="Google"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/></svg>`;

const CHECK_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Mismos tonos suaves que las reseñas estáticas de la home
const AVATAR_COLORS = ['rosa', 'crema', 'malva'];

function renderStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildReviewCard(review, index) {
    const card = document.createElement('div');
    card.className = 'testimonials__card';

    const author = escapeHtml(review.author);
    const initial = (review.author || '?').trim().charAt(0).toUpperCase();
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];

    // Si Google devuelve foto se usa; si no, círculo con la inicial
    const avatar = review.photo
        ? `<img src="${escapeHtml(review.photo)}" alt="${author}" class="testimonials__photo" loading="lazy" referrerpolicy="no-referrer">`
        : `<span class="testimonials__avatar testimonials__avatar--${color}" aria-hidden="true">${escapeHtml(initial)}</span>`;

    const source = review.time
        ? `Reseña de Google · ${escapeHtml(review.time)}`
        : 'Reseña de Google';

    card.innerHTML = `
        <div class="testimonials__head">
            ${avatar}
            <div class="testimonials__head-info">
                <span class="testimonials__name">${author}</span>
                <div class="testimonials__stars" role="img" aria-label="${escapeHtml(review.rating)} de 5 estrellas">${renderStars(review.rating)}</div>
            </div>
            ${GOOGLE_G_SVG}
        </div>
        <p class="testimonials__text">"${escapeHtml(review.text)}"</p>
        <p class="testimonials__source">${CHECK_SVG}${source}</p>
    `;
    return card;
}

async function loadGoogleReviews() {
    const grid = document.getElementById('testimonials-grid');
    if (!grid) return;

    try {
        const res = await fetch('/api/google-reviews');
        if (!res.ok) return;

        const data = await res.json();
        if (!data.reviews || data.reviews.length === 0) return;

        const subtitle = document.querySelector('.testimonials__subtitle');
        if (subtitle && data.rating && data.total) {
            subtitle.textContent = `${data.rating} ⭐ en Google · ${data.total} opiniones`;
        }

        const ctaLink = document.querySelector('.testimonials__cta a');
        if (ctaLink) {
            ctaLink.textContent = 'Ver todas las opiniones en Google';
            ctaLink.href = `https://search.google.com/local/reviews?placeid=${encodeURIComponent(window._googlePlaceId || '')}`;
            ctaLink.target = '_blank';
            ctaLink.rel = 'noopener noreferrer';
        }

        grid.innerHTML = '';
        data.reviews.slice(0, 15).forEach((review, index) => {
            grid.appendChild(buildReviewCard(review, index));
        });

        // El carrusel debe rehacer clones y medidas con las tarjetas nuevas.
        // Opcional: si reviewsCarousel.js no está cargado, no pasa nada.
        if (typeof window.initReviewsCarousel === 'function') {
            window.initReviewsCarousel();
        }
    } catch {
        // Mantiene las reseñas estáticas si la API falla
    }
}

document.addEventListener('DOMContentLoaded', loadGoogleReviews);
