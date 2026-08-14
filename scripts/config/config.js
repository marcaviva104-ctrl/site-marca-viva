/**
 * ✅ CONFIGURAÇÕES SEGURAS - USANDO VARIÁVEIS DE AMBIENTE
 * 
 * Este arquivo agora usa variáveis de ambiente do Vercel para proteger tokens sensíveis.
 * 
 * COMO FUNCIONA:
 * 1. No Vercel, você adiciona as variáveis de ambiente no painel
 * 2. Durante o build, o Vercel injeta essas variáveis
 * 3. Tokens sensíveis NUNCA ficam expostos no código
 * 
 * PARA DESENVOLVIMENTO LOCAL:
 * - Os valores padrão (fallback) são usados quando não há variáveis de ambiente
 * - Ideal para testes locais
 * 
 * PARA PRODUÇÃO (VERCEL):
 * - Configure as variáveis de ambiente no painel do Vercel
 * - Veja o arquivo .env.example para referência
 */

// Função auxiliar para pegar variáveis de ambiente com fallback
function getEnvVar(varName, fallback) {
    // Tenta pegar do objeto de ambiente (injetado pelo Vercel em build time)
    if (typeof process !== 'undefined' && process.env && process.env[varName]) {
        return process.env[varName];
    }
    // Fallback para desenvolvimento local
    return fallback;
}

// ✅ SUPABASE - Chaves PÚBLICAS (seguro expor)
const SUPABASE_URL = getEnvVar('SUPABASE_URL', 'https://qnudbyhnqtsxlqwgkmal.supabase.co');
const SUPABASE_KEY = getEnvVar('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFudWRieWhucXRzeGxxd2drbWFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3MTM2NjMsImV4cCI6MjA4MzI4OTY2M30.eedi0r5O0XWXV8UhoELO7HfauxX01d3JbZBh82JgCIQ');

// ✅ MERCADO PAGO - Chave PÚBLICA (seguro expor)
// ⚠️ IMPORTANTE: Configure a sua chave APP_USR-... real no Vercel Environments
// Usaremos a chave TEST- como fallback local para não quebrar a tela de checkout.
const MP_PUBLIC_KEY = getEnvVar('MP_PUBLIC_KEY', 'TEST-e57f78e6-3ef2-4341-b69f-bcc7701d100a');

// 🔒 MELHOR ENVIO — REMOVIDO EM 14/08/2026
//
// O token ficava escrito por extenso aqui, e este arquivo está no GitHub.
// Ou seja: era uma senha pública. Nenhum código do site usava — a integração
// já tinha sido desligada, e o frete hoje sai do shipping-service.js
// (fixo / grátis / retirada).
//
// ⚠️ O token antigo já ficou exposto no histórico do Git.
//    REVOGUE ele no painel do Melhor Envio, mesmo sem usar.
//
// Quando o Melhor Envio voltar (Etapa 4 do replanejamento), o token NÃO volta
// para cá: vai para uma Edge Function do Supabase, guardado por loja, onde o
// navegador do cliente não alcança.


// --- CONFIGURAÇÕES GERAIS DO SISTEMA ---

// CRM: Radar de Cliente VIP
const CRM_CONFIG = {
    VIP_THRESHOLD: 1000, // Valor mínimo para ser VIP (Mude aqui!)
    VIP_ICON: '💎',      // Ícone do VIP
    DEBT_ICON: '🚩',      // Ícone de Devedor
    MARGIN_THRESHOLD: 30 // Alerta quando margem for menor que X%
};

// ✅ CRITICAL: Export Supabase config to window so supabase-client.js can access
window.SUPABASE_URL = SUPABASE_URL;
window.SUPABASE_KEY = SUPABASE_KEY;

// Expose globally
window.CRM_CONFIG = CRM_CONFIG;

/**
 * PIN para acesso temporário ao admin (página pages/temp-admin-access.html).
 * Deixe '' em produção. Em local, pode definir ex.: '123456' só enquanto testa.
 */
window.MV_TEMP_ADMIN_PIN = '';
