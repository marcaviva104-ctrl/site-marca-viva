# ADR 001: Reestruturação Organizacional e Documentação "Enterprise"

## Status
Aceito

## Contexto
O projeto `SiteMarcaViva` cresceu organicamente, resultando em uma estrutura de arquivos plana onde documentação, scripts de banco de dados e código fonte coexistiam na raiz. Isso dificultava:
1.  **Onboarding**: Novos desenvolvedores não sabiam por onde começar.
2.  **Manutenção**: Scripts SQL perdidos dificultavam a reprodução do ambiente de banco de dados.
3.  **Escalabilidade**: A falta de padrões claros (ADRs, Runbooks) impedia o crescimento sustentável.

## Decisão
Adotar uma estrutura de pastas inspirada em padrões "Enterprise" e "Big Tech", segregando responsabilidades claramente e adotando "Documentação Viva".

### Mudanças Estruturais
- **`/docs`**: Repositório central de conhecimento.
    - `/architecture/decisions`: Para ADRs (O "Porquê").
    - `/runbooks`: Manuais operacionais (O "Como").
    - `/reference`: Dicionários de dados e especificações de API.
- **`/database`**: Fonte da verdade para dados.
    - `/migrations`: Alterações de schema.
    - `/seeds`: Dados iniciais.
- **`/src` (ou raiz limpa)**: Apenas código da aplicação.

## Consequências
### Positivas
- A raiz do projeto está limpa, contendo apenas configurações essenciais e o `README.md`.
- Decisões arquiteturais são preservadas no histórico (git) através de ADRs.
- Operações críticas tornam-se repetíveis através de Runbooks.

### Negativas
- Requer disciplina para manter a documentação atualizada junto com o código.
- Caminhos de arquivos em scripts antigos podem precisar de atualização (ex: scripts que chamavam `./setup.sql` agora devem chamar `./database/migrations/setup.sql`).
