/**
 * SCRIPT DE CORREÇÃO RAPIDA (FIX ZERO PRICE)
 * Execute no Console do Navegador (F12) na Home Page
 */

async function fixProductData() {
    console.log("🛠️ Iniciando Correção de Produto de Teste...");

    // Produto Válido com Tiers Corretos
    const validProduct = {
        id: "TEST-ADESIVO-001", // Mesmo ID que você está acessando
        name: "Adesivo Teste B2B",
        price: 2.00, // Preço Base
        image: "https://placehold.co/400x400?text=Adesivo",
        description: "Adesivo de alta qualidade para testes.",
        category: "Adesivos",
        min: 100, // Minimo geral
        price_tiers: [
            { min: 100, price: 1.50 }, // R$ 1,50 acima de 100
            { min: 500, price: 1.20 }, // R$ 1,20 acima de 500
            { min: 1000, price: 0.90 } // R$ 0,90 acima de 1000
        ],
        // Dimensoes para frete
        weight: 0.1,
        height: 5,
        width: 10,
        length: 10
    };

    // 1. Salvar no LocalStorage (Imediato)
    const products = JSON.parse(localStorage.getItem('mv_products') || '[]');
    const idx = products.findIndex(p => p.id === validProduct.id);

    if (idx >= 0) {
        products[idx] = validProduct;
    } else {
        products.push(validProduct);
    }

    localStorage.setItem('mv_products', JSON.stringify(products));
    console.log("✅ LocalStorage Atualizado!");

    // 2. Salvar no Supabase (Se disponível)
    if (window.productService) {
        try {
            await window.productService.saveProduct(validProduct);
            console.log("✅ Supabase Atualizado!");
        } catch (e) {
            console.warn("⚠️ Falha ao salvar no Supabase (ignorável se local funcionou)");
        }
    }

    alert("Correção Aplicada!\nRecarregue a página do produto agora.");
}

// Executar
fixProductData();
