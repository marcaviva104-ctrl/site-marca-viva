# 📖 GUIA DE NAVEGAÇÃO - ONDE ESTÁ CADA COISA

## 🎯 ORGANIZAÇÃO VISUAL

```
SiteMarcaViva/
│
├── 🏠 RAIZ (Apenas essenciais)
│   ├── index.html .................. Homepage do site
│   ├── admin.html .................. Painel administrativo
│   ├── README.md ................... Documentação principal
│   ├── package.json ................ Config do projeto
│   ├── vercel.json ................. Config deploy
│   ├── .env.example ................ Exemplo de variáveis
│   └── .gitignore .................. Git ignore
│
├── 📄 pages/ (Páginas do Cliente)
│   ├── produto.html ................ Página de produto
│   ├── checkout.html ............... Finalizar compra
│   ├── login.html .................. Login/Cadastro
│   ├── profile.html ................ Perfil do usuário
│   ├── orders.html ................. Meus pedidos
│   ├── track.html .................. Rastrear pedido
│   ├── quote.html .................. Orçamento PDF
│   ├── pix-payment.html ............ Pagamento PIX
│   ├── favoritos.html .............. Favoritos
│   ├── confirmacao.html ............ Confirmação
│   └── verify.html, update-password.html
│
├── ⚖️ legal/ (Jurídico e Políticas)
│   ├── politica-privacidade.html
│   ├── termos-uso.html
│   ├── trocas-devolucoes.html
│   ├── privacidade.html
│   └── termos.html
│
├── 🛠️ admin/ (Painel Admin)
│   └── (arquivos do painel)
│
├── 🗂️ assets/ (Arquivos Estáticos)
│   ├── favicon.png ................. Ícone do site
│   ├── robots.txt .................. SEO
│   └── sitemap.xml ................. Mapa do site
│
├── 💾 database/
│   ├── CONFIGURAR_PRICE_TIERS.sql .. ⭐ Produtos e descontos
│   ├── EXECUTAR_NO_SUPABASE.sql .... ⭐ Função de aprovação
│   ├── migrations/ ................. Estrutura do banco
│   ├── fixes/ ...................... Correções SQL
│   └── seeds/ ...................... Dados de teste
│
├── 💻 scripts/
│   ├── config/
│   │   └── config.js ............... ⚠️ Chaves API (TESTE)
│   ├── services/
│   │   ├── KanbanService.js ........ Gestão de pedidos
│   │   ├── cartService.js .......... Carrinho
│   │   └── shippingService.js ...... Frete
│   ├── pages/
│   │   ├── produto.js .............. Lógica de tiers
│   │   ├── checkout.js ............. Finalização
│   │   └── kanban.js ............... Admin
│   ├── utils/ ...................... Utilitários
│   └── devops/
│       ├── fix_final.ps1 ........... Script de correção
│       └── patch_admin.ps1 ......... Patch admin
│
├── 🎨 styles/ (CSS)
│   └── (arquivos de estilo)
│
└── 📚 docs/
    ├── project/ .................... 📁 DOCUMENTOS PRINCIPAIS
    │   ├── ROTEIRO_FINAL_B2B.md .... Como testar o fluxo
    │   ├── CHECKLIST_PRE_LANCAMENTO.md . Pré-lançamento
    │   ├── COMO_CONFIGURAR_DESCONTOS.md . Guia de tiers
    │   ├── RESUMO_TIERS.md ......... Produtos configurados
    │   ├── ROTEIRO_DE_TESTE.md ..... Roteiro de testes
    │   └── RESPOSTAS_WHATSAPP.md ... Respostas prontas
    │
    ├── history/ .................... 📁 HISTÓRICO
    │   ├── MUDANCAS_APLICADAS.md ... Log de mudanças
    │   └── LEMBRETE_URGENTE.md ..... Lembretes
    │
    └── product/ .................... 📁 SPECS TÉCNICAS
        └── (especificações antigas)
```

---

## 🔍 ONDE PROCURAR CADA COISA?

### 🚀 "Preciso COMEÇAR A TRABALHAR"
👉 **Leia primeiro:**
1. `.gemini/.../TRANSFERENCIA_CLAUDE_CODE.md` ⭐ (Documento Master)
2. `docs/project/ROTEIRO_FINAL_B2B.md` (Fluxo do site)
3. `README.md` (Visão geral)

### 💾 "Preciso MEXER NO BANCO DE DADOS"
👉 **Vá para:** `database/`
- `CONFIGURAR_PRICE_TIERS.sql` - Produtos e descontos
- `EXECUTAR_NO_SUPABASE.sql` - Função de aprovação
- `migrations/` - Estrutura das tabelas

### 🌐 "Preciso EDITAR UMA PÁGINA"
👉 **Páginas do cliente:** `pages/`
- Produto: `pages/produto.html`
- Checkout: `pages/checkout.html`
- Login: `pages/login.html`
- Rastreamento: `pages/track.html`

👉 **Homepage:** `index.html` (na raiz)
👉 **Admin:** `admin.html` (na raiz)

### ⚙️ "Preciso TROCAR A CHAVE DO MERCADO PAGO"
👉 **Vá para:** `scripts/config/config.js`
- Linha 35: `MP_PUBLIC_KEY`
- Trocar de `TEST-...` para `APP_USR-...`

### 🔧 "Preciso MEXER NA LÓGICA DO SITE"
👉 **Vá para:** `scripts/`
- Tiers de preço: `scripts/pages/produto.js`
- Carrinho: `scripts/services/cartService.js`
- Checkout: `scripts/pages/checkout.js`
- Admin Kanban: `scripts/pages/kanban.js`

### 📖 "Preciso LER A DOCUMENTAÇÃO"
👉 **Vá para:** `docs/project/`
- Fluxo B2B: `ROTEIRO_FINAL_B2B.md`
- Como configurar descontos: `COMO_CONFIGURAR_DESCONTOS.md`
- Checklist: `CHECKLIST_PRE_LANCAMENTO.md`
- Produtos configurados: `RESUMO_TIERS.md`

### 🐛 "Preciso VER O QUE FOI MUDADO"
👉 **Vá para:** `docs/history/`
- `MUDANCAS_APLICADAS.md` - Log de alterações

### 🎨 "Preciso MEXER NO VISUAL"
👉 **Vá para:** `styles/`

---

## 📋 CHECKLIST RÁPIDO

### Arquivo que você quer achar:

- [ ] **Configuração de API/Chaves** → `scripts/config/config.js`
- [ ] **SQL de Produtos** → `database/CONFIGURAR_PRICE_TIERS.sql`
- [ ] **SQL de Funções** → `database/EXECUTAR_NO_SUPABASE.sql`
- [ ] **Página de Produto** → `pages/produto.html`
- [ ] **Página de Checkout** → `pages/checkout.html`
- [ ] **Painel Admin** → `admin.html` (raiz)
- [ ] **Homepage** → `index.html` (raiz)
- [ ] **Documentação Master** → `.gemini/.../TRANSFERENCIA_CLAUDE_CODE.md`
- [ ] **Guia de Tiers** → `docs/project/COMO_CONFIGURAR_DESCONTOS.md`
- [ ] **Roteiro de Teste** → `docs/project/ROTEIRO_FINAL_B2B.md`

---

## 💡 DICA DE NAVEGAÇÃO

**Regra Geral:**
1. **Raiz** = Só arquivos essenciais (index, admin, config)
2. **pages/** = Páginas que o cliente vê
3. **legal/** = Políticas e termos
4. **scripts/** = Código JavaScript
5. **database/** = SQL
6. **docs/project/** = Documentação para você
7. **assets/** = Imagens, favicon, SEO

**Tudo está categorizado!** Não tem mais nada "perdido" na raiz.

---

## ⚡ ACESSO RÁPIDO (Principais)

| Arquivo | Caminho | Para que serve |
|---------|---------|----------------|
| Config API | `scripts/config/config.js` | Chaves Mercado Pago, Supabase |
| SQL Produtos | `database/CONFIGURAR_PRICE_TIERS.sql` | 8 produtos + tiers |
| SQL Função | `database/EXECUTAR_NO_SUPABASE.sql` | Aprovar pedidos |
| Página Produto | `pages/produto.html` | Ver produto e desconto |
| Checkout | `pages/checkout.html` | Finalizar compra |
| Admin | `admin.html` (raiz) | Painel Kanban |
| Doc Master | `.gemini/.../TRANSFERENCIA_CLAUDE_CODE.md` | Tudo sobre o projeto |
| Fluxo B2B | `docs/project/ROTEIRO_FINAL_B2B.md` | Como funciona |

---

**Agora está 100% organizado e fácil de navegar!** 🎯
