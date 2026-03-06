# 🗺️ Guia de Estrutura do Projeto - Marca Viva

Este guia resume a grande limpeza e organização realizada em 01/03/2026. Agora o projeto segue um padrão profissional, com a raiz limpa e arquivos agrupados por função.

## 📁 Onde encontrar cada coisa?

### 🌐 Site e Páginas
- **[pages/](file:///c:/Users/Leivin%20Jesus/OneDrive/Desktop/SiteMarcaViva/pages/)**: Contém todas as páginas HTML do site.
  - `index.html`: Agora fica aqui dentro!
  - `tools/`: Ferramentas de teste e diagnóstico (`check.html`, `test_sale.html`, etc).
- **[admin/](file:///c:/Users/Leivin%20Jesus/OneDrive/Desktop/SiteMarcaViva/admin/)**: Painel administrativo.
  - `admin.html`: Painel principal.

### 🗄️ Banco de Dados (SQL)
- **[database/](file:///c:/Users/Leivin%20Jesus/OneDrive/Desktop/SiteMarcaViva/database/)**: Tudo sobre o Supabase.
  - `migrations/schema/`: Criação de novas tabelas.
  - `migrations/updates/`: Alterações e atualizações em tabelas existentes.
  - `migrations/archive/`: Histórico de SQLs antigos já executados.
  - `tools/`: Scripts de configuração (RLS, Preços, Diagnóstico).
  - `fixes/archive/`: Correções antigas.

### 📜 Documentação e Scripts
- **[docs/](file:///c:/Users/Leivin%20Jesus/OneDrive/Desktop/SiteMarcaViva/docs/)**: Manuais, roteiros e este guia.
- **[scripts/devops/](file:///c:/Users/Leivin%20Jesus/OneDrive/Desktop/SiteMarcaViva/scripts/devops/)**: Scripts para iniciar o servidor (`INICIAR_SERVIDOR.ps1`) e manutenção de banco.

---

## 🛠️ Como lembrar a Antigravity desta organização?
Se você iniciar um novo chat e eu parecer "perdido", basta dizer:
> "Siga a estrutura do arquivo `docs/ESTRUTURA_PROJETO.md`"

Eu tenho memória das nossas conversas passadas, mas ler esse mapa ajuda a garantir que eu nunca mais coloque arquivos soltos na sua raiz!

## 🔐 Arquivos Técnicos Mandatórios
Apenas estes 3 arquivos ficaram na raiz por necessidade técnica do servidor:
1. `package.json` (NPM)
2. `vercel.json` (Vercel)
3. `.gitignore` (Git)
