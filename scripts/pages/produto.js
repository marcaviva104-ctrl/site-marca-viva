/**
 * Produto Page Logic
 * Carrega dados do produto via URL params
 * [UPDATED] Suporte a Preços Escalonados (B2B)
 */

let currentProduct = null;

// Pega ID da URL
function getProductIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Carrega Produto
async function loadProduct() {
    const productId = getProductIdFromURL();

    if (!productId) {
        Swal.fire('Erro', 'Produto não encontrado.', 'error').then(() => {
            window.location.href = 'index.html';
        });
        return;
    }

    try {
        // Buscar produto
        if (typeof productService !== 'undefined' && productService.getAll) {
            const products = productService.getAll();
            currentProduct = products.find(p => p.id === productId);
        }

        if (!currentProduct) {
            // Fallback cache
            const cached = JSON.parse(localStorage.getItem('mv_products') || '[]');
            currentProduct = cached.find(p => p.id === productId);
        }

        if (!currentProduct) {
            // Tenta buscar do Supabase se disponível (para pegar price_tiers atualizado)
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('products')
                    .select('*')
                    .eq('id', productId)
                    .single();

                if (data) currentProduct = data;
            }
        }

        if (!currentProduct) {
            throw new Error('Produto não encontrado');
        }

        // Normalizar price_tiers se for string (JSON do banco)
        if (typeof currentProduct.price_tiers === 'string') {
            try {
                currentProduct.price_tiers = JSON.parse(currentProduct.price_tiers);
            } catch (e) {
                currentProduct.price_tiers = [];
            }
        }

        renderProduct();
        loadRelatedProducts();
        updateCartBadge();
    } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível carregar o produto.', 'error').then(() => {
            window.location.href = 'index.html';
        });
    }
}

// Renderiza Produto
function renderProduct() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    // Título
    document.getElementById('page-title').innerText = `${currentProduct.name} | Marca Viva`;
    document.getElementById('product-title').innerText = currentProduct.name;
    document.getElementById('product-sku').innerText = `COD-${currentProduct.id.substring(0, 8).toUpperCase()}`;

    // Breadcrumb
    document.getElementById('breadcrumb-category').innerText = currentProduct.category || 'Produtos';
    document.getElementById('breadcrumb-product').innerText = currentProduct.name;

    // Imagem Principal
    const mainImage = document.getElementById('main-image');
    const imageUrl = currentProduct.image || 'https://via.placeholder.com/500?text=Sem+Imagem';
    mainImage.style.backgroundImage = `url('${imageUrl}')`;
    mainImage.style.cursor = 'zoom-in';
    mainImage.onclick = () => openLightbox(0);

    // Miniaturas (mock - múltiplas imagens)
    const thumbsContainer = document.getElementById('gallery-thumbs');
    window.productImages = [currentProduct.image, currentProduct.image, currentProduct.image, currentProduct.image];
    thumbsContainer.innerHTML = window.productImages.map((img, i) => `
        <div class="thumb-item ${i === 0 ? 'active' : ''}" 
             style="background-image: url('${img}')" 
             onclick="switchImage('${img}', this, ${i})"></div>
    `).join('');

    // Preço
    if (isLoggedIn) {
        renderPriceSection();
    } else {
        document.getElementById('product-price').innerText = 'Sob Consulta';
        document.getElementById('price-unit-label').style.display = 'none';

        // Bloquear botão se não logado
        const btn = document.getElementById('add-to-cart-btn');
        btn.innerHTML = '<i class="ph-bold ph-lock"></i> Faça Login para Comprar';
        btn.onclick = () => {
            Swal.fire({
                icon: 'info',
                title: 'Login Necessário',
                text: 'Faça login para ver preços e adicionar ao carrinho.',
                confirmButtonText: 'Ir para Login',
                confirmButtonColor: '#f97316'
            }).then((result) => {
                if (result.isConfirmed) window.location.href = 'login.html';
            });
        };
    }

    // Descrição
    document.getElementById('product-description').innerText = currentProduct.description || 'Produto de alta qualidade para brindes corporativos.';

    // Personalização (opcional)
    const customSection = document.getElementById('customization-section');
    if (currentProduct.customizable || currentProduct.allowCustomization) {
        customSection.style.display = 'block';
    } else {
        customSection.style.display = 'none';
    }

    // Especificações (opcional)
    const specsSection = document.getElementById('specifications-section');
    const specsTbody = document.getElementById('specs-tbody');
    if (currentProduct.specifications && Object.keys(currentProduct.specifications).length > 0) {
        specsSection.style.display = 'block';
        specsTbody.innerHTML = Object.entries(currentProduct.specifications).map(([key, value]) => `
            <tr>
                <td>${key}</td>
                <td>${value}</td>
            </tr>
        `).join('');
    } else {
        specsSection.style.display = 'none';
    }

    // Calc Total
    updateTotal();
}

// Renderiza a seção de preço (Preço base + Tabela Atacado)
function renderPriceSection() {
    const priceEl = document.getElementById('product-price');
    const labelEl = document.getElementById('price-unit-label');

    // Preço Base
    priceEl.innerText = `R$ ${currentProduct.price.toFixed(2).replace('.', ',')}`;
    labelEl.style.display = 'block';

    // Verificar se tem tiers
    const tiers = currentProduct.price_tiers;
    if (tiers && Array.isArray(tiers) && tiers.length > 0) {
        // Criar ou limpar container de tabela de preços
        let tierContainer = document.getElementById('tier-pricing-container');
        if (!tierContainer) {
            tierContainer = document.createElement('div');
            tierContainer.id = 'tier-pricing-container';
            tierContainer.style.marginTop = '15px';
            tierContainer.style.background = '#f8fafc';
            tierContainer.style.padding = '10px';
            tierContainer.style.borderRadius = '8px';
            tierContainer.style.fontSize = '0.9rem';

            // Inserir logo após o preço
            priceEl.parentElement.appendChild(tierContainer);
        }

        tierContainer.innerHTML = `
            <strong style="color:#f97316; display:block; margin-bottom:5px;">
                <i class="ph-bold ph-tag"></i> Descontos por Quantidade:
            </strong>
            <table style="width:100%; text-align:left; border-collapse: collapse;">
                <thead style="border-bottom: 1px solid #e2e8f0;">
                    <tr>
                        <th style="padding:4px;">Qtd. Mínima</th>
                        <th style="padding:4px;">Preço Unit.</th>
                    </tr>
                </thead>
                <tbody>
                    ${tiers.map(tier => `
                        <tr>
                            <td style="padding:4px; color:#475569;">+${tier.min} peças</td>
                            <td style="padding:4px; font-weight:bold; color:#1e293b;">R$ ${tier.price.toFixed(2).replace('.', ',')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
}

// Trocar Imagem
let currentImageIndex = 0;

function switchImage(imageUrl, thumbElement, index) {
    document.getElementById('main-image').style.backgroundImage = `url('${imageUrl}')`;
    document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
    thumbElement.classList.add('active');
    currentImageIndex = index;
}

// Ajustar Quantidade
function adjustQty(change) {
    const input = document.getElementById('qty-input');
    let val = parseInt(input.value) || 100;
    val += change;
    if (val < 100) val = 100; // Mínimo geral
    input.value = val;
    updateTotal();
}

// Calcula preço baseado na quantidade (Lógica B2B)
function getPriceForQty(qty) {
    if (!currentProduct) return 0;

    let finalPrice = currentProduct.price;
    const tiers = currentProduct.price_tiers;

    if (tiers && Array.isArray(tiers)) {
        // Encontrar o tier applicável (o maior min que seja <= qty)
        // Ex: Tiers: [{min: 100, price: 10}, {min: 500, price: 8}]
        // Qty: 600 -> Pega tier 500 (R$ 8)

        // Ordenar descrescente por min para achar o primeiro match
        const sortedTiers = [...tiers].sort((a, b) => b.min - a.min);
        const match = sortedTiers.find(t => qty >= t.min);

        if (match) {
            finalPrice = match.price;
        }
    }

    return finalPrice;
}

// Atualizar Total
function updateTotal() {
    if (!currentProduct) return;

    const isLoggedIn = window.authService && window.authService.isAuthenticated();
    if (!isLoggedIn) return;

    const qty = parseInt(document.getElementById('qty-input').value) || 100;

    // Novo cálculo com tiers
    const unitPrice = getPriceForQty(qty);
    const total = qty * unitPrice;

    // Atualiza Visual do Preço Unitário (se mudou)
    const priceEl = document.getElementById('product-price');
    if (priceEl) {
        if (unitPrice < currentProduct.price) {
            // Mostra desconto
            priceEl.innerHTML = `<span style="text-decoration:line-through; font-size:1rem; color:#94a3b8; margin-right:5px;">R$ ${currentProduct.price.toFixed(2).replace('.', ',')}</span> R$ ${unitPrice.toFixed(2).replace('.', ',')}`;
        } else {
            priceEl.innerText = `R$ ${unitPrice.toFixed(2).replace('.', ',')}`;
        }
    }

    const totalEl = document.getElementById('total-price');
    if (totalEl) totalEl.innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

// Add to Cart
function addToCart() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    if (!isLoggedIn) {
        Swal.fire({
            icon: 'info',
            title: 'Login Necessário',
            text: 'Faça login para adicionar ao carrinho.',
            confirmButtonText: 'Ir para Login',
            confirmButtonColor: '#f97316'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'login.html';
        });
        return;
    }

    if (!window.cartService) {
        Swal.fire('Erro', 'Erro ao carregar carrinho. Recarregue a página.', 'error');
        return;
    }

    const qty = parseInt(document.getElementById('qty-input').value) || 100;
    const customization = document.getElementById('customization-select').value;

    // Preço B2B
    const finalUnitPrice = getPriceForQty(qty);

    // Criar objeto produto com preço ajustado para o carrinho
    // Importante: O carrinho recalcula preço? O ideal é passar o preço travado ou a lógica ir pro carrinho.
    // Para simplificar, passamos o produto clonado com o preço unitário daquele lote.
    const productToAdd = {
        ...currentProduct,
        price: finalUnitPrice,
        originalPrice: currentProduct.price
    };

    window.cartService.addToCart(productToAdd, qty, customization);

    // Sucesso
    Swal.fire({
        icon: 'success',
        title: 'Adicionado ao Carrinho!',
        text: `${qty}x ${currentProduct.name} - Unit: R$ ${finalUnitPrice.toFixed(2)}`,
        showCancelButton: true,
        confirmButtonText: 'Ver Carrinho / Orçamento',
        cancelButtonText: 'Continuar Comprando',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#64748b'
    }).then((result) => {
        if (result.isConfirmed) {
            // Abre o sidebar do carrinho
            window.cartService.toggle();
        }
    });

    updateCartBadge();
}

// Produtos Relacionados
function loadRelatedProducts() {
    const container = document.getElementById('related-grid');

    if (!container) {
        console.warn('Related grid container not found');
        return;
    }

    let allProducts = [];
    if (typeof productService !== 'undefined' && productService.getAll) {
        allProducts = productService.getAll();
    } else {
        allProducts = JSON.parse(localStorage.getItem('mv_products') || '[]');
    }

    // Pegar produtos da mesma categoria, excluindo o produto atual
    const related = allProducts
        .filter(p => p.id !== currentProduct.id && p.category === currentProduct.category)
        .slice(0, 4);

    // Se não houver produtos da mesma categoria, pegar aleatórios
    if (related.length === 0) {
        related.push(...allProducts.filter(p => p.id !== currentProduct.id).slice(0, 4));
    }

    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    container.innerHTML = related.map(p => `
        <div class="related-product-card" onclick="window.location.href='produto.html?id=${p.id}'" style="cursor: pointer; background: white; border-radius: 12px; overflow: hidden; transition: transform 0.2s, box-shadow 0.2s;">
            <div style="aspect-ratio: 1; background: #f8fafc; background-image: url('${p.image}'); background-size: cover; background-position: center;"></div>
            <div style="padding: 15px;">
                <h4 style="font-size: 0.95rem; margin-bottom: 8px; color: #1e293b; font-weight: 600;">${p.name}</h4>
                <div style="color: ${isLoggedIn ? '#f97316' : '#64748b'}; font-weight: 700; font-size: 1.1rem;">
                    ${isLoggedIn ? `R$ ${p.price.toFixed(2).replace('.', ',')}` : 'Sob Consulta'}
                </div>
            </div>
        </div>
    `).join('');

    // Adicionar hover effect via CSS
    const style = document.createElement('style');
    style.textContent = `
        .related-product-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.1);
        }
    `;
    if (!document.getElementById('related-styles')) {
        style.id = 'related-styles';
        document.head.appendChild(style);
    }
}

// Update Cart Badge
function updateCartBadge() {
    if (!window.cartService) return;

    const count = window.cartService.getCount();
    const btn = document.getElementById('cart-float-btn');
    const badge = document.getElementById('cart-badge');

    if (badge) badge.innerText = count;
    if (btn) btn.style.display = count > 0 ? 'flex' : 'none';
}

// Cart Event Listener
document.addEventListener('cart:updated', (e) => {
    updateCartBadge();
});

// Listener para atualização de qty input
document.addEventListener('DOMContentLoaded', () => {
    const qtyInput = document.getElementById('qty-input');
    if (qtyInput) {
        qtyInput.addEventListener('change', updateTotal);
        // Também atualizar ao digitar
        qtyInput.addEventListener('keyup', updateTotal);
    }
});

// Init
window.addEventListener('load', () => {
    loadProduct();
    // Start Supabase if needed
    if (window.supabase) console.log('Supabase Ready');
});

// ===== LIGHTBOX FUNCTIONS =====
function openLightbox(index) {
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');

    currentImageIndex = index;
    lightboxImage.src = window.productImages[currentImageIndex];
    updateLightboxCounter();

    lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox(event) {
    // Only close if clicking overlay or close button
    if (event.target.id === 'lightbox' || event.target.closest('.lightbox-close')) {
        const lightbox = document.getElementById('lightbox');
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        event.stopPropagation();
    }
}

function nextImage(event) {
    event.stopPropagation();
    currentImageIndex = (currentImageIndex + 1) % window.productImages.length;
    document.getElementById('lightbox-image').src = window.productImages[currentImageIndex];
    updateLightboxCounter();
}

function prevImage(event) {
    event.stopPropagation();
    currentImageIndex = (currentImageIndex - 1 + window.productImages.length) % window.productImages.length;
    document.getElementById('lightbox-image').src = window.productImages[currentImageIndex];
    updateLightboxCounter();
}

function updateLightboxCounter() {
    const counter = document.getElementById('lightbox-counter');
    counter.innerText = `${currentImageIndex + 1} / ${window.productImages.length}`;
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox.classList.contains('active')) return;

    if (e.key === 'Escape') {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    } else if (e.key === 'ArrowRight') {
        nextImage({ stopPropagation: () => { } });
    } else if (e.key === 'ArrowLeft') {
        prevImage({ stopPropagation: () => { } });
    }
});

// ===== SHARE FUNCTIONS =====
function shareWhatsApp() {
    if (!currentProduct) return;

    const url = window.location.href;
    const text = `Confira este produto: ${currentProduct.name}\n\nVeja mais em: ${url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(whatsappUrl, '_blank');
}

function shareEmail() {
    if (!currentProduct) return;

    const url = window.location.href;
    const subject = `Produto: ${currentProduct.name}`;
    const body = `Olá!\n\n Encontrei este produto que pode te interessar:\n\n${currentProduct.name}\n\nVeja mais em: ${url}`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function copyLink() {
    const url = window.location.href;

    navigator.clipboard.writeText(url).then(() => {
        Swal.fire({
            icon: 'success',
            title: 'Link copiado!',
            text: 'Link do produto copiado.',
            timer: 2000,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }).catch(() => {
        Swal.fire({
            icon: 'info',
            title: url,
            confirmButtonText: 'Fechar'
        });
    });
}

// ===== REVIEWS FUNCTIONS =====
async function loadReviews() {
    if (!currentProduct) return;

    try {
        // Buscar avaliações reais do Supabase
        if (!window.supabase) {
            console.warn('Supabase não disponível. Reviews não serão carregadas.');
            renderReviews([]);
            return;
        }

        const { data: reviews, error } = await window.supabase
            .from('product_reviews')
            .select('*')
            .eq('product_id', currentProduct.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar reviews:', error);
            renderReviews([]);
            return;
        }

        // Converter formato do banco para formato esperado pela UI
        // Bug fix #2: Adiciona null check para evitar crash
        const formattedReviews = (reviews || []).map(r => ({
            id: r.id,
            productId: r.product_id,
            userName: r.user_name,
            rating: r.rating,
            date: new Date(r.created_at).toLocaleDateString('pt-BR'),
            comment: r.comment,
            verified: r.verified
        }));

        renderReviews(formattedReviews);

    } catch (err) {
        console.error('Erro ao carregar reviews:', err);
        renderReviews([]);
    }
}

function renderReviews(reviews) {
    const reviewsList = document.getElementById('reviews-list');
    const ratingNumber = document.getElementById('rating-number');
    const starsSummary = document.getElementById('stars-summary');
    const reviewsCount = document.getElementById('reviews-count');

    if (!reviews || reviews.length === 0) {
        reviewsList.innerHTML = '<div class="reviews-empty"><i class="ph-duotone ph-star"></i><p>Seja o primeiro a avaliar este produto!</p></div>';
        // Bug fix #3: Resetar elementos de rating quando não há reviews
        ratingNumber.textContent = '0,0';
        starsSummary.innerHTML = renderStars(0);
        reviewsCount.textContent = '(0)';
        return;
    }

    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    ratingNumber.textContent = avgRating.toFixed(1);
    reviewsCount.textContent = `média de ${reviews.length} avaliações do produto`;

    const fullStars = Math.floor(avgRating);
    starsSummary.innerHTML = Array.from({ length: 5 }, (_, i) => i < fullStars ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>').join('');

    reviewsList.innerHTML = reviews.map(review => {
        const initial = review.userName.charAt(0).toUpperCase();
        const stars = Array.from({ length: 5 }, (_, i) => i < review.rating ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>').join('');

        return `<div class="review-item">
            <div class="review-user">
                <div class="review-avatar">${initial}</div>
                <div class="review-user-info">
                    <div class="review-user-name">${review.userName}</div>
                    <div class="review-date">${review.date}</div>
                </div>
            </div>
            <div class="review-stars">${stars}</div>
            ${review.verified ? '<div class="review-verified"><i class="ph-bold ph-check-circle"></i> Compra verificada</div>' : ''}
            <div class="review-text">${review.comment}</div>
        </div>`;
    }).join('');

    checkIfUserCanReview();
}

function checkIfUserCanReview() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();
    const writeBtn = document.getElementById('write-review-btn');

    if (!isLoggedIn) {
        writeBtn.style.display = 'none';
        return;
    }

    // ✅ IMPLEMENTADO: Verificação real de compra
    if (typeof window.updateReviewButtonState === 'function') {
        window.updateReviewButtonState();
    } else {
        // Fallback caso produto-reviews.js não carregue
        writeBtn.style.display = 'flex';
    }

    // Auto-abrir modal se veio de link de notificação
    checkAutoOpenReview();
}

function checkAutoOpenReview() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('review') === 'true') {
        // Usuário veio do email/notificação
        setTimeout(() => {
            openReviewModal();
            // Limpar parâmetro da URL
            const newUrl = window.location.pathname + '?id=' + currentProduct.id;
            window.history.replaceState({}, '', newUrl);
        }, 1000);
    }
}

function openReviewModal() {
    const isLoggedIn = window.authService && window.authService.isAuthenticated();

    if (!isLoggedIn) {
        Swal.fire({
            icon: 'info',
            title: 'Login Necessário',
            text: 'Faça login para avaliar este produto.',
            confirmButtonText: 'Ir para Login',
            confirmButtonColor: '#f97316'
        }).then((result) => {
            if (result.isConfirmed) window.location.href = 'login.html';
        });
        return;
    }

    let selectedRating = 0;

    Swal.fire({
        title: 'Avaliar Produto',
        html: `
            <div style="text-align:left;">
                <p style="margin-bottom:10px;font-weight:600;">Nota:</p>
                <div id="rating-stars" style="font-size:2rem;color:#e5e7eb;margin-bottom:20px;cursor:pointer;">
                    <i class="ph-fill ph-star" data-rating="1"></i>
                    <i class="ph-fill ph-star" data-rating="2"></i>
                    <i class="ph-fill ph-star" data-rating="3"></i>
                    <i class="ph-fill ph-star" data-rating="4"></i>
                    <i class="ph-fill ph-star" data-rating="5"></i>
                </div>
                <textarea id="review-comment" class="swal2-textarea" placeholder="Conte sua experiência com este produto..." rows="4"></textarea>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Enviar Avaliação',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#f97316',
        width: '600px',
        didOpen: () => {
            const stars = document.querySelectorAll('#rating-stars i');
            stars.forEach((star, i) => {
                star.addEventListener('click', () => {
                    selectedRating = i + 1;
                    stars.forEach((s, idx) => s.style.color = idx < selectedRating ? '#f97316' : '#e5e7eb');
                });
            });
        },
        preConfirm: () => {
            const comment = document.getElementById('review-comment').value;

            if (selectedRating === 0) {
                Swal.showValidationMessage('Por favor, selecione uma nota de 1 a 5 estrelas');
                return false;
            }
            if (!comment.trim()) {
                Swal.showValidationMessage('Por favor, escreva um comentário sobre o produto');
                return false;
            }

            return { rating: selectedRating, comment: comment.trim() };
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const { rating, comment } = result.value;

            // Salvar no Supabase
            const saved = await saveReview(currentProduct.id, rating, comment);

            if (saved) {
                Swal.fire({
                    icon: 'success',
                    title: 'Avaliação enviada!',
                    text: 'Obrigado pelo seu feedback! Sua avaliação ajuda outros clientes.',
                    confirmButtonColor: '#10b981',
                    timer: 3000
                }).then(() => {
                    // Recarregar avaliações
                    loadReviews();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro ao enviar',
                    text: 'Não foi possível salvar sua avaliação. Tente novamente.',
                    confirmButtonColor: '#ef4444'
                });
            }
        }
    });
}

// Função para salvar avaliação no Supabase
async function saveReview(productId, rating, comment) {
    // ✅ Usar versão melhorada com verificação de compra
    if (typeof window.saveReviewEnhanced === 'function') {
        return await window.saveReviewEnhanced(productId, rating, comment);
    }

    // Fallback para versão original
    try {
        if (!window.supabase) {
            throw new Error('Supabase não disponível');
        }

        const user = window.authService?.getCurrentUser();
        if (!user) {
            throw new Error('Usuário não autenticado');
        }

        const { data, error } = await window.supabase
            .from('product_reviews')
            .insert([
                {
                    product_id: productId,
                    user_id: user.id,
                    user_name: user.name || user.email || 'Usuário',
                    rating: rating,
                    comment: comment,
                    verified: false // Admin pode marcar como verificado depois
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

// Helper para stars (usado no fallback se renderReviews for chamado sem reviews)
function renderStars(rating) {
    return Array.from({ length: 5 }, (_, i) => i < rating ? '<i class="ph-fill ph-star"></i>' : '<i class="ph ph-star"></i>').join('');
}

window.addEventListener('load', () => { setTimeout(() => loadReviews(), 500); });
