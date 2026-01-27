/**
 * SCRIPT DE TESTE AUTOMÁTICO (SIMULAÇÃO)
 * Copie e cole este código no Console do Navegador (F12) na página checkout.html
 * ou execute para ver o log.
 */

async function testPurchaseFlow() {
    console.clear();
    console.log("%c🧪 INICIANDO TESTE AUTOMÁTICO DE COMPRA...", "color: #f97316; font-size: 16px; font-weight: bold;");

    // 1. Simular Usuário
    const mockUser = {
        id: "test-user-" + Date.now(),
        name: "Tester Automático",
        email: "tester@marcaviva.com",
        cpf: "000.000.000-00",
        address: {
            zip: "30000-000",
            street: "Rua de Teste",
            number: "123",
            city: "Belo Horizonte"
        }
    };
    console.log("👤 Usuário Mock Criado:", mockUser.name);

    // 2. Simular Carrinho com Produto B2B
    const mockCart = [
        {
            productId: "prod-123",
            name: "Camisa Teste Atacado",
            price: 25.00, // Preço de atacado simulado
            qty: 100, // Quantidade B2B
            customization: "Logo Frente e Verso",
            total: 2500.00
        }
    ];
    console.log("🛒 Carrinho Simulado:", mockCart);

    // 3. Montar Dados do Protocolo
    const protocolPayload = {
        client_id: mockUser.id,
        total_amount: 2500.00,
        notes: "TESTE AUTOMÁTICO VIA CONSOLE",
        items: mockCart
    };

    // 4. Tentar Criar no Backend
    console.log("🚀 Enviando para KanbanService...");

    try {
        if (!window.KanbanService) {
            throw new Error("Erro: KanbanService não carregado na página. Você está em checkout.html?");
        }

        const result = await window.KanbanService.createProtocol(protocolPayload);

        if (result.success) {
            console.log("%c✅ SUCESSO! Protocolo Criado:", "color: #10b981; font-size: 14px; font-weight: bold;", result.data);
            console.log(`🆔 ID do Protocolo: ${result.data.id}`);
            alert(`SUCESSO!\nProtocolo Gerado: ${result.data.id}\n\nO sistema está funcionando.`);
        } else {
            console.error("❌ FALHA no Backend:", result.error);
            alert("FALHA ao criar protocolo. Veja o console.");
        }

    } catch (e) {
        console.error("❌ ERRO CRÍTICO:", e);
        alert("Erro ao executar teste. Verifique se você está na página correta.");
    }
}

// Expor globalmente para fácil acesso
window.runTest = testPurchaseFlow;
console.log("👉 Para rodar o teste, digite: runTest()");
