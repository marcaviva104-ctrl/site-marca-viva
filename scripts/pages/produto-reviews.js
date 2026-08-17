/**
 * Sistema de Reviews com Verificação de Compra
 * Complementa produto.js
 */

/**
 * Verifica se o usuário comprou este produto
 * @param {string} productId - ID do produto
 * @returns {Promise<boolean>} - True se comprou
 */
async function checkIfUserPurchased(productId) {
    try {
        const user = window.authService?.getCurrentUser();
        if (!user) return false;

        if (!window.supabase) {
            console.warn('Supabase não disponível para verificar compra');
            return false;
        }

        // Buscar protocolos entregues ou em produção do usuário
        const { data: protocols, error } = await window.supabase
            .from('protocols')
            .select('id, protocol_items(product_id, product_name)')
            .or(`client_id.eq.${user.id},client_email.eq.${user.email || ''}`)
            .in('status', ['delivered', 'done', 'production']);

        if (error) {
            console.error('Erro ao buscar pedidos:', error);
            return false;
        }

        if (!protocols || protocols.length === 0) return false;

        // Confere se o produto específico está entre os itens comprados.
        // Pedidos antigos (antes de protocol_items.product_id existir) não
        // têm esse campo — nesse caso, cai no fallback antigo de "tem algum
        // pedido entregue" só pra esses itens legados, pra não travar quem
        // comprou antes da migration.
        return protocols.some(protocol =>
            (protocol.protocol_items || []).some(item =>
                item.product_id ? item.product_id === productId : true
            )
        );

    } catch (err) {
        console.error('Erro ao verificar compra:', err);
        return false;
    }
}

/**
 * Atualiza a UI do botão de review baseado em verificação de compra
 */
async function updateReviewButtonState() {
    if (!currentProduct) return;

    const isLoggedIn = window.authService && window.authService.isAuthenticated();
    const writeBtn = document.getElementById('write-review-btn');

    if (!writeBtn) return;

    if (!isLoggedIn) {
        writeBtn.style.display = 'none';
        return;
    }

    // Verificar se comprou
    const hasPurchased = await checkIfUserPurchased(currentProduct.id);

    if (hasPurchased) {
        // Usuário comprou - pode avaliar
        writeBtn.style.display = 'flex';
        writeBtn.onclick = openReviewModal;
        writeBtn.innerHTML = '<i class="ph-bold ph-star"></i> Avaliar Produto';
    } else {
        // Usuário não comprou - mostrar mensagem
        writeBtn.style.display = 'flex';
        writeBtn.onclick = () => {
            Swal.fire({
                icon: 'info',
                title: 'Compra Necessária',
                text: 'Você precisa comprar este produto antes de avaliá-lo. Isso garante avaliações autênticas!',
                confirmButtonText: 'Entendi',
                confirmButtonColor: '#f97316'
            });
        };
        writeBtn.innerHTML = '<i class="ph-bold ph-lock"></i> Compre para Avaliar';
        writeBtn.style.opacity = '0.7';
    }
}

/**
 * Atualiza badge "Compra Verificada" ao salvar review
 */
async function saveReviewEnhanced(productId, rating, comment) {
    try {
        if (!window.supabase) {
            throw new Error('Supabase não disponível');
        }

        const user = window.authService?.getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        // Verificar se comprou (double-check)
        const hasPurchased = await checkIfUserPurchased(productId);

        const { data, error } = await window.supabase
            .from('product_reviews')
            .insert([
                {
                    product_id: productId,
                    user_id: user.id,
                    user_name: user.name || user.email || 'Usuário',
                    rating: rating,
                    comment: comment,
                    verified: hasPurchased // Marca como verificado se comprou
                }
            ])
            .select();

        if (error) {
            console.error('Erro ao salvar review:', error);
            return false;
        }

        console.log('Review salva com sucesso:', data);
        return true;

    } catch (err) {
        console.error('Erro ao salvar review:', err);
        return false;
    }
}

// Exportar para uso global
window.checkIfUserPurchased = checkIfUserPurchased;
window.updateReviewButtonState = updateReviewButtonState;
window.saveReviewEnhanced = saveReviewEnhanced;
