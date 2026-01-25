# 📦 Interface: Catálogo e Produto

**Status**: Produção
**Acesso**: `/index.html#catalogo`, `/produto.html?id=...`

---

## 1. Visão Geral
Esta interface engloba a vitrine virtual da loja (listagem de produtos) e a página de detalhes de cada item.

**Objetivo Principal**: Ajudar o cliente a encontrar o que deseja e convencê-lo a comprar.

## 2. Funcionalidades (Catálogo)
*   **Filtros**: Por categoria (Kits, Garrafas, Cadernos, etc.).
*   **Busca**: Barra de pesquisa em tempo real (filtra por nome e descrição).
*   **Ordenação**: Preço (Maior/Menor) e Relevância.
*   **Visualização**: Alternar entre Grade (Grid) e Lista.

## 3. Funcionalidades (Página do Produto)
*   **Detalhes**: Nome, SKU, Preço, Descrição completa.
*   **Galeria**: Carrossel de imagens do produto.
*   **Seleção**: Escolha de variação (Cor, Tamanho - se houver) e Quantidade.
*   **Ação**: Botão "Adicionar ao Carrinho" com feedback visual (Toast).

---

## 4. Regras de Negócio

### 🔍 Busca
*   A busca deve ignorar acentos e maiúsculas/minúsculas.
*   Se não encontrar nada, deve exibir mensagem amigável "Nenhum produto encontrado".

### 🛒 Compra
*   Quantidade mínima: 1 item.
*   Ao adicionar ao carrinho, não redirecionar imediatamente; abrir o carrinho lateral.

---

## 5. Arquitetura Técnica

### Arquivos Principais
| Arquivo | Função |
| :--- | :--- |
| `scripts/pages/product.js` | **Página Única**: Lógica de carregar dados de 1 produto via URL Param (`?id=123`). |
| `scripts/services/products.js` | **API**: Busca lista completa ou produto único do Supabase. |
| `styles/pages/shop.css` | **Estilo**: Grade de produtos e filtros. |
| `styles/pages/produto.css` | **Estilo**: Layout da página de detalhes. |

---

## 6. "Cemitério" (Histórico)
*   *Lógica antiga de reviews (`produto-reviews.js`) foi movida mas ainda não está ativa na V1.*
