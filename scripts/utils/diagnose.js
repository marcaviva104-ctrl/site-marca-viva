/**
 * Emergency Diagnostic Tool for Critical Errors
 */

window.onerror = function (message, source, lineno, colno, error) {
    if (message.includes("Cannot read properties of null")) {
        if (window.Swal) {
            Swal.fire({
                icon: 'error',
                title: '🚨 Erro Crítico',
                html: `<strong>Erro:</strong> ${message}<br><strong>Arquivo:</strong> ${source}<br><strong>Linha:</strong> ${lineno}`,
                confirmButtonColor: '#ef4444'
            });
        } else {
            alert("🚨 ERRO CRÍTICO NO SITE:\n\n" + message + "\n\nArquivo: " + source + "\nLinha: " + lineno);
        }
    }
    return true;
};

// Detect if critical dependencies failed
document.addEventListener('DOMContentLoaded', function () {
    setTimeout(function () {
        let status = "✅ Sistema OK";

        if (!window.supabase) status = "❌ Supabase NÃO CARREGOU";
        if (!window.Swal) status = "❌ SweetAlert2 NÃO CARREGOU";
        if (!window.authService) status = "❌ Auth Service NÃO CARREGOU";
        // Nota: productService só existe em páginas do admin/produto — não verificar aqui


        if (status !== "✅ Sistema OK" && window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Problema de Carregamento',
                text: status + '\nPor favor, recarregue a página ou avise o suporte.',
                confirmButtonColor: '#f97316'
            });
        }
    }, 3000); // Wait 3 seconds after DOMContentLoaded
});
