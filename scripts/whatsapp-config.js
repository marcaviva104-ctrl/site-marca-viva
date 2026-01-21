// ================================================
// WhatsApp Integration - Marca Viva
// ================================================
// Configuração centralizada para integração WhatsApp
// ================================================

const WhatsAppConfig = {
    // 📱 NÚMERO DO WHATSAPP (Configure aqui!)
    phone: '5531999999999', // Formato: 55 + DDD + Número (sem espaços)

    // 💬 MENSAGENS PRÉ-CONFIGURADAS
    messages: {
        default: 'Olá! Vim pelo site e gostaria de saber mais sobre produtos personalizados.',
        product: (productName) => `Olá! Vi o produto "${productName}" no site e gostaria de mais informações.`,
        quote: 'Olá! Gostaria de solicitar um orçamento para produtos personalizados.',
        support: 'Olá! Preciso de ajuda com meu pedido.'
    },

    // 🎨 CONFIGURAÇÕES VISUAIS
    buttonText: 'Fale Conosco',
    buttonColor: '#25D366', // Verde WhatsApp
    position: 'bottom-right', // 'bottom-right' ou 'bottom-left'

    // ⚙️ GERAR LINK WHATSAPP
    getLink(message = 'default') {
        const msg = typeof message === 'string' && this.messages[message]
            ? this.messages[message]
            : message;

        const encodedMessage = encodeURIComponent(msg);
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
