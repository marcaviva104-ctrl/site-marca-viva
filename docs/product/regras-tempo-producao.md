# ⏱️ Sistema de Tempo de Produção - Implementado

## 📋 O que foi criado:

### 1. **Campo no Banco de Dados**
**Arquivo:** [`add_production_time.sql`](file:///c:/Users/Leivin%20Jesus/OneDrive/Desktop/SiteMarcaViva/add_production_time.sql)

Execute este SQL no Supabase para adicionar o campo `tempo_producao` na tabela `products`:
```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tempo_producao DECIMAL(10,2) DEFAULT 1.0;
```

### 2. **Lógica de Cálculo**
**Arquivo:** `shipping-service.js`

**Fórmula implementada:**
```javascript
Tempo Total = (tempo_producao_por_unidade × quantidade) ÷ 10 horas/dia
```

**Exemplo:**
- Produto: 2.5 horas/unidade
- Quantidade: 4 unidades
- Cálculo: (2.5 × 4) ÷ 10 = 1 dia de produção

### 3. **Prazo Total no Checkout**
Agora o sistema mostra:
- **Produção:** X dias (tempo para fabricar)
- **Entrega:** Y dias (tempo de frete)
- **Total:** X + Y dias úteis

---

## 🎯 Como usar no Admin:

Quando cadastrar ou editar um produto no painel admin, adicione o campo:

**Tempo de Produção (horas/unidade):**
- Ex: `2.5` → Produto leva 2.5 horas para produzir 1 unidade
- Ex: `5.0` → Produto leva 5 horas por unidade
- Ex: `0.5` → Produto rápido, 30 minutos

---

## 💡 Próximos passos:

1. ✅ Execute o SQL `add_production_time.sql` no Supabase
2. ✅ Adicione campo "Tempo de Produção" no formulário do admin
3. ✅ Configure tempo para cada produto
4. ✅ Teste no checkout - vai aparecer automaticamente!

---

## 📊 Exemplo Visual no Checkout:

```
┌─────────────────────────────────────────┐
│ PAC - Correios                          │
│ R$ 25,00                                │
│ 🏭 3 dias (produção) + 7 dias (entrega) │
│ = 10 dias úteis                         │
└─────────────────────────────────────────┘
```
