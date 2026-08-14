# 🧭 RETOMANDO O SITE MARCA VIVA — Guia sem enrolação

**Feito em:** 14/08/2026
**Para:** você, que parou o projeto em abril e voltou agora.

---

## 📖 PRIMEIRO, ENTENDA A SITUAÇÃO EM 30 SEGUNDOS

Imagine que seu projeto é uma **oficina**.

Em **abril** você estava trabalhando, mexeu em 31 peças do carro… e saiu no meio.
As peças estão **em cima da bancada**, prontas, mas **nenhuma foi guardada no armário**.

Passaram 4 meses. As peças continuam lá na bancada. Ninguém mexeu.

> 🔧 **A bancada** = aquela lista de 31 arquivos no painel do VS Code
> 🗄️ **O armário** = o Git (o histórico salvo do projeto)
> ✅ **"Commit"** = o ato de guardar a peça no armário

**Não está bugado.** Está esperando você guardar. É isso que vamos fazer.

---

## 🗺️ O CAMINHO INTEIRO, DE UMA OLHADA

```
   VOCÊ ESTÁ AQUI
        ↓
   ┌─────────┐
   │ FASE 0  │  Guardar o que está na bancada        🔴 HOJE   20 min
   └────┬────┘
        ↓
   ┌─────────┐
   │ FASE 1  │  Ligar 4 coisas no banco de dados     🔴 HOJE   10 min
   └────┬────┘
        ↓
   ┌─────────┐
   │ FASE 2  │  Testar o painel e anotar o que quebra 🟠      30 min
   └────┬────┘
        ↓
   ═══ PARE AQUI E ME CHAME ═══
        ↓
   ┌─────────┐
   │ FASE 3  │  Ligar o Mercado Pago de verdade       🟠      15 min
   ├─────────┤
   │ FASE 4  │  Simplificar o frete            (comigo) 🟡    1 h
   ├─────────┤
   │ FASE 5  │  Ajustes finais do site         (comigo) 🟢    30 min
   ├─────────┤
   │ FASE 6  │  Cadastrar produtos e vender             🟢   você
   └─────────┘
```

**Regra única:** uma fase por vez, de cima pra baixo. Não pule.

---
---

# 🔴 FASE 0 — GUARDAR O QUE ESTÁ NA BANCADA

### 😰 Por que isso é urgente?

Aquelas 31 peças na bancada são **6.600 linhas de trabalho** que **não existem em lugar nenhum além dessa pasta**.

Se o computador der pau hoje, se o OneDrive bagunçar, se alguém apagar a pasta sem querer → **acabou, sumiu tudo.**

Guardar no armário leva 20 minutos. Faça agora.

---

## Passo 0.1 — Tirar uma cópia de segurança 🕐 2 min

*Antes de mexer em qualquer coisa, tire um "xerox" da pasta inteira.*

**Faça assim:**

1. Feche o VS Code / Cursor
2. Vá na sua **Área de Trabalho**
3. Clique com o **botão direito** na pasta `SiteMarcaViva`
4. Escolha **Copiar**
5. Clique num espaço vazio da Área de Trabalho → **Colar**
6. Vai aparecer `SiteMarcaViva - Cópia` → renomeie para:
   ```
   SiteMarcaViva_BACKUP_14-08-2026
   ```

### ✅ Como saber que deu certo
Você tem **duas pastas** na Área de Trabalho. Se tudo der errado daqui pra frente, essa segunda pasta te salva.

> 💡 Pode apagar esse backup daqui uns dias, quando tudo estiver funcionando.

---

## Passo 0.2 — Abrir o site no seu computador 🕐 5 min

*Vamos ver se o site ainda funciona antes de guardar as peças. Não adianta guardar peça quebrada.*

**Faça assim:**

1. Abra a pasta `SiteMarcaViva`
2. Ache o arquivo **`ABRIR-SITE.bat`**
3. **Duplo clique** nele
4. Vai abrir uma **janela preta** (terminal). **Não feche essa janela!** Ela é o "motor" do site.
5. Abra o navegador e digite:
   ```
   http://127.0.0.1:8787/pages/index.html
   ```

### ✅ Como saber que deu certo
A home do site abre, com o menu laranja e os produtos.

### ❌ Se não abrir
- A janela preta fechou sozinha? → tente `serve-local.ps1`: botão direito → **Executar com PowerShell**
- Deu "página não encontrada"? → confira se digitou o endereço **exatamente** como está acima
- Continuou sem abrir? → **me chame, não force**

---

## Passo 0.3 — Passear pelo site e anotar 🕐 10 min

*Agora você vira inspetor. Vamos ver o que está de pé e o que caiu.*

**Antes de começar, ligue o "raio-X":**
Aperte **`F12`** no navegador. Vai abrir um painel lateral. Clique na aba **`Console`**.
É ali que os erros aparecem, em **vermelho**.

**Agora percorra o site:**

| # | Onde ir | O que olhar |
|---|---|---|
| 1 | Home | Os produtos aparecem? |
| 2 | Catálogo | A lista carrega? |
| 3 | Clicar num produto | Abre a página dele? |
| 4 | Login | A tela aparece? |

**Depois abra o painel administrativo:**
```
http://127.0.0.1:8787/admin/admin.html
```

E clique **em cada aba, uma por uma**:

- [ ] Dashboard
- [ ] Pedidos
- [ ] Produtos
- [ ] Estoque
- [ ] Financeiro
- [ ] Clientes
- [ ] Configurações

### 📝 Pegue papel e caneta (é sério)

Pra cada coisa que der errado, anote **3 informações**:

```
1. Em que aba eu estava?    → ex.: "Financeiro"
2. O que eu cliquei?        → ex.: "cliquei na seta do mês"
3. O que apareceu vermelho? → ex.: "financial_records does not exist"
```

> ⚠️ **Não se assuste com erros agora.** Alguns são **esperados**, porque o banco de dados
> ainda não foi atualizado (isso é a FASE 1). Só anote e siga em frente.

---

## Passo 0.4 — Guardar no armário (commit) 🕐 3 min

*Se o site abriu e o painel navegou sem travar de vez, é hora de guardar.*

**Faça assim:**

1. No VS Code, clique no ícone de **Source Control** na barra lateral esquerda
   *(parece um garfo de estrada, com 3 bolinhas ligadas por linhas)*
2. Lá em cima tem uma caixa escrita **"Message"** — clique nela
3. Digite exatamente:
   ```
   feat(admin): performance de leitura, variacoes de produto e acesso temporario
   ```
4. Clique no botão azul **✓ Commit**

### ✅ Como saber que deu certo
**A lista de 31 arquivos some.** A bancada ficou limpa — está tudo no armário agora.

### 🛑 NÃO clique em "Sync" ou "Push" ainda!

> **Por quê?** "Push" = **publicar o site no ar pra todo mundo ver**.
> Ainda não testamos o suficiente. Vamos publicar na FASE 3, com calma.
> Guardar no armário (commit) é seguro. Publicar (push) ainda não.

---

### 🎉 FASE 0 CONCLUÍDA

Seu trabalho de abril está **salvo e protegido**. O medo maior já passou.

---
---

# 🔴 FASE 1 — LIGAR 4 COISAS NO BANCO DE DADOS

### 🤔 O que é isso, em português?

Seu site guarda tudo (produtos, pedidos, clientes) num banco de dados chamado **Supabase**.

Em abril, você preparou **4 melhorias** pro banco, escreveu elas em arquivos… e **nunca executou**.
É como ter a receita impressa mas nunca ter feito o bolo.

**O que cada uma resolve:**

| # | Arquivo | O que faz, na prática |
|---|---|---|
| 1 | `idx_protocols_list_performance.sql` | **Deixa a lista de pedidos abrir rápido** |
| 2 | `idx_admin_read_performance.sql` | **Deixa a aba Financeiro abrir rápido** |
| 3 | `add_product_variations_column.sql` | **Permite cadastrar cor e tamanho** com estoque separado |
| 4 | `add_inventory_internal_code.sql` | **Permite código próprio** pra cada insumo |

Todos estão em: `database/migrations/updates/`

> 🛡️ **Pode ficar tranquilo:** esses 4 arquivos são construídos pra serem seguros.
> Se você rodar duas vezes por engano, **não estraga nada** e não apaga dado nenhum.

---

## A receita (repita as 5 etapas pra cada um dos 4 arquivos)

1. Abra https://supabase.com/dashboard e entre na sua conta
2. Clique no projeto **qnudbyhnqtsxlqwgkmal**
3. No menu da esquerda, clique em **SQL Editor** → botão **New query**
4. No VS Code, abra o arquivo `.sql`, selecione tudo (**Ctrl+A**), copie (**Ctrl+C**), e cole na tela do Supabase (**Ctrl+V**)
5. Clique no botão verde **RUN**

### ✅ Como saber que deu certo
Aparece embaixo: **`Success. No rows returned`**

*(Sim, "no rows returned" — "nenhuma linha retornada" — é o resultado **certo**. Não é erro.)*

---

## A ordem

- [ ] **1º** `idx_protocols_list_performance.sql`
- [ ] **2º** `idx_admin_read_performance.sql`
- [ ] **3º** `add_product_variations_column.sql`
- [ ] **4º** `add_inventory_internal_code.sql`

### ❌ Se aparecer erro vermelho

| Mensagem | Significa | O que fazer |
|---|---|---|
| `relation "financial_records" does not exist` | A tabela financeira nunca foi criada | **Pare e me avise** |
| `relation "inventory_items" does not exist` | A tabela de insumos não existe com esse nome | **Pule esse e me avise** |
| `already exists` | Já tinha sido feito antes | **Tudo bem!** Siga em frente |

---

## Passo 1.5 — Conferir o botão "Aprovar" 🕐 2 min

*Tem uma peça antiga que talvez nunca tenha sido instalada: a que transforma **#REQ** (solicitação) em **#MV** (pedido de verdade) quando você aprova.*

**Pra descobrir se já existe**, cole isto no SQL Editor e clique RUN:

```sql
select proname from pg_proc where proname = 'promote_request_to_protocol';
```

| O que apareceu | Significa | O que fazer |
|---|---|---|
| **1 linha** com o nome | Já está instalado ✅ | Nada, siga |
| **Vazio / "no rows"** | Nunca foi instalado ❌ | Rode o arquivo `database/EXECUTAR_NO_SUPABASE.sql` |

---

### 🎉 FASE 1 CONCLUÍDA

O banco está atualizado. Vários erros da FASE 0 devem ter sumido sozinhos.

---
---

# 🟠 FASE 2 — TESTAR O PAINEL DE VERDADE

*Agora o banco está certo. Vamos repetir o teste — mas dessa vez **com atenção**, porque o que quebrar aqui é problema real.*

Abra de novo o `ABRIR-SITE.bat` e vá em:
```
http://127.0.0.1:8787/admin/admin.html
```

Com o **F12 → Console** aberto, teste cada item:

| # | O que testar | Como testar | Funcionou? |
|---|---|---|---|
| 1 | **Entrar no painel** | Fazer login | ☐ |
| 2 | **Ver pedidos** | A lista carrega? Abre o detalhe de um? | ☐ |
| 3 | **Editar pedido** | Mudar o nome do cliente e salvar. **Aperte F5. Continuou salvo?** | ☐ |
| 4 | **Produto com variação** | Cadastrar produto teste com "Azul P — estoque 10" | ☐ |
| 5 | **Financeiro** | Os números do topo aparecem? Setas ← → do mês funcionam? | ☐ |
| 6 | **Estoque** | Lista de insumos carrega? A busca filtra? | ☐ |
| 7 | **Kanban** | Arrastar um card de coluna. **Aperte F5. Ficou no lugar novo?** | ☐ |
| 8 | **Mega Menu** | Categoria cadastrada em Configurações aparece no site? | ☐ |

> 🔑 **O teste do F5 é o mais importante.** Se some depois de recarregar, é porque **não salvou no banco** — só apareceu na tela. Esse é o tipo de bug que te faz perder pedido de cliente.

---

## 🆘 Se o login do painel não deixar você entrar

Existe uma **porta dos fundos** de emergência, criada em abril:

1. Abra `scripts/config/config.js`
2. Vá na **última linha** do arquivo
3. Troque:
   ```javascript
   window.MV_TEMP_ADMIN_PIN = '';
   ```
   por:
   ```javascript
   window.MV_TEMP_ADMIN_PIN = '123456';
   ```
4. Abra `http://127.0.0.1:8787/pages/temp-admin-access.html`
5. Digite `123456` e entre

### 🚨 DEPOIS DE TESTAR, VOLTE PRA `''`

**Isso é sério.** Se você publicar o site com esse PIN preenchido, **qualquer pessoa
na internet** que olhar o código do seu site vê o PIN e **entra no seu painel** —
vê seus pedidos, seus clientes, seu financeiro.

Use só no seu computador. Volte pra `''` antes de publicar. Sempre.

---

# 🛑 PARE AQUI

**Me traga a tabela acima preenchida** — o que funcionou e o que não funcionou.

Daí eu conserto item por item, e só então seguimos pra Fase 3.

Não faça a Fase 3 com o painel quebrado. **A partir da Fase 3 o dinheiro é real.**

---
---

# 🟠 FASE 3 — LIGAR O MERCADO PAGO DE VERDADE

> ⚠️ Só faça depois que a Fase 2 estiver limpa.
> Hoje o site está com chave de **teste**: o cliente "paga" mas **não entra dinheiro nenhum**.

## Passo 3.1 — Pegar sua chave real 🕐 3 min
1. Entre em https://www.mercadopago.com.br/developers/panel
2. Abra sua aplicação → **Credenciais de produção**
3. Copie a **Public Key** — ela começa com `APP_USR-`

## Passo 3.2 — Guardar a chave no lugar certo 🕐 5 min

> ❗ **Não cole a chave no código.** O código do seu site é público — qualquer um consegue ler.
> A chave vai no painel do Vercel, que é privado.

1. Entre em https://vercel.com → projeto **site-marca-viva**
2. **Settings** → **Environment Variables** → **Add New**
3. Preencha:
   - **Name:** `MP_PUBLIC_KEY`
   - **Value:** sua chave `APP_USR-...`
   - **Environment:** marque **Production**
4. **Save**

## Passo 3.3 — Publicar 🕐 2 min
No Vercel: **Deployments** → no deploy mais recente, clique nos **`...`** → **Redeploy**

*(A chave só passa a valer depois de republicar. Sem isso, não adianta.)*

## Passo 3.4 — A prova dos nove 🕐 5 min

- [ ] No site publicado, faça um pedido de **R$ 2,00**
- [ ] Pague de verdade, com PIX, do seu próprio celular
- [ ] Confira se **caiu R$ 2,00 na sua conta Mercado Pago**
- [ ] Confira se o pedido **apareceu no Kanban** do painel

### ✅ Deu certo quando
O dinheiro entrou **e** o pedido apareceu no painel. Se só uma das duas aconteceu, **me chame**.

---
---

# 🟡 FASE 4 — SIMPLIFICAR O FRETE *(comigo)*

### O problema de hoje
O site usa a API do **Melhor Envio**. Isso te obriga a cadastrar **peso e dimensão exata**
de **todo** produto. Dá um trabalho enorme e trava a vida de quem só quer vender banner e adesivo.

### Como vai ficar
Só 3 opções, configuradas por você no painel:
- 📦 **Frete fixo** (ex.: R$ 20,00)
- 🎁 **Frete grátis** acima de um valor
- 🏪 **Retirada na loja**

### 🔐 Um aviso de segurança importante

A senha de acesso do Melhor Envio (o "token") está **escrita por extenso** dentro do arquivo
`scripts/config/config.js`, e esse arquivo está publicado no GitHub. Ou seja: **é uma senha exposta.**

Quando a gente remover essa integração, o problema some do código — **mas a senha já ficou pública**.

👉 **Faça isso independente de tudo:** entre no painel do Melhor Envio e **revogue / gere um token novo**.

> ⚠️ Esta fase mexe em código. **Não faça sozinho — me chame.**

---

# 🟢 FASE 5 — AJUSTES FINAIS *(comigo)*

Coisas pequenas, todas já confirmadas no código:

| # | O que | Por que importa |
|---|---|---|
| 5.1 | Tirar o `diagnose.js` da linha 6 de `pages/index.html` | Ferramenta de diagnóstico exposta ao público |
| 5.2 | Trocar a `og:image` por uma imagem **1200×630px** | Hoje o link do site fica **feio** quando compartilhado no WhatsApp |
| 5.3 | Criar a página de **Perguntas Frequentes** (`faq.html`) | As respostas já existem prontas em `admin/js/settings.js` |
| 5.4 | Colocar **Sobre Nós** e **FAQ** no menu | A página Sobre Nós já existe, ninguém acha |
| 5.5 | Ligar o **Google Analytics** | Já está pronto, só comentado. Falta você ter o ID `G-...` |
| 5.6 | Ligar o **"Salvar Customizações"** no botão de orçamento | Ficou pela metade em março |

### ✅ Isso aqui já está pronto, pode riscar da lista antiga
As páginas de **Termos de Uso**, **Política de Privacidade** e **Trocas e Devoluções**
**já existem** — conferi. Os documentos antigos diziam que faltava, mas está desatualizado.

---

# 🟢 FASE 6 — CADASTRAR PRODUTOS E VENDER *(você)*

- [ ] Apagar os produtos de teste com as fotos velhas
- [ ] Cadastrar os produtos oficiais — **foto quadrada, boa qualidade** (isso vende!)
- [ ] Preencher estoque e categoria certos em cada um
- [ ] Conferir os WhatsApps: Vendas `5531987398136` / Checkout `5531999222953`
- [ ] Mandar pra **5 clientes de confiança** primeiro
- [ ] Ouvir o que eles reclamarem → ajustar → **aí sim divulgar pra todo mundo**

---
---

# 🆘 SOCORRO — DEU RUIM, E AGORA?

| Aconteceu | Faça isso |
|---|---|
| **Mexi num arquivo e quebrou** | VS Code → Source Control → botão direito no arquivo → **Discard Changes** |
| **Quebrou tudo, não sei o que fiz** | Use a pasta `SiteMarcaViva_BACKUP_14-08-2026` da Fase 0 |
| **Publiquei e o site no ar quebrou** | Vercel → **Deployments** → escolha o deploy anterior → `...` → **Promote to Production** |
| **Não consigo entrar no painel** | Porta dos fundos do PIN (Fase 2) |
| **Apareceu erro vermelho e não entendi** | Print da tela + qual aba + o que você clicou → me manda |

> 🧯 **Nada aqui é irreversível.** Enquanto você não der **Push**, tudo está só no seu computador.
> O site no ar continua exatamente como está hoje.

---

# 🚫 AS 5 REGRAS QUE NUNCA PODEM SER QUEBRADAS

1. **Nunca editar `admin/js/admin.js` na mão.** É um arquivo gigante e frágil (285KB).
   Mexer nele quebra o painel inteiro. Usar `admin-protocols.js`.
2. **Nunca mexer** em arquivos terminados em `.bak`, `.backup` ou `.corrupted`
3. **Ao editar itens de um pedido:** sempre apagar os antigos e inserir os novos.
   Nunca alterar direto — corrompe o pedido.
4. **Nunca quebrar `scripts/services/auth.js`** — é ele que controla quem entra no painel
5. **Nunca publicar** com o PIN preenchido ou senha real dentro do `config.js`

---

## 📞 PRÓXIMO PASSO AGORA

👉 **Vá pro Passo 0.1** e copie a pasta. São 2 minutos.

Depois volte aqui e siga na ordem. Quando chegar no 🛑 **PARE AQUI**, me chame.
