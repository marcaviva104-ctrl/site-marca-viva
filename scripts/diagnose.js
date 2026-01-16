(function () {
    console.log("🔍 Diagnóstico Iniciado");

    // Catch Global Errors (Syntax, Runtime)
    window.onerror = function (message, source, lineno, colno, error) {
        // Filter out irrelevant extension errors if needed, but show everything for now
        alert("🚨 ERRO CRÍTICO NO SITE:\n\n" + message + "\n\nArquivo: " + source + "\nLinha: " + lineno);
        return false;
    };

    // Check Resources on Load
    window.addEventListener('load', () => {
        setTimeout(() => {
            let status = "";
            let hasError = false;

            if (!window.authService) { status += "❌ AuthService não carregou.\n"; hasError = true; }
            if (!window.cartService) { status += "❌ CartService não carregou.\n"; hasError = true; }
            if (!window.app) { status += "❌ App (Lógica) não carregou.\n"; hasError = true; }
            if (!window.supabase) { status += "❌ Supabase não carregou.\n"; hasError = true; }

            if (hasError) {
                alert("⚠️ PROBLEMA DE CARREGAMENTO:\n" + status + "\nPor favor, avise o suporte qual item falhou.");
            } else {
                // Optional: Confirm success so user knows scripts are active
                // alert("✅ Sistema Carregado Corretamente. Tente adicionar ao carrinho.");
                console.log("All systems operational.");

                // Hook into buttons to verify binding
                const buyBtns = document.querySelectorAll('.btn-buy-now');
                if (buyBtns.length === 0) {
                    // Check modal
                }
            }
        }, 1000);
    });
})();
