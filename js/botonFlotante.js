document.addEventListener('DOMContentLoaded', function () {
    const banner = document.getElementById('wa-banner');
    if (!banner) return;

    const CINCO_MIN = 5 * 60 * 1000;
    const lastDismissed = sessionStorage.getItem('wa_banner_dismissed_at');
    if (lastDismissed && Date.now() - parseInt(lastDismissed) < CINCO_MIN) {
        banner.remove();
        return;
    }

    setTimeout(function () {
        banner.classList.add('is-visible');
    }, 1500);

    function closeBanner() {
        banner.classList.remove('is-visible');
        setTimeout(function () { banner.remove(); }, 400);
        sessionStorage.setItem('wa_banner_dismissed_at', Date.now().toString());
    }

    const acceptBtn = document.getElementById('wa-banner-accept');
    if (acceptBtn) {
        acceptBtn.addEventListener('click', function () {
            closeBanner();
        });
    }

    const dismissBtn = document.getElementById('wa-banner-dismiss');
    if (dismissBtn) {
        dismissBtn.addEventListener('click', function () {
            closeBanner();
        });
    }
});
