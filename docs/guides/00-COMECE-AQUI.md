# 🎯 MARCA VIVA - INÍCIO RÁPIDO

> 🔴 **RETOMANDO O PROJETO EM 14/08/2026?** Vá direto para
> **[PASSO_A_PASSO_RETOMADA.md](PASSO_A_PASSO_RETOMADA.md)** — está atualizado.
> O restante deste arquivo é de 05/02/2026 e tem informação desatualizada.

> **Leia este arquivo PRIMEIRO!** Tudo que você precisa está aqui.

---

## 📖 1. DOCUMENTOS ESSENCIAIS (Nesta Pasta)

### Comece por aqui:
1. **TRANSFERENCIA_CLAUDE_CODE.md** ⭐ - Documento Master (LEIA PRIMEIRO)
2. **GUIA_NAVEGACAO.md** - Onde encontrar cada coisa
3. **ROTEIRO_FINAL_B2B.md** - Como funciona o fluxo de compra

### Para trabalhar:
4. **CHECKLIST_PRE_LANCAMENTO.md** - O que fazer antes de lançar
5. **COMO_CONFIGURAR_DESCONTOS.md** - Sistema de tiers
6. **RESUMO_TIERS.md** - Produtos configurados

---

## ⚡ 2. PRÓXIMOS PASSOS (Ordem)

```
1️⃣ Executar SQL → database/EXECUTAR_NO_SUPABASE.sql
2️⃣ Testar Admin → admin.html (aprovar pedido)
3️⃣ Trocar Chave → scripts/config/config.js (Mercado Pago)
4️⃣ Testar Compra → Fazer pedido teste
5️⃣ Lançar → Divulgar
```

---

## 🗂️ 3. ONDE ESTÁ CADA COISA

### Trabalho do Dia-a-Dia:
- **Documentos** → `docs/guides/` (esta pasta) · histórico em `docs/history/sessions/`
- **Código JS** → `scripts/`
- **SQL** → `database/`
- **Páginas** → `pages/`, `index.html`, `admin.html`
- **Estilos** → `styles/`

### Raramente Usado:
- **Imagens** → `assets/`
- **Políticas** → `legal/`
- **Antigos** → `docs/` (legacy)

---

## 🔑 4. CONFIGURAÇÕES CRÍTICAS

### Chaves API (IMPORTANTE)
📍 `scripts/config/config.js`
- **Mercado Pago:** Linha 35 → `TEST-...` (trocar para produção)
- **Supabase:** Configurado ✅
- **Melhor Envio:** Configurado ✅

### Banco de Dados
📍 `database/`
- `EXECUTAR_NO_SUPABASE.sql` ⚠️ (PENDENTE - Critical)
- `CONFIGURAR_PRICE_TIERS.sql` ✅ (Executado)

---

## 🚀 5. STATUS DO PROJETO

- ✅ E-commerce funcional
- ✅ Sistema de tiers (8 produtos, 48 descontos)
- ✅ Kanban admin
- ✅ Integração Mercado Pago (teste)
- ⚠️ **FALTA:** Executar SQL + Trocar chave MP

**Progresso:** 99% Pronto | **Próximo:** Testes finais

---

## 📞 6. LINKS ÚTEIS

- **Site:** https://site-marca-viva.vercel.app
- **Supabase:** https://qnudbyhnqtsxlqwgkmal.supabase.co
- **WhatsApp:** (31) 98739-8136

---

**🎓 DICA:** Abra os 3 primeiros documentos desta pasta na ordem e você vai entender tudo! 

**Data:** 05/02/2026
