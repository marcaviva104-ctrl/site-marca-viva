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
const MP_PUBLIC_KEY = getEnvVar('MP_PUBLIC_KEY', 'TEST-e57f78e6-3ef2-4341-b69f-bcc7701d100a');

// 🔒 MELHOR ENVIO - Token PROTEGIDO via variável de ambiente
// ⚠️ IMPORTANTE: Configure no Vercel em: Settings > Environment Variables
const MELHOR_ENVIO_TOKEN = getEnvVar(
    'MELHOR_ENVIO_TOKEN',
    'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMTYyMzcwNDVjYWIzYmE0OGI0ODE1ODc3MzljOGM1ZjU1MTk3YzFhOThjODNkOGRhODcyMDM1YWMwYzZhZGMwNjMzODgxYjVhNTg5ODlhM2EiLCJpYXQiOjE3Njg5Mjk2NDkuNzAxNjk5LCJuYmYiOjE3Njg5Mjk2NDkuNzAxNzAyLCJleHAiOjE4MDA0NjU2NDkuNjg3NDc5LCJzdWIiOiJhMGUyMDA0NC04NzI3LTRkOTktYjJmNC0xMTNlNDFmOGMzYzUiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIl19.urgQgJqshgrpU_41tHi-kYv74DBO7omlPozDCEghDdEITeNUBXvF3xBpGVSAwDx92Y1Q57dLlczlsYpQ1UzfnNGTfZuRtwKCHgwtTR-zzwbbrtIOXvaGFUiiCFaaUvvfUWhog7mWNrZbf7TtHoNjWkkWv9UClhnRZi2y5oSBH3NmrvuhkJ4dspNqswPLmA58OpqrK_INBMzCUpkwOPGXsksB9F8NKtIHnyHhLnKkuA-AHOK46VcylB-QUJRoqQLyWAw_NO9YUWBJueLjJaTKJ2WF3SD9hB5aj2XdtV4GBkR2OI18PftaQTIfBTC9wlah5vpF6bHxxN6kYOw9Mij3zwgkIGwZvdLlkXt0Hmz-ta3IcRFPcuyPO10rw24I7HHNZ2TTR6VM7ECN0cvuKEz66veb6n5iFBDYrwWc3WAsfBqepZDKubtwi29Mo07lgjG-Tn1hsPsW2jBWJxl8ZdnLtCXnhe9UqmBwQpxgV5kWJP0ildiCDRYJufhS8eGYDjPoLdy6wH8oDsHTqOx4K481vDjbH2W-ynkvU71tuTHr63PyYIt0l0lhjxKvXzbZarvGxwNk0oTRMlHiKSk_Ht539I4KBbw8I-gku4zEwkuIgaJp2e3QM2jLuC586XsBHfbM2sykC9xIHytIdHaxBeHEpU4ZJyLsBN_vkGbG1O7MrTE'
);

const MELHOR_ENVIO_FROM_CEP = getEnvVar('MELHOR_ENVIO_FROM_CEP', '32600-325');

// IMPORTANTE: 
// 1. O CEP de origem afeta o cálculo do frete
// 2. Cadastre peso e dimensões corretas nos produtos para frete preciso
// 3. Produtos sem dimensões usarão padrões: 10x20x30cm, 0.5kg


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

