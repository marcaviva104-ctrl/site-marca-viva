// scripts/services/product-filter-service.js
// Funções de busca e ordenação de produtos, compartilhadas entre pages/index.html
// (via shop-ui-controller.js) e pages/catalogo.html — antes duplicadas em ambos.
const ProductFilterService = {
    filterBySearch(products, searchVal) {
        const term = (searchVal || '').toLowerCase().trim();
        if (!term) return products;
        return products.filter(p =>
            (p.name || '').toLowerCase().includes(term) ||
            (p.category || '').toLowerCase().includes(term) ||
            (p.subcategory || '').toLowerCase().includes(term) ||
            (p.description || '').toLowerCase().includes(term)
        );
    },

    sortProducts(products, sortVal) {
        const list = [...products];
        if (sortVal === 'price_asc') list.sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sortVal === 'price_desc') list.sort((a, b) => (b.price || 0) - (a.price || 0));
        if (sortVal === 'name_asc') list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        return list;
    }
};

window.ProductFilterService = ProductFilterService;
