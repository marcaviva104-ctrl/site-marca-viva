// ================================================
// LGPD Cookies Banner - Marca Viva
// ================================================
// Banner de consentimento de cookies conforme LGPD
// ================================================

(function () {
    'use strict';

    const COOKIE_NAME = 'marcaviva_cookies_consent';
    const COOKIE_EXPIRY_DAYS = 365;

    // Verificar se já deu consentimento
    function hasConsent() {
        return localStorage.getItem(COOKIE_NAME) === 'accepted';
    }

    // Salvar consentimento
    function saveConsent() {
        localStorage.setItem(COOKIE_NAME, 'accepted');
        localStorage.setItem(COOKIE_NAME + '_date', new Date().toISOString());
    }

    // Criar banner
    function createBanner() {
        const banner = document.createElement('div');
        banner.id = 'cookies-banner';
        banner.innerHTML = `
            <div class="cookies-content">
                <div class="cookies-icon">
                    <i class="ph-fill ph-cookie"></i>
                </div>
                <div class="cookies-text">
                    <h4>🍪 Cookies e Privacidade</h4>
                    <p>Utilizamos cookies para melhorar sua experiência, personalizar conteúdo e analisar nosso tráfego. 
                    Ao continuar navegando, você concorda com nossa <a href="privacidade.html" target="_blank">Política de Privacidade</a>.</p>
                </div>
                <div class="cookies-actions">
                    <button id="cookies-accept" class="btn-accept">
                        <i class="ph-bold ph-check"></i> Aceitar
                    </button>
                    <button id="cookies-reject" class="btn-reject">
                        Recusar
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(banner);

        // Event listeners
        document.getElementById('cookies-accept').addEventListener('click', function () {
            saveConsent();
            closeBanner();
            initializeAnalytics(); // Inicializar Google Analytics após consentimento
        });

        document.getElementById('cookies-reject').addEventListener('click', function () {
            localStorage.setItem(COOKIE_NAME, 'rejected');
            closeBanner();
        });

        // Mostrar banner com animação
        setTimeout(() => {
            banner.classList.add('show');
        }, 1000);
    }

    // Fechar banner
    function closeBanner() {
        const banner = document.getElementById('cookies-banner');
        if (banner) {
            banner.classList.remove('show');
            setTimeout(() => {
                banner.remove();
            }, 300);
        }
    }

    // Inicializar Analytics (só após consentimento)
    function initializeAnalytics() {
        // Aqui você pode inicializar Google Analytics, Meta Pixel, etc.
        console.log('✅ Analytics inicializado com consentimento do usuário');

        // Exemplo: Google Analytics (descomente e configure seu ID)
        // window.dataLayer = window.dataLayer || [];
        // function gtag(){dataLayer.push(arguments);}
        // gtag('js', new Date());
        // gtag('config', 'GA_MEASUREMENT_ID');
    }

    // Inicializar
    document.addEventListener('DOMContentLoaded', function () {
        if (!hasConsent() && localStorage.getItem(COOKIE_NAME) !== 'rejected') {
            createBanner();
        } else if (hasConsent()) {
            // Usuário já aceitou, inicializar analytics
            initializeAnalytics();
        }
    });

})();
