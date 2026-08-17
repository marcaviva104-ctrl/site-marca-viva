// ================================================
// WhatsApp/CNPJ Integration - Marca Viva
// ================================================
// Configuração centralizada para WhatsApp e CNPJ exibidos no site.
// Os valores são carregados do admin (Supabase, global_settings) se
// disponíveis; os campos abaixo são só o fallback de último recurso,
// usado antes do carregamento assíncrono terminar ou se o Supabase
// estiver indisponível.
// ================================================

const WhatsAppConfig = {
    // 📱 NÚMERO DO WHATSAPP (fallback se não houver config no admin)
    _defaultPhone: '5531987398136',
    phone: '5531987398136',

    // 🧾 CNPJ (fallback se não houver config no admin)
    _defaultCnpj: '63.751.909/0001-00',
    cnpj: '63.751.909/0001-00',

    // 💬 MENSAGENS PRÉ-CONFIGURADAS
    messages: {
        default: 'Olá! Vim pelo site e gostaria de saber mais sobre produtos personalizados.',
        product: (productName) => `Olá! Vi o produto "${productName}" no site e gostaria de mais informações.`,
        quote: 'Olá! Gostaria de solicitar um orçamento para produtos personalizados.',
        support: 'Olá! Preciso de ajuda com meu pedido.'
    },

    // 🎨 CONFIGURAÇÕES VISUAIS
    buttonText: 'Fale Conosco',
    buttonColor: '#25D366',
    position: 'bottom-right',

    /**
     * Carrega o número do WhatsApp e o CNPJ do Supabase (via SettingsService).
     * Se não encontrar, mantém os valores padrão.
     */
    async loadFromSettings() {
        try {
            if (window.SettingsService) {
                const settings = await SettingsService.getGlobalSettings();
                if (settings && settings.whatsapp && settings.whatsapp.trim() !== '') {
                    this.phone = settings.whatsapp.replace(/\D/g, ''); // remove caracteres não numéricos
                    console.log('[WhatsApp] Número carregado do admin:', this.phone);
                }
                if (settings && settings.cnpj && settings.cnpj.trim() !== '') {
                    this.cnpj = settings.cnpj;
                }
            }
        } catch (e) {
            console.warn('[WhatsApp] Não foi possível carregar config do admin, usando padrão.', e);
        }
    },

    // ⚙️ GERAR LINK WHATSAPP
    getLink(message = 'default') {
        const msg = typeof message === 'string' && this.messages[message]
            ? this.messages[message]
            : message;

        const encodedMessage = encodeURIComponent(typeof msg === 'function' ? msg('') : msg);
        return `https://wa.me/${this.phone}?text=${encodedMessage}`;
    },

    // 🚀 ABRIR WHATSAPP
    open(message = 'default') {
        const link = this.getLink(message);
        window.open(link, '_blank');
    }
};

// Exportar globalmente
window.WhatsAppConfig = WhatsAppConfig;

// Carregar configurações do admin assim que o SettingsService estiver disponível
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => WhatsAppConfig.loadFromSettings());
} else {
    WhatsAppConfig.loadFromSettings();
}
