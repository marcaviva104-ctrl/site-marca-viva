# 📝 Como Adicionar Campo "Tempo de Produção" no Admin

## ⚠️ IMPORTANTE
Este é um guia manual pois o admin.html é muito complexo e não queremos quebrar nada.

---

## 🎯 Passo 1: Executar SQL no Supabase

Primeiro, adicione a coluna no banco de dados:

```sql
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS tempo_producao DECIMAL(10,2) DEFAULT 1.0;
```

Execute isso no **SQL Editor** do Supabase.

---

## 🎯 Passo 2: Adicionar Campo no Formulário de Produtos

Quando você abrir o painel admin e for na seção de **Produtos**, procure o formulário de cadastro/edição.

**Adicione este HTML** após o campo de preço:

```html
<div>
    <label class="modal-label">Tempo de Produção (horas/unidade)</label>
    <input 
        type="number" 
        id="input-tempo-producao" 
        class="modal-input" 
        step="0.1" 
        min="0.1"
        placeholder="Ex: 2.5"
        value="1.0">
    <small style="color:#64748b; font-size:0.75rem; display:block; margin-top:4px;">
        Quanto tempo leva para produzir 1 unidade deste produto
    </small>
</div>
```

---

## 🎯 Passo 3: Atualizar JavaScript de Salvamento

No arquivo **`admin.js`** ou onde estiver a função que salva produtos, adicione:

```javascript
tempo_producao: parseFloat(document.getElementById('input-tempo-producao')?.value || 1.0)
```

---

## ✅ Pronto!

Agora quando você:
1. Cadastrar um produto novo → Define tempo de produção
2. Cliente adicionar ao carrinho → Sistema calcula automaticamente
3. Ir para checkout → Mostraúltimo prazo: produção + frete

---

## 📊 Exemplo Prático:

**Produto:** Kit VIP  
**Tempo:** 2.5 horas/unidade  
**Cliente pede:** 4 unidades  

**Cálculo:**
- 2.5h × 4 = 10 horas total
- 10h ÷ 10h/dia = **1 dia de produção**
- Frete PAC = 7 dias
- **Total: 8 dias úteis** 🚀

---

## 💡 Dica

Se não quiser mexer no admin agora, pode:
1. Adicionar a coluna no SQL
2. O sistema usa valor padrão de 1.0 hora
3. Editar depois diretamente no Supabase quando precisar
