# Resumo de Execução - 21 de Fevereiro de 2026

## 🎯 Objetivo Inicial:
Corrigir o erro "The object exceeded the maximum allowed size" durante o upload de Apostilas (PDF) no site da Marca Viva e garantir a usabilidade para envios grandes (B2B).

---

## ✅ O Que Foi Feito Hoje:

### 1. Aumento dos Limites de Upload (Frontend e Backend)
- **Supabase (Backend):** O limite do bucket `products` foi ajustado via SQL para **700 MB** (`734.003.200 bytes`).
- **Frontend (`produto.js`):** Adicionada validação de tamanho para bloquear arquivos maiores que 700 MB localmente antes de iniciar o envio, com aviso amigável ao usuário.

### 2. Implementação do Protocolo TUS (Multipart Upload)
- Como o plano *Free Tier* do Supabase Cloudflare tem um "limite de porta de entrada" global (Gateway Hard Limit) de 50MB por requisição HTTP padrão, foi construído um sistema bypass.
- Injeção das bibliotecas TUS (`tus-js-client`) no `index.html` e `produto.html`.
- **`utils/storage.js`:** Criada a função nova `uploadLargeFile` que:
  1. Detecta PDFs maiores que 30 MB.
  2. Fatie o arquivo em blocos curtos (30 MB cada) ao invés de enviar de uma vez.
  3. Pausa e resume automaticamente uploads caso a internet do cliente falhe.
  4. Salva a URL pública final do arquivo reconstituído para colocar no carrinho.

### 3. Melhorias Críticas de Experiência do Cliente (UX)
- A tela visual de carregamento (`SweetAlert`) agora mostra porcentagens reais de envio em tempo real para acalmar a ansiedade de downloads demorados (ex: "Enviando: 47%...").
- **Proteção Anti-Desastre:** Implementação nativa (`window.onbeforeunload`) que joga um alerta se o cliente tentar fechar a aba do Chrome no meio do upload da apostila, prevenindo que o carrinho se perca.

---

## 🛑 O Bloqueador / Desafio Descoberto no Final:
Mesmo com o fatiamento e otimização por TUS em 30MB, os uploads de arquivos de extremas dimensões (>150MB) pelo navegador de internet estão **levando tempo demais** (as vezes 3 a 7 minutos).  Isso ocorre puramente devido ao limite físico da velocidade de Upload da internet brasileira média do usuário e da sobrecarga da arquitetura do Supabase via HTTP comum no tier gratuito. Longos períodos de espera podem fazer o cliente B2B desistir da compra.

---

## 🛠️ O Que Falta Fazer / Próximos Passos (Para a Próxima Sessão):

1. **Alterar Estratégia de Arquivos Gigantes (Opção do Link Externo)**
   - Abandonar a tentativa de sugar os 160MB pela internet lenta via site.
   - **Tarefa:** Modificar o `produto.js` para que, ao invés de acionar o upload de servidor se o arquivo for `>= 30MB`, a tela abra um bloco de entrada de texto e oriente calorosamente o usuário: *"Insira aqui o link do seu arquivo no Google Drive / Dropbox / WeTransfer devido ao alto peso"*.
2. **Atualizar o Fluxo do Carrinho para Links**
   - Garantir que um "Link Público" digitado passe normalmente pela criação do pacote no Carrinho e chegue lindamente renderizado lá na página do Admin Panel.
3. **Remover os Destaques da Home**
   - Excluir ou ocultar visualmente a seção de destaques da página principal (Dashboard Initial), conforme planejado anteriormente mas pausado pelo bug de Upload.
