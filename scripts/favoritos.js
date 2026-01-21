/**
 * Página de Favoritos - Script
 */

const favoritosApp = {
    products: [],
    favorites: [],

    async init() {
        console.log('📋 Favoritos Page Init...');

        // Aguardar serviços
        await this.waitForServices();

        // Carregar produtos
        await this.loadProducts();

        // Carregar favoritos
        this.loadFavorites();

        // Renderizar
        this.render();

        // Event listeners
        this.bindEvents();
    },

    async waitForServices() {
        let attempts = 0;
        while ((!window.productService || !window.favoritesService) && attempts < 30) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
        }
    },

    async loadProducts() {
        if (window.productService && window.productService.init) {
            await window.productService.init();
            this.products = window.productService.getAll();
        } else {
            // Fallback: cache
            this.products = JSON.parse(localStorage.getItem('mv_products') || '[]');
        }
    },

    loadFavorites() {
        if (window.favoritesService) {
            this.favorites = window.favoritesService.getAll();
        } else {
            this.favorites = JSON.parse(localStorage.getItem('mv_wishlist') || '[]');
        }
    },

    getFavoriteProducts() {
        return this.products.filter(p => this.favorites.includes(p.id));
    },

    render() {
        const favoriteProducts = this.getFavoriteProducts();
        const emptyState = document.getElementById('favorites-empty');
        const grid = document.getElementById('favorites-grid');

        if (favoriteProducts.length === 0) {
            emptyState.style.display = 'flex';
            grid.style.display = 'none';
            return;
        }

        emptyState.style.display = 'none';
        grid.style.display = 'grid';

        const isLoggedIn = window.authService && window.authService.isAuthenticated();

        grid.innerHTML = favoriteProducts.map(product => {
            // Rating (mesmo esquema do index)
            const mockRating = product.rating || (3.5 + Math.random() * 1.5);
            const mockReviewCount = product.reviewCount || Math.floor(Math.random() * 50) + 5;
            const fullStars = Math.floor(mockRating);
            const hasHalfStar = (mockRating % 1) >= 0.5;

            let starsHTML = '';
            for (let i = 0; i < 5; i++) {
                if (i < fullStars) {
                    starsHTML += '<i class="ph-fill ph-star" style="color: #f59e0b;"></i>';
                } else if (i === fullStars && hasHalfStar) {
                    starsHTML += '<i class="ph-fill ph-star-half" style="color: #f59e0b;"></i>';
                } else {
                    starsHTML += '<i class="ph ph-star" style="color: #cbd5e1;"></i>';
                }
            }

            const reviewHTML = `
                <div class="product-rating">
                    <div class="stars">${starsHTML}</div>
                    <span>${mockRating.toFixed(1)}</span>
                    <span>(${mockReviewCount})</span>
                </div>
            `;

            let priceHTML;
            if (isLoggedIn) {
                priceHTML = `<div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>`;
            } else {
                priceHTML = `<div class="product-price-locked">Login para ver preço</div>`;
            }

            return `
                <div class="product-card">
                    <button class="wishlist-btn active" onclick="favoritosApp.removeFavorite('${product.id}')" title="Remover dos favoritos">
                        <i class="ph-fill ph-heart"></i>
                    </button>

                    <div class="product-img-wrapper" onclick="window.location.href='produto.html?id=${product.id}'">
                        <div class="product-image" style="background-image: url('${product.image}');"></div>
                    </div>

                    <div class="product-info-center">
                        <h3 class="product-title">${product.name}</h3>
                        <div class="product-sku">${product.id.substring(0, 8).toUpperCase()}</div>

                        ${reviewHTML}

                        ${isLoggedIn ? '<div class="price-label">A partir de (100 un)</div>' : ''}
                        ${priceHTML}
                    </div>

                    <div class="product-actions">
                        <button class="btn btn-primary btn-sm" onclick="window.location.href='produto.html?id=${product.id}'">
                            <i class="ph-bold ph-eye"></i> Ver Detalhes
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    },

    async removeFavorite(productId) {
        if (window.favoritesService) {
            await window.favoritesService.remove(productId);
            this.loadFavorites();
            this.render();

            // Feedback visual
            Swal.fire({
                icon: 'success',
                title: 'Removido dos favoritos',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000
            });
        }
    },

    bindEvents() {
        // Atualizar quando favoritos mudarem
        document.addEventListener('favorites:changed', () => {
            this.loadFavorites();
            this.render();
        });
    }
};

// Init quando DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    favoritosApp.init();
});
