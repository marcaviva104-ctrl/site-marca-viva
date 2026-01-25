# 🗺️ Mapa do Sistema (Site Marca Viva)

Este documento traduz a estrutura técnica do projeto para conceitos funcionais. Use este guia para saber onde mexer.

## 📁 Scripts (Lógica / `js`)


### `scripts/pages/` (Páginas Específicas)
Código que só roda em uma única página.

| Arquivo Original | O que ele faz? |
| :--- | :--- |
| `kanban.js` | **NOVO**: Lógica do Painel Admin (Drag & Drop e Gestão). |
| `track.js` | **NOVO**: Lógica de busca e exibição do rastreio pro cliente. |
| `checkout.js` | **Pagamento**: Controla o fluxo de compra, validação de cartão e envio para API. |
| `cart.js` | **Carrinho**: Adicionar/remover itens, calcular totais e salvar no navegador. |
| `product.js` | **Página do Produto**: Seleção de cores, tamanhos e galeria de fotos. |
| `admin.js` | **Painel Admin**: Gestão de produtos, pedidos e clientes (acesso restrito). |
| `profile.js` | **Minha Conta**: Dados do usuário, histórico de pedidos e endereços. |
| `login.js` | **Login/Cadastro**: Autenticação de usuários. |
| `confirmacao.js` | **Sucesso**: Página de "obrigado pela compra". |
| `stories.js` | **Stories**: Carrossel de destaques estilo Instagram na home. |

### `scripts/components/` (Componentes Reutilizáveis)
Pedaços de interface que aparecem em vários lugares.

| Arquivo Original | O que ele faz? |
| :--- | :--- |
| `cookies-banner.js` | **LGPD**: Aviso de cookies que aparece no rodapé. |
| `ui-auth.js` | **Modal de Login**: A janelinha de login que abre sem sair da página. |
| `favorites-service.js` | **Favoritos**: Lógica do botão de coração ❤️. |

### `scripts/services/` (O "Motor" / Back-end)
A lógica pesada que conecta tudo.

| Arquivo Original | O que ele faz? |
| :--- | :--- |
| `auth.js` | **Segurança**: Verifica se o usuário está logado (Supabase). |
| `shipping-service.js` | **Frete**: Cálculo de CEP e prazos de entrega. |
| `checkout-service.js` | **Transação**: Comunicação com Mercado Pago/Gateway. |
| `products.js` | **Catálogo**: Busca os produtos no banco de dados. |

---

## 🎨 Styles (Visual / `css`)

### `styles/base/` (Fundação)
| Arquivo Original | O que ele faz? |
| :--- | :--- |
| `global.css` | **Geral**: Cores (laranja/azul), fontes e resets básicos. |
| `design-system.css` | **Padrões**: Botões, cards e tipografia padrão da Marca Viva. |
| `mobile-optimization.css` | **Celular**: Ajustes para funcionar bem em telas pequenas. |

### `styles/pages/` (Visual das Páginas)
| Arquivo Original | O que ele faz? |
| :--- | :--- |
| `shop.css` | **Catálogo**: Grade de produtos e filtros. |
| `checkout.css` | **Pagamento**: Visual do checkout (formulários, resumo). |
| `landing.css` | **Home**: Banner principal, carrossel e seções da capa. |

### `styles/components/` (Visual dos Componentes)
| Arquivo Original | O que ele faz? |
| :--- | :--- |
| `cart-sidebar.css` | **Carrinho Lateral**: A gaveta que abre na direita. |
| `auth-modal.css` | **Modal Login**: Estilo da janela de login. |
| `whatsapp-button.css` | **Botão Zap**: O botão flutuante do WhatsApp. |
