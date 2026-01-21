// ================================================
// Newsletter Service - Marca Viva
// ================================================
// Sistema de captura e gerenciamento de newsletter
// ================================================

const NewsletterService = {

    // Inscrever email
    async subscribe(email, name = null) {
        try {
            // Validar email
            if (!this.validateEmail(email)) {
                throw new Error('Email inválido');
            }

            // Inserir no banco
            const { data, error } = await supabase
                .from('newsletter_subscribers')
                .insert([{
                    email: email.toLowerCase().trim(),
                    name: name,
                    status: 'active',
                    source: 'website_footer'
                }])
                .select()
                .single();

            if (error) {
                // Se erro de duplicação (email já existe)
                if (error.code === '23505') {
                    throw new Error('Este email já está cadastrado!');
                }
                throw error;
            }

            return {
                success: true,
                message: '✅ Inscrição realizada com sucesso!',
                data: data
            };

        } catch (error) {
            console.error('Erro ao inscrever newsletter:', error);
            return {
                success: false,
                message: error.message || 'Erro ao processar inscrição. Tente novamente.'
            };
        }
    },

    // Validar email
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    },

    // Buscar todos subscribers (apenas admin)
    async getAllSubscribers() {
        try {
            const { data, error } = await supabase
                .from('newsletter_subscribers')
                .select('*')
                .order('subscribed_at', { ascending: false });

            if (error) throw error;

            return {
                success: true,
                data: data,
                total: data.length
            };

        } catch (error) {
            console.error('Erro ao buscar subscribers:', error);
            return {
                success: false,
                message: error.message
            };
        }
    },

    // Exportar subscribers para CSV (admin)
    exportToCSV(subscribers) {
        const headers = ['Email', 'Nome', 'Data Inscrição', 'Status'];
        const rows = subscribers.map(sub => [
            sub.email,
            sub.name || '-',
            new Date(sub.subscribed_at).toLocaleString('pt-BR'),
            sub.status
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.join(',') + '\n';
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `newsletter_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    }
};

// Exportar globalmente
window.NewsletterService = NewsletterService;
