# 🚀 Guia de Deploy no Vercel

## ✅ Preparação Concluída

Seu site já está preparado para deploy seguro! Os seguintes arquivos foram criados/modificados:

- ✅ `vercel.json` - Configuração do Vercel
- ✅ `scripts/config.js` - Agora usa variáveis de ambiente
- ✅ `.env.example` - Template das variáveis necessárias
- ✅ `.gitignore` - Protege arquivos sensíveis

---

## 📋 Passo a Passo para Deploy

### 1️⃣ Acesse o Vercel
👉 **https://vercel.com**

### 2️⃣ Faça Login
- Clique em **"Sign Up"** ou **"Login"**
- Escolha **"Continue with GitHub"**
- Autorize o Vercel a acessar sua conta GitHub

### 3️⃣ Importar o Projeto
- Clique em **"Add New..."** → **"Project"**
- Encontre o repositório: **`marcaviva104-ctrl/site-marca-viva`**
- Clique em **"Import"**

### 4️⃣ Configurações do Deploy
- **Framework Preset:** Deixe como **"Other"**
- **Root Directory:** Deixe em branco (`.`)
- **Build Command:** Deixe em branco
- **Output Directory:** Deixe em branco

### 5️⃣ Variáveis de Ambiente (IMPORTANTE! 🔒)

Clique em **"Environment Variables"** e adicione AS SEGUINTES variáveis:

#### Supabase (obrigatório)
```
Name: SUPABASE_URL
Value: https://qnudbyhnqtsxlqwgkmal.supabase.co
```

```
Name: SUPABASE_KEY
Value: sb_publishable_AMo1o9yvNV-p_qSE2j5Ztw_7CM1oYeL
```

#### Mercado Pago (obrigatório)
```
Name: MP_PUBLIC_KEY
Value: TEST-e57f78e6-3ef2-4341-b69f-bcc7701d100a
```

#### Melhor Envio (obrigatório)
```
Name: MELHOR_ENVIO_TOKEN
Value: [SEU TOKEN AQUI - copie do arquivo config.js antigo]
```

```
Name: MELHOR_ENVIO_FROM_CEP
Value: 32600-325
```

> **💡 Dica:** Você pode encontrar o token do Melhor Envio no arquivo `scripts/config.js` (é aquele token grande que começa com "eyJ0eXAiOiJKV1Q...")

### 6️⃣ Deploy!
- Clique em **"Deploy"**
- Aguarde 1-2 minutos
- Seu site estará no ar! 🎉

---

## 🌐 Após o Deploy

Você receberá uma **URL pública** como:
```
https://site-marca-viva.vercel.app
```

**Importante:**
- ✅ Compartilhe essa URL para testar
- ✅ Você pode adicionar um domínio personalizado depois
- ✅ Toda vez que você fizer `git push`, o site atualiza automaticamente!

---

## 🔄 Como Fazer Alterações Depois

1. **Você pede a modificação aqui** (como sempre)
2. **Eu edito os arquivos** no seu computador
3. **Você faz commit e push:**
   ```bash
   git add .
   git commit -m "Descrição da alteração"
   git push origin main
   ```
4. **Vercel atualiza automaticamente** em 30-60 segundos! ✨

---

## 🆘 Problemas Comuns

### Site não carrega / Erro 404
- Verifique se todas as variáveis de ambiente foram configuradas
- Certifique-se de que o repositório está sincronizado

### Erro de autenticação (Supabase)
- Verifique se `SUPABASE_URL` e `SUPABASE_KEY` estão corretos
- Tente redesenvolver: Settings → Deployments → ⋯ → Redeploy

### Frete não está calculando
- Verifique se `MELHOR_ENVIO_TOKEN` está correto
- Certifique-se de copiar o token COMPLETO

---

## 📞 Precisa de Ajuda?

Se algo der errado, me avise! Posso:
- ✅ Verificar logs de erro do Vercel
- ✅ Ajustar configurações
- ✅ Debug de problemas específicos

**Bom deploy! 🚀**
