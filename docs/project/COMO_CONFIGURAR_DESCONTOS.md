# 📊 Como Funcionam os Descontos por Quantidade

**Data:** 04/02/2026 23:35

---

## ✅ SEU SISTEMA JÁ ESTÁ PRONTO!

Descobri que você **JÁ TEM** um sistema completo de descontos por quantidade implementado! 🎉

---

## 🎯 COMO FUNCIONA (Para o Cliente)

### Exemplo Visual:

Quando o cliente abre a página de um produto, ele vê:

```
┌────────────────────────────────────────┐
│  📦 Escolha a Quantidade:              │
├────────────────────────────────────────┤
│                                        │
│  [ ] 50-99 un    → R$ 15,00/un        │
│  [ ] 100-199 un  → R$ 12,00/un  ⭐    │
│  [✓] 200+ un     → R$ 10,00/un  💰    │
│                                        │
│  Você economiza: R$ 5,00 por unidade! │
└────────────────────────────────────────┘

Quantidade: [200] ━━━━━

Total: R$ 2.000,00
(Você economizou R$ 1.000,00!)
```

**O cliente vê claramente:**
1. Quanto custa em cada faixa de quantidade
2. Quanto ele economiza comprando mais
3. Preço total atualiza automaticamente

---

## 🔧 COMO CONFIGURAR (Para Você)

### OPÇÃO 1: Pelo Admin (Recomendado)

1. **Acessar:** `admin.html`
2. **Ir em:** Produtos
3. **Criar/Editar** um produto
4. **Preencher:**
   - Nome: "Caneta Personalizada"
   - Preço base: R$ 15,00
   - Descrição, foto, etc.

5. **Configurar Tiers (Faixas):**
   
   Na seção "Preços por Quantidade":
   ```
   ┌─────────────────────────────────────┐
   │ Faixa 1:                             │
   │ Min: 50    Preço: R$ 15,00          │
   ├─────────────────────────────────────┤
   │ Faixa 2:                             │
   │ Min: 100   Preço: R$ 12,00          │
   ├─────────────────────────────────────┤
   │ Faixa 3:                             │
   │ Min: 200   Preço: R$ 10,00          │
   └─────────────────────────────────────┘
   ```

6. **Salvar**

---

### OPÇÃO 2: Direto no Banco (SQL)

Se quiser fazer manualmente no Supabase:

1. **Acesse:** Supabase Dashboard > SQL Editor

2. **Execute:**
```sql
-- Primeiro, pegue o ID do produto
SELECT id, name FROM products WHERE name LIKE '%Caneta%';

-- Depois, adicione os tiers (substitua 'UUID_DO_PRODUTO')
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
  ('UUID_DO_PRODUTO', 50, 15.00),    -- 50-99 unidades = R$ 15,00/un
  ('UUID_DO_PRODUTO', 100, 12.00),   -- 100-199 unidades = R$ 12,00/un
  ('UUID_DO_PRODUTO', 200, 10.00);   -- 200+ unidades = R$ 10,00/un
```

---

## 📋 EXEMPLO COMPLETO: Caneta Personalizada

### Configuração:

| Quantidade | Preço/Unidade | Total (100 un) | Economia |
|------------|---------------|----------------|----------|
| 50-99      | R$ 15,00      | R$ 1.500,00    | -        |
| 100-199    | R$ 12,00      | R$ 1.200,00    | R$ 300   |
| 200+       | R$ 10,00      | R$ 1.000,00    | R$ 500   |

### Como o Cliente Vê:

1. **Na Lista de Produtos:**
```
┌──────────────────────────┐
│ 📝 Caneta Personalizada  │
│                          │
│ A partir de R$ 10,00/un  │
│ (mínimo 50 unidades)     │
│                          │
│ [ Ver Detalhes ]         │
└──────────────────────────┘
```

2. **Na Página do Produto:**
```
Caneta Personalizada
━━━━━━━━━━━━━━━━━━━━

💰 Preços por Quantidade:

┌─────────────────────────────┐
│ [ ] 50-99 un → R$ 15,00/un  │
│ [✓] 100-199 un → R$ 12,00/un│ ⭐ Melhor custo-benefício!
│ [ ] 200+ un → R$ 10,00/un   │ 💎 Melhor Preço!  
└─────────────────────────────┘

Quantidade: [100] ━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━
Total: R$ 1.200,00
Você economiza: R$ 300,00
━━━━━━━━━━━━━━━━━━━━━━━━━

[🛒 Adicionar ao Carrinho]
[💬 Pedir no WhatsApp]
```

---

## 🎨 RECURSOS IMPLEMENTADOS

### 1. **Seleção Visual**
- Botões grandes e claros
- Faixa selecionada destacada
- Badge "Melhor Preço" na faixa mais econômica

### 2. **Cálculo Automático**
- Cliente muda quantidade → preço atualiza na hora
- Mostra economia comparado ao preço mais alto
- Total sempre correto

### 3. **Validação**
- Impede quantidade menor que o mínimo
- Sugere a melhor faixa automaticamente
- Aviso se estiver próximo de faixa melhor

**Exemplo:**
```
⚠️ Adicione mais 5 unidades e economize R$ 300,00!
(De 95 para 100 unidades = preço de R$ 15,00 → R$ 12,00)
```

---

## 📝 TEMPLATE PARA SEUS PRODUTOS

### Produto: Caneta Personalizada

**Tiers:**
```javascript
[
  { min: 50, price: 15.00 },   // Pequeno pedido
  { min: 100, price: 12.00 },  // Pedido médio (-20%)
  { min: 200, price: 10.00 }   // Pedido grande (-33%)
]
```

### Produto: Copo Térmico

**Tiers:**
```javascript
[
  { min: 20, price: 35.00 },   // Pequeno pedido
  { min: 50, price: 30.00 },   // Pedido médio (-14%)
  { min: 100, price: 25.00 }   // Pedido grande (-29%)
]
```

### Produto: Ecobag Personalizada

**Tiers:**
```javascript
[
  { min: 100, price: 12.00 },  // Pequeno pedido
  { min: 500, price: 10.00 },  // Pedido médio (-17%)
  { min: 1000, price: 8.00 }   // Pedido grande (-33%)
]
```

---

## 💡 MELHORES PRÁTICAS

### 1. **Faixas Lógicas**
```
✅ BOM:  50 → 100 → 200 → 500
✅ BOM:  20 → 50 → 100 → 200
❌ RUIM: 23 → 67 → 134 → 289
```

### 2. **Desconto Progressivo**
```
✅ BOM:  R$ 15,00 (-20%) → R$ 12,00 (-17%) → R$ 10,00
❌ RUIM: R$ 15,00 (-5%) → R$ 14,25 (-1%) → R$ 14,10
```
**Motivo:** Cliente precisa VER valor no desconto

### 3. **Quantidade Mínima Razoável**
```
✅ BOM:  Caneta: mínimo 50
✅ BOM:  Copo: mínimo 20
❌ RUIM: Caderno: mínimo 5000 (muito!)
```

---

## 🚀 PRÓXIMOS PASSOS

### Para Ativar no Seu Site:

**1. Cadastre Produtos com Tiers**

Exemplo via SQL (mais rápido):
```sql
-- Produto: Caneta AZ-102
INSERT INTO products (name, category, price, description, image) VALUES
('Caneta Personalizada AZ-102', 'Canetas', 15.00, 
 'Caneta esferográfica com clip metálico, personalização em tampografia',
 'https://sua-url-da-imagem.jpg');

-- Pegue o ID retornado (exemplo: abc-123-def)

-- Adicione os tiers:
INSERT INTO product_tiers (product_id, min_quantity, unit_price) VALUES
  ('abc-123-def', 50, 15.00),
  ('abc-123-def', 100, 12.00),
  ('abc-123-def', 200, 10.00);
```

**2. Teste no Site**

1. Abra: `https://site-marca-viva.vercel.app`
2. Clique no produto
3. Veja se aparece a seleção de quantidades
4. Mude a quantidade e veja preço atualizar

---

## ❓ PERGUNTAS FREQUENTES

**Q: E se eu não configurar tiers?**  
R: Produto usa preço fixo normal. Tiers são opcionais.

**Q: Posso ter quantos tiers?**  
R: Quantos quiser! Mas recomendo 3-4 no máximo (fica confuso com muitos).

**Q: Cliente pode comprar menos que o mínimo?**  
R: Não, o sistema bloqueia. Defina o mínimo com sabedoria!

**Q: Como alterar tiers depois?**  
R: Pelo admin (editar produto) ou SQL (UPDATE na tabela product_tiers).

---

## 📊 RESUMO VISUAL

```
VOCÊ CONFIGURA:          →    CLIENTE VÊ:
━━━━━━━━━━━━━━━━━              ━━━━━━━━━━━━━━━━━
50 un  = R$ 15,00               [ ] 50-99 un  → R$ 15,00
100 un = R$ 12,00               [✓] 100-199 un → R$ 12,00 ⭐
200 un = R$ 10,00               [ ] 200+ un   → R$ 10,00 💎

                                Qtd: [150]
                                Total: R$ 1.800,00
                                Economia: R$ 450,00
```

---

**SEU SISTEMA JÁ ESTÁ 100% PRONTO!**

Só precisa cadastrar os produtos com os tiers e seus clientes verão automaticamente as faixas de desconto! 🎉

---

**Arquivo:** `COMO_CONFIGURAR_DESCONTOS.md`  
**Criado:** 04/02/2026 23:35
