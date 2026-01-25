# Manual da Tela de Rastreio (Cliente)

**Arquivo**: `track.html`
**Acesso**: Público (via Link com Código)

## 📌 Para que serve?
É a tela onde o cliente acompanha o status do pedido ("Protocolo") sem precisar fazer login e senha. É focada em **reduzir a ansiedade** do cliente e **diminuir o suporte** no WhatsApp.

## 📱 Como funciona?
1.  **Entrada**: O cliente recebe um link no WhatsApp: `marcaviva.com/track?id=MV-123`.
2.  **Visualização**: Ele vê uma "Linha do Tempo" simples com bolinhas verdes.
3.  **Ação**: Ele pode baixar a Nota Fiscal ou aprovar a Arte direto nessa tela.

## 🔗 Conexão com o Kanban
Essa tela não pensa sozinha. Ela apenas "lê" o que você faz no Kanban Admin.
*   Você move para **"Em Produção"** --> A bolinha fica verde aqui.
*   Você move para **"Expedição"** --> Aparece "Saiu para Entrega" aqui.

## 🛠️ Detalhes Técnicos
*   **CSS**: Estilo limpo, mobile-first (parece um app).
*   **Segurança**: Só mostra os dados se tiver o Código Exato do protocolo. Não lista todos os pedidos.

---
**Status**: Implementado (Visual). Falta conectar com API real.
