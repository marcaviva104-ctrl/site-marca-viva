const SUPABASE_URL = 'https://qnudbyhnqtsxlqwgkmal.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AMo1o9yvNV-p_qSE2j5Ztw_7CM1oYeL'; // Public Key

// --- CONFIGURAÇÕES GERAIS DO SISTEMA ---

// CRM: Radar de Cliente VIP
const CRM_CONFIG = {
    VIP_THRESHOLD: 1000, // Valor mínimo para ser VIP (Mude aqui!)
    VIP_ICON: '💎',      // Ícone do VIP
    DEBT_ICON: '🚩',      // Ícone de Devedor
    MARGIN_THRESHOLD: 30 // Alerta quando margem for menor que X%
};
// Expose globally if needed specifically, though consts in script tags are global in non-module
window.CRM_CONFIG = CRM_CONFIG;
