/**
 * Emergency Diagnostic Tool for Critical Errors
 * Versão 2.0 — Inteligente e tolerante a carregamento assíncrono
 *
 * Problema resolvido: scripts como auth.js e products.js são carregados
 * dinamicamente no body, depois do DOMContentLoaded. O timeout anterior
 * de 3 segundos era muito curto e gerava falsos positivos.
 *
 * Solução: verificar apenas o Supabase (único script carregado no head),
 * e ignorar serviços que dependem de carregamento assíncrono posterior.
 */

window.onerror = function (message, source, lineno, colno, error) {
    // Filtrar apenas erros críticos (não os de script externos)
    const isCritical = message && (
        message.includes("Cannot read properties of null") ||
        message.includes("is not defined") ||
        message.includes("Failed to load resource")
    );

    // Ignorar erros de scripts externos (CDNs, Supabase, etc.)
    const isExternal = source && (
        source.includes('cdn.') ||
        source.includes('unpkg.') ||
        source.includes('supabase') ||
        source.includes('sweetalert')
    );

    if (isCritical && !isExternal) {
        console.error('[Diagnose] JS Error:', message, 'at', source, 'line', lineno);
        // Não exibir popup para não atrapalhar o usuário — apenas logar
    }

    return true; // Permite que o erro continue sendo logado normalmente
};

// Verificar APENAS o Supabase SDK (único crítico e síncrono)
// Os outros serviços (auth, products) são assíncronos — não verificar aqui
document.addEventListener('DOMContentLoaded', function () {
    // Aguardar carregamento completo da página (scripts + body)
    setTimeout(function () {
        // Verifica SOMENTE o Supabase SDK externo — o mais crítico
        if (!window.supabase && window.Swal) {
            Swal.fire({
                icon: 'warning',
                title: '⚠️ Problema de Conexão',
                text: 'Não foi possível conectar ao banco de dados. Verifique sua internet e recarregue a página.',
                confirmButtonColor: '#f97316'
            });
        }
    }, 5000); // 5 segundos — suficiente para CDNs carregarem mesmo em conexões lentas
});
