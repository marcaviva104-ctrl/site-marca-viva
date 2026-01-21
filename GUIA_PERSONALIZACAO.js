/**
 * GUIA: Como ativar personalização em produtos
 * 
 * Para que a seção de personalização apareça em um produto,
 * adicione um destes campos ao produto no banco de dados:
 * 
 * - customizable: true
 * - allowCustomization: true
 */

// EXEMPLO 1: Atualizar produto via Supabase
async function enableCustomization(productId) {
    const { data, error } = await window.supabase
        .from('products')
        .update({ customizable: true })
        .eq('id', productId);

    if (error) console.error('Erro:', error);
    else console.log('Personalização ativada!');
}

// EXEMPLO 2: Ao criar novos produtos
const newProduct = {
    name: 'Caneca Personalizada',
    price: 25.00,
    category: 'Brindes',
    customizable: true,  // ← Adicionar esta linha
    // ...outros campos
};

// EXEMPLO 3: Via Admin Panel
// No formulário de criar/editar produto, adicione um checkbox:
// ☑ Permitir personalização

/**
 * PRODUTOS QUE DEVEM TER PERSONALIZAÇÃO:
 * - Canecas
 * - Camisetas
 * - Cadernos
 * - Garrafas
 * - Mochilas
 * - Qualquer item que aceite logo/gravação
 * 
 * PRODUTOS SEM PERSONALIZAÇÃO:
 * - Power Banks (já vem personalizados)
 * - Produtos prontos sem opção de gravação
 */
