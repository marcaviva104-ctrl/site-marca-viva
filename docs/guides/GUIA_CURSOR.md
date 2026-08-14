# 🖱️ GUIA MARCA VIVA NO CURSOR

> Abra este arquivo no Cursor quando precisar de referência.
> O `.cursorrules` já está ativo — o Cursor já conhece o projeto.

---

## ⚡ Como Usar o Cursor

| Ação | Atalho |
|------|--------|
| Chat com IA (projeto inteiro) | `Ctrl+L` |
| Editar trecho de código | Selecione → `Ctrl+K` |
| Citar um arquivo no chat | Digite `@nome-do-arquivo` |
| Abrir terminal | `Ctrl+`` ` |

---

## 📋 TAREFAS PENDENTES — Prompts Prontos

Copie e cole no chat do Cursor (`Ctrl+L`):

---

### ✅ Tarefa 1 — Criar `verify.html`
```
@.cursorrules Cria a página pages/verify.html de verificação de e-mail.
Deve seguir o mesmo estilo visual do login.html (mesma estética, mesmos estilos).
A página deve mostrar uma mensagem de "E-mail verificado com sucesso!" e um botão para ir ao login.
```

---

### ✅ Tarefa 2 — Criar `faq.html`
```
@.cursorrules Cria a página pages/faq.html de Perguntas Frequentes.
Deve usar o mesmo header/footer do catalogo.html.
Conteúdo: perguntas sobre brindes personalizados, prazo de entrega, pagamento, personalização de logo.
```

---

### ✅ Tarefa 3 — Adicionar links no mega-menu
```
@scripts/components/mega-menu.js @.cursorrules
Adiciona links para "Sobre Nós" e "FAQ" no mega-menu.
- Sobre Nós → pages/sobre.html (se não existir, só adiciona o link)
- FAQ → pages/faq.html
Coloca no rodapé do menu ou em uma seção de links rápidos.
```

---

### ✅ Tarefa 4 — Remover diagnose.js do index
```
@pages/index.html @.cursorrules
Remove a linha que carrega o script diagnose.js (linha 6 aproximadamente).
Não mexa em mais nada.
```

---

### ✅ Tarefa 5 — Corrigir og:image no index
```
@pages/index.html @.cursorrules
Corrige a meta tag og:image para apontar para uma imagem de 1200x630px.
Usa o caminho assets/images/og-image.jpg ou o que existir em assets/.
```

---

### ✅ Tarefa 6 — Ativar Google Analytics
```
@pages/index.html @.cursorrules
Descomenta o código do Google Analytics na linha 42 do index.html.
Substitui o ID de exemplo pelo ID real: [COLE SEU ID AQUI - formato G-XXXXXXXXXX]
```

---

## 🏗️ ARQUITETURA DO PROJETO (resumo)

```
SiteMarcaViva/
├── pages/          → HTML das páginas públicas
├── admin/          → Painel administrativo
│   └── js/         → admin-protocols.js (PRINCIPAL)
├── scripts/
│   ├── config/     → config.js (chaves API)
│   ├── services/   → auth.js, products.js, supabase-client.js
│   └── components/ → mega-menu.js
├── styles/         → CSS por página
├── database/       → SQLs para o Supabase
└── docs/           → Documentação do projeto (guides/, history/, technical/)
```

---

## 🚫 REGRAS — NUNCA PEDIR AO CURSOR

1. Editar `admin/js/admin.js` (arquivo legado 285KB)
2. Commitar `config.js` com chaves reais
3. Editar arquivos `.bak`, `.backup`, `.corrupted`
4. Fazer UPDATE direto em `protocol_items` (sempre DELETE + INSERT)

---

## 🔑 OBJETOS GLOBAIS (para depurar no console do browser)

```javascript
window.supabase          // cliente banco de dados
window.adminApp          // funções do painel admin
window.ProtocolsManager  // gestão de pedidos
window.authService       // login/logout
window.cartService       // carrinho
```

---

## 📞 Contatos do Negócio
- **Vendas WhatsApp:** 5531987398136
- **Checkout WhatsApp:** 5531999222953
- **Site:** https://site-marca-viva.vercel.app
- **Admin:** https://site-marca-viva.vercel.app/admin/admin.html
- **Supabase:** https://qnudbyhnqtsxlqwgkmal.supabase.co

---

*Última atualização: 13/04/2026*
