# Marca Viva — E-commerce B2B

Site de brindes corporativos personalizados, com catálogo, descontos por quantidade e painel administrativo.

**Comece por:** [docs/guides/00-COMECE-AQUI.md](docs/guides/00-COMECE-AQUI.md)

---

## Rodar localmente

```bash
npm run serve          # sobe o servidor local (serve-local.ps1)
```

Ou abra [ABRIR-SITE.bat](ABRIR-SITE.bat) com dois cliques.

---

## Estrutura das pastas

| Pasta | O que guarda |
|---|---|
| [pages/](pages/) | Páginas públicas do site (`index`, `catalogo`, `produto`, `login`…) |
| [pages/legal/](pages/legal/) | **Fonte única** dos textos jurídicos (privacidade, termos, trocas) |
| [pages/tools/](pages/tools/) | Ferramentas internas de teste — não são páginas públicas |
| [admin/](admin/) | Painel administrativo (`admin.html`, `js/`, `sql/`) |
| [scripts/](scripts/) | JavaScript do front: `services/`, `pages/`, `components/`, `config/`, `utils/`, `devops/` |
| [styles/](styles/) | CSS organizado em `base/`, `components/`, `pages/` |
| [assets/](assets/) | Imagens e arquivos estáticos |
| [database/](database/) | SQL: `migrations/`, `fixes/`, `queries/`, `seeds/`, `tools/` |
| [supabase/](supabase/) | Edge Functions (ex.: envio de e-mail de pedido) |
| [docs/](docs/) | Toda a documentação — veja o mapa abaixo |

### Arquivos da raiz

Só fica na raiz o que **precisa** estar na raiz:

`package.json` · `vercel.json` · `robots.txt` · `sitemap.xml` · `serve-local.ps1` · `ABRIR-SITE.bat` · `LEIVIN.md` · `.gitignore` · `.cursorrules`

> Regra: arquivo temporário, de teste ou de rascunho **não** vai para a raiz.
> Use `docs/archive/scratch/` ou deixe fora do Git.

---

## Mapa da documentação

| Pasta | O que guarda |
|---|---|
| [docs/guides/](docs/guides/) | Guias práticos: como começar, checklist de lançamento, configurar descontos, roteiro B2B |
| [docs/history/sessions/](docs/history/sessions/) | Histórico de sessões de trabalho, um arquivo por dia (`AAAA-MM-DD-assunto.md`) |
| [docs/history/](docs/history/) | Mudanças aplicadas e lembretes gerais |
| [docs/technical/](docs/technical/) | Integrações e infraestrutura (Mercado Pago, sistema de envio) |
| [docs/product/](docs/product/) | Regras de negócio, specs e reuniões |
| [docs/architecture/](docs/architecture/) | Decisões de arquitetura |
| [docs/interfaces/](docs/interfaces/) | Documentação por interface (admin, catálogo, checkout, perfil, tracking) |
| [docs/reference/](docs/reference/) · [docs/process/](docs/process/) · [docs/quality/](docs/quality/) · [docs/team/](docs/team/) | Referência, processos, qualidade e onboarding |
| [docs/archive/](docs/archive/) | Código e documentos aposentados — guardados, fora do caminho |
| [docs/archive/scratch/](docs/archive/scratch/) | Scripts e dumps temporários que já saíram da raiz |
| [docs/archive/legal-duplicado/](docs/archive/legal-duplicado/) | Versão antiga e duplicada dos textos legais (não usar) |

---

## Convenções

**Novo resumo de sessão** → `docs/history/sessions/AAAA-MM-DD-assunto.md`
Sempre data ISO no início do nome, para ordenar sozinho. Nunca crie pasta com nome de data na raiz.

**Textos jurídicos** → apenas em `pages/legal/`, com estes nomes:
`politica-privacidade.html` · `termos-uso.html` · `trocas-devolucoes.html`

**Links para páginas legais em componentes globais** (ex.: banner de cookies) devem usar caminho absoluto: `/pages/legal/politica-privacidade.html`

**Ao adicionar página pública** → cadastre também em [sitemap.xml](sitemap.xml), usando o caminho real com `/pages/`.
