function renderStars(rating) {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function buildReviewCard(review) {
    const card = document.createElement('div');
    card.className = 'testimonials__card';
    card.innerHTML = `
        <div class="testimonials__stars">${renderStars(review.rating)}</div>
        <p class="testimonials__text">"${review.text}"</p>
        <div class="testimonials__author">
            ${review.photo ? `<img src="${review.photo}" alt="${review.author}" class="testimonials__photo" loading="lazy" referrerpolicy="no-referrer">` : ''}
            <div>
                <span class="testimonials__name">${review.author}</span>
                <span class="testimonials__location">Google · ${review.time}</span>
            </div>
        </div>
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
        data.reviews.slice(0, 3).forEach(review => {
            grid.appendChild(buildReviewCard(review));
        });
    } catch {
        // Mantiene las reseñas estáticas si la API falla
    }
}

document.addEventListener('DOMContentLoaded', loadGoogleReviews);
