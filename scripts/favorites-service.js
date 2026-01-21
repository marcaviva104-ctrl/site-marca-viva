/**
 * Favorites Service - Marca Viva
 * Gerencia favoritos com sincronização híbrida (LocalStorage + Supabase)
 */

class FavoritesService {
    constructor() {
        this.favorites = [];
        this.localStorageKey = 'mv_wishlist';
    }

    /**
     * Inicializar serviço
     */
    async init() {
        console.log('🎯 Favorites Service Init...');

        // Carregar favoritos do localStorage (cache local)
        this.favorites = this.getLocalFavorites();

        // Se usuário está logado, sincronizar com Supabase
        if (window.authService && window.authService.isAuthenticated()) {
            await this.syncWithDatabase();
        }

        this.updateCounter();
        console.log('✅ Favorites loaded:', this.favorites.length);
    }

    /**
     * Obter favoritos do localStorage
     */
    getLocalFavorites() {
        try {
            const stored = localStorage.getItem(this.localStorageKey);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Error loading favorites from localStorage:', e);
            return [];
        }
    }

    /**
     * Salvar favoritos no localStorage
     */
    saveLocalFavorites() {
        try {
            localStorage.setItem(this.localStorageKey, JSON.stringify(this.favorites));
            this.updateCounter();
        } catch (e) {
            console.error('Error saving favorites to localStorage:', e);
        }
    }

    /**
     * Sincronizar com banco de dados Supabase
     */
    async syncWithDatabase() {
        if (!window.supabase) {
            console.warn('Supabase não disponível para sync de favoritos');
            return;
        }

        try {
            const user = window.authService.getCurrentUser();
            if (!user) return;

            // 1. Buscar favoritos do servidor
            const { data: serverFavorites, error } = await window.supabase
                .from('user_favorites')
                .select('product_id')
                .eq('user_id', user.id);

            if (error) {
                console.error('Erro ao buscar favoritos do servidor:', error);
                return;
            }

            // 2. Merge: combinar favoritos locais com do servidor
            const serverIds = serverFavorites ? serverFavorites.map(f => f.product_id) : [];
            const localIds = this.favorites;

            // Favoritos que existem localmente mas não no servidor (enviar para servidor)
            const toUpload = localIds.filter(id => !serverIds.includes(id));

            // Favoritos que existem no servidor mas não localmente (baixar)
            const toDownload = serverIds.filter(id => !localIds.includes(id));

            // 3. Upload favoritos locais para servidor
            if (toUpload.length > 0) {
                const uploads = toUpload.map(productId => ({
                    user_id: user.id,
                    product_id: productId
                }));

                await window.supabase
                    .from('user_favorites')
                    .insert(uploads)
                    .select();

                console.log(`📤 Uploaded ${toUpload.length} favorites to server`);
            }

            // 4. Merge completo
            this.favorites = [...new Set([...localIds, ...toDownload])];
            this.saveLocalFavorites();

            console.log('🔄 Favorites synced:', this.favorites.length);

        } catch (err) {
            console.error('Erro ao sincronizar favoritos:', err);
        }
    }

    /**
     * Adicionar produto aos favoritos
     */
    async add(productId) {
        if (this.favorites.includes(productId)) {
            console.log('Product already in favorites');
            return false;
        }

        this.favorites.push(productId);
        this.saveLocalFavorites();

        // Se logado, salvar também no banco
        if (window.authService && window.authService.isAuthenticated()) {
            await this.addToDatabase(productId);
        }

        this.notifyChange('added', productId);
        return true;
    }

    /**
     * Remover produto dos favoritos
     */
    async remove(productId) {
        const index = this.favorites.indexOf(productId);
        if (index === -1) {
            console.log('Product not in favorites');
            return false;
        }

        this.favorites.splice(index, 1);
        this.saveLocalFavorites();

        // Se logado, remover também do banco
        if (window.authService && window.authService.isAuthenticated()) {
            await this.removeFromDatabase(productId);
        }

        this.notifyChange('removed', productId);
        return true;
    }

    /**
     * Toggle: adicionar ou remover
     */
    async toggle(productId) {
        if (this.isFavorite(productId)) {
            return await this.remove(productId);
        } else {
            return await this.add(productId);
        }
    }

    /**
     * Verificar se produto está nos favoritos
     */
    isFavorite(productId) {
        return this.favorites.includes(productId);
    }

    /**
     * Obter todos os favoritos
     */
    getAll() {
        return [...this.favorites];
    }

    /**
     * Obter contagem de favoritos
     */
    getCount() {
        return this.favorites.length;
    }

    /**
     * Adicionar ao banco de dados
     */
    async addToDatabase(productId) {
        if (!window.supabase) return;

        try {
            const user = window.authService.getCurrentUser();
            if (!user) return;

            const { error } = await window.supabase
                .from('user_favorites')
                .insert({
                    user_id: user.id,
                    product_id: productId
                });

            if (error && error.code !== '23505') { // 23505 = duplicate key
                console.error('Erro ao adicionar favorito no banco:', error);
            }
        } catch (err) {
            console.error('Erro ao adicionar favorito:', err);
        }
    }

    /**
     * Remover do banco de dados
     */
    async removeFromDatabase(productId) {
        if (!window.supabase) return;

        try {
            const user = window.authService.getCurrentUser();
            if (!user) return;

            const { error } = await window.supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', user.id)
                .eq('product_id', productId);

            if (error) {
                console.error('Erro ao remover favorito do banco:', error);
            }
        } catch (err) {
            console.error('Erro ao remover favorito:', err);
        }
    }

    /**
     * Limpar todos os favoritos
     */
    async clearAll() {
        this.favorites = [];
        this.saveLocalFavorites();

        if (window.authService && window.authService.isAuthenticated()) {
            await this.clearDatabase();
        }

        this.notifyChange('cleared');
    }

    /**
     * Limpar favoritos do banco
     */
    async clearDatabase() {
        if (!window.supabase) return;

        try {
            const user = window.authService.getCurrentUser();
            if (!user) return;

            await window.supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', user.id);
        } catch (err) {
            console.error('Erro ao limpar favoritos:', err);
        }
    }

    /**
     * Atualizar contador no header
     */
    updateCounter() {
        const counter = document.getElementById('favorites-counter');
        if (counter) {
            const count = this.getCount();
            counter.textContent = count;
            counter.style.display = count > 0 ? 'flex' : 'none';
        }
    }

    /**
     * Notificar mudanças (para atualizar UI)
     */
    notifyChange(action, productId = null) {
        const event = new CustomEvent('favorites:changed', {
            detail: {
                action,
                productId,
                count: this.getCount(),
                favorites: this.getAll()
            }
        });
        document.dispatchEvent(event);
        this.updateCounter();
    }
}

// Criar instância global
const favoritesService = new FavoritesService();
window.favoritesService = favoritesService;

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    favoritesService.init();
});

// Sincronizar quando usuário faz login
document.addEventListener('auth:stateChanged', async () => {
    if (window.authService && window.authService.isAuthenticated()) {
        await favoritesService.syncWithDatabase();
    }
});
