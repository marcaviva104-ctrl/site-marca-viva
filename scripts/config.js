/**
 * ☑️ CONFIGURAÇÕES DE SEGURANÇA - LEIA ANTES DE USAR EM PRODUÇÃO
 * 
 * ⚠️ AVISO CRÍTICO DE SEGURANÇA ⚠️
 * 
 * Os tokens e chaves abaixo estão EXPOSTOS no código do frontend.
 * Isso significa que QUALQUER PESSOA pode ver esses valores ao inspecionar o site.
 * 
 * PARA USO EM PRODUÇÃO:
 * 1. NUNCA exponha tokens privados aqui
 * 2. Use apenas chaves PÚBLICAS (como SUPABASE_KEY público)
 * 3. Mova tokens sensíveis para variáveis de ambiente no backend
 * 4. Considere usar um proxy backend para chamadas de API sensíveis
 * 
 * Tokens atualmente expostos (RISCO DE SEGURANÇA):
 * - MELHOR_ENVIO_TOKEN: Pode ser usado por terceiros para fazer chamadas em seu nome
 * 
 * RECOMENDAÇÃO URGENTE:
 * - Crie um endpoint backend que use o MELHOR_ENVIO_TOKEN
 * - Frontend chama seu backend, backend chama Melhor Envio
 * - Assim o token nunca é exposto ao público
 */

const SUPABASE_URL = 'https://qnudbyhnqtsxlqwgkmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AMo1o9yvNV-p_qSE2j5Ztw_7CM1oYeL'; // ✅ Chave PÚBLICA - OK expor
const MP_PUBLIC_KEY = 'TEST-e57f78e6-3ef2-4341-b69f-bcc7701d100a'; // ✅ Chave PÚBLICA de TESTE - OK

// ⚠️ ATENÇÃO: Token privado exposto - RISCO DE SEGURANÇA
// TODO: Mover para backend e criar endpoint proxy
const MELHOR_ENVIO_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMTYyMzcwNDVjYWIzYmE0OGI0ODE1ODc3MzljOGM1ZjU1MTk3YzFhOThjODNkOGRhODcyMDM1YWMwYzZhZGMwNjMzODgxYjVhNTg5ODlhM2EiLCJpYXQiOjE3Njg5Mjk2NDkuNzAxNjk5LCJuYmYiOjE3Njg5Mjk2NDkuNzAxNzAyLCJleHAiOjE4MDA0NjU2NDkuNjg3NDc5LCJzdWIiOiJhMGUyMDA0NC04NzI3LTRkOTktYjJmNC0xMTNlNDFmOGMzYzUiLCJzY29wZXMiOlsiY2FydC1yZWFkIiwiY2FydC13cml0ZSIsImNvbXBhbmllcy1yZWFkIl19.urgQgJqshgrpU_41tHi-kYv74DBO7omlPozDCEghDdEITeNUBXvF3xBpGVSAwDx92Y1Q57dLlczlsYpQ1UzfnNGTfZuRtwKCHgwtTR-zzwbbrtIOXvaGFUiiCFaaUvvfUWhog7mWNrZbf7TtHoNjWkkWv9UClhnRZi2y5oSBH3NmrvuhkJ4dspNqswPLmA58OpqrK_INBMzCUpkwOPGXsksB9F8NKtIHnyHhLnKkuA-AHOK46VcylB-QUJRoqQLyWAw_NO9YUWBJueLjJaTKJ2WF3SD9hB5aj2XdtV4GBkR2OI18PftaQTIfBTC9wlah5vpF6bHxxN6kYOw9Mij3zwgkIGwZvdLlkXt0Hmz-ta3IcRFPcuyPO10rw24I7HHNZ2TTR6VM7ECN0cvuKEz66veb6n5iFBDYrwWc3WAsfBqepZDKubtwi29Mo07lgjG-Tn1hsPsW2jBWJxl8ZdnLtCXnhe9UqmBwQpxgV5kWJP0ildiCDRYJufhS8eGYDjPoLdy6wH8oDsHTqOx4K481vDjbH2W-ynkvU71tuTHr63PyYIt0l0lhjxKvXzbZarvGxwNk0oTRMlHiKSk_Ht539I4KBbw8I-gku4zEwkuIgaJp2e3QM2jLuC586XsBHfbM2sykC9xIHytIdHaxBeHEpU4ZJyLsBN_vkGbG1O7MrTE';

const MELHOR_ENVIO_FROM_CEP = '32600-325'; // ✅ CEP público - OK expor

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

// Expose globally
window.CRM_CONFIG = CRM_CONFIG;
