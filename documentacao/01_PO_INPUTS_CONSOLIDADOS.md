# PO Inputs Consolidados - Victor Souza
**Criado:** 29/12/2024
**Atualizado:** 29/12/2024
**Autor:** Victor Souza (Product Owner)
**Objetivo:** Consolidar todos os inputs, feedbacks e decisões do PO em um único documento de referência

---

## ÍNDICE

1. [DNA & Filosofia de Trabalho](#1-dna--filosofia-de-trabalho)
2. [Visão Estratégica - Módulo Protocolos/Tarefas](#2-visão-estratégica---módulo-protocolostarefas)
3. [Decisões Aprovadas - Módulo Protocolos](#3-decisões-aprovadas---módulo-protocolos)
4. [Feedbacks de Onboarding (Bugs & Melhorias)](#4-feedbacks-de-onboarding-bugs--melhorias)
5. [Regras de Negócio Críticas](#5-regras-de-negócio-críticas)
6. [Documentos Fonte](#6-documentos-fonte)

---

## 1. DNA & Filosofia de Trabalho

**Fonte:** [00_PO_DNA_WORKING_STYLE.md](00_PO_DNA_WORKING_STYLE.md)

### Filosofia Central
> "Speed is NOT important. Quality and accuracy are EVERYTHING."

### 17 Golden Rules - Resumo

| # | Regra | Princípio |
|---|-------|-----------|
| 1 | NO CODE IN PHASES 1-5 | Documentação apenas até Phase 6 |
| 2 | MASTER DOCUMENT PROTECTION | ADDITIVE only até fim da Phase 5 |
| 2.1 | AUTONOMOUS ADDITIVE WORK | Pesquisa & adicionar = autônomo. Deletar/alterar = pedir PO |
| 3 | ONE THING AT A TIME | Arquivo por arquivo, seção por seção |
| 4 | PRECISION ESCALATION | Aumenta a cada fase, EXTREMO na Phase 6 |
| 5 | STOP WHEN NEEDED | Parar é ENCORAJADO, nunca apressar |
| 6 | NEVER ALTER UNAPPROVED CODE | Nem ícones - apenas o explicitamente aprovado |
| 7 | EXHAUSTIVE QUESTIONING | Questionar todo aspecto, 0% ambiguidade |
| 7.1 | PHASE ENTRY/EXIT QUESTIONING | Perguntas no INÍCIO e FIM de CADA fase |
| 8 | TECHNICAL OPINION WITH QUESTIONS | Sempre incluir análise e recomendação |
| 8.1 | CONVERSATIONAL TECHNICAL DIALOGUE | Ser partner sênior, não robô. Desafiar, exemplos, diálogo |
| 9 | NO SUPERFICIALITY | Específico, detalhado, nunca generalista |
| 10 | PHASE REPETITION (10x) | Cada fase repetida 10x com escopo escalando |
| 11 | ABSOLUTE CONGRUENCY | 100% consistência UI/UX system-wide, 0% desvio |
| 12 | UNIVERSAL PROCESS | TODAS tarefas seguem TODAS fases, independente do tamanho |
| 13 | MANDATORY TECHNICAL RATIONALE | Toda recomendação E pergunta DEVE incluir WHY |
| 14 | MANDATORY DOCUMENTATION UPDATES | Tarefa NÃO completa até docs atualizadas |

### Fases do Processo

```
Phase 01: Information Gathering    → NO CODE
Phase 02: Consolidation            → NO CODE
Phase 03: Architecture             → NO CODE
Phase 04: Audit                    → NO CODE
Phase 05: Refinement               → NO CODE
Phase 06: Execution                → CODE ALLOWED
```

---

## 2. Visão Estratégica - Módulo Protocolos/Tarefas

**Fonte:** [11_VISAO_ESTRATEGICA_PO_VICTOR.md](../07_NEGOCIO/tarefas-internas/02_Consolidated/11_VISAO_ESTRATEGICA_PO_VICTOR.md)

### Objetivo Principal
> "Ter uma ampla visão de atividades desempenhadas pelos colaboradores em relação aos clientes e manter uma facilidade de identificar tudo que foi feito em relação aos clientes."

### Tipos de Atividades

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **Gatilho (Trigger)** | Ação automática por evento no sistema | Aluno falta 2x → criar atividade contato |
| **Recorrência** | Atividade que se repete | Follow-up diário manhã |
| **Avulsa** | Atividade única manual | Resolver problema específico |

### Exemplos de Gatilhos Críticos

1. **Faltas:** Aluno falta X vezes consecutivas → criar atividade "Marcar reposição"
2. **Inadimplência:** 2+ mensalidades atrasadas → criar protocolo negociação
3. **Formatura:** Matrícula marcada como formado → criar protocolo certificado

### O Segredo do Sistema
> "O segredo não está na especificidade das atividades individuais internas de uma instituição, o segredo está em como configurar os gatilhos que irão gerar tal atividade no sistema..."

### Flexibilidade & Customização

| Regra | Variação |
|-------|----------|
| Faltas para contato | 2 (minha escola) / 8 (outras) / nenhuma |
| Dias para Serasa | 90 (minha escola) / 30-180 (varia) / não faz |
| Processo documental | Simples (maioria) / Rigoroso (outras) |

### KPIs Aprovados - 4 Pilares

| Pilar | KPIs |
|-------|------|
| **Fluxo/Velocidade** | Throughput, Cycle Time, Lead Time, WIP |
| **Qualidade** | Retrabalho (Reopen Rate), Defect Rate, First Time Right |
| **Confiabilidade** | On-time Delivery, SLA Compliance, Aging do Backlog |
| **Satisfação** | CSAT por tarefa, NPS, Customer Effort Score |

### Score Colaborador (Pesos)

| Componente | Peso |
|------------|------|
| Entrega | 40% |
| Prazo | 20% |
| Qualidade | 25% |
| Satisfação | 15% |

### DNA do Sistema - Conformidade

- **Tela Inicial:** Listagem + busca inteligente + filtro tempo + filtros avançados
- **BI Simples:** Informações visuais de Status/Situação
- **Modal de Criação:** Linguagem visual em conformidade
- **Botões:** "Salvar" e "Salvar e Fechar" separados
- **Configurações:** Aba nas configurações do sistema para cada módulo

---

## 3. Decisões Aprovadas - Módulo Protocolos

**Fonte:** [14_DECISOES_APROVADAS_PO.md](../07_NEGOCIO/tarefas-internas/03_Architecture/14_DECISOES_APROVADAS_PO.md)

### Bloco 1: Identidade

| Decisão | Valor |
|---------|-------|
| Nome | `Protocolos` |
| Menu | 2º item (abaixo Dashboard) |
| Ícone | `ClipboardList` (lucide-react) |

### Bloco 2: Status

| Status | Cor | Descrição |
|--------|-----|-----------|
| `pendente` | Cinza | Aguardando início |
| `em_andamento` | Azul | Sendo trabalhado |
| `aguardando_aprovacao` | Amarelo | Precisa aprovação de superior |
| `concluido` | Verde | Finalizado com sucesso |
| `cancelado` | Vermelho | Cancelado/descartado |

**"Atrasado" = Indicador DERIVADO (calculado automaticamente)**

### Bloco 3: Número de Protocolo

**Formato:** `{SETOR}{AA}{MM}{DD}-{SEQ}`
**Exemplo:** `PED251225-1`

| Setor | Prefixo |
|-------|---------|
| Pedagógico | PED |
| Financeiro | FIN |
| Secretaria | SEC |
| Comercial | COM |
| Administrativo | ADM |
| Diretoria | DIR |
| Coordenação | COO |
| RH | RHU |
| TI | TEC |
| Geral | GER |

### Bloco 4: Prioridade

| Prioridade | Cor |
|------------|-----|
| Baixa | Cinza |
| Média (padrão) | Amarelo |
| Alta | Laranja |
| Urgente | Vermelho |

### Bloco 5: Prazos

- Prazo: CONFIGURÁVEL pela instituição
- Horário: Data + Horário (horário secundário)
- SLA por tipo: SIM (configurável)

### Bloco 6: Tipos de Protocolo

| Tipo | Setor típico | SLA sugerido |
|------|--------------|--------------|
| Reclamação | Vários | 48h |
| Solicitação de documento | Secretaria | 5 dias |
| Manutenção | Administrativo | 72h |
| Cobrança | Financeiro | 24h |
| Ocorrência pedagógica | Pedagógico | 24h |
| Contato com responsável | Pedagógico | 48h |
| Suporte TI | TI | 24h |

### Bloco 7: Atribuição

- Responsável: Um usuário OU um setor (fila)
- Transferência: SIM, com registro no histórico
- Criador ≠ Responsável (campos separados)

### Bloco 7B: Protocolos vs Lembretes

| Aspecto | Protocolo | Lembrete |
|---------|-----------|----------|
| Propósito | Trabalho institucional | Anotação pessoal |
| Número | `PED251225-1` | Sem número |
| Visibilidade | Setor/Institucional | Apenas criador |
| Histórico | Completo | Mínimo |
| SLA | Sim | Não |

### Bloco 8: Permissões

**Arquitetura em CASCATA (3 camadas):**
1. Perfil de Acesso (Sistema)
2. Configurações Globais
3. Configuração por Tipo de Protocolo

**Privado é ABSOLUTO** - ninguém vê exceto criador (e Super Admin para auditoria)

---

## 4. Feedbacks de Onboarding (Bugs & Melhorias)

**Fonte:** [FEEDBACK_VICTOR_ORIGINAL_24_12_2025.md](../05_DEBUGGING/ONBOARDING_MELHORIAS/FEEDBACK_VICTOR_ORIGINAL_24_12_2025.md)

### Bugs Críticos Identificados

#### Vínculo Aluno-Responsável
- Sistema não reconhece vínculos pré-existentes
- Modal exibe "Atenção: Vínculo não encontrado" mesmo quando vinculado
- Erro: `aluno_responsavel_aluno_id_fkey violation`

#### Negociações
- Responsável financeiro não busca alunos vinculados automaticamente
- Campo não ignora acentuação na busca
- Não permite vincular a Negociação + Pessoa + Lead simultaneamente

#### Tarefas CRM
- Timeline da negociação não sincroniza 100% com aba Tarefas
- Histórico não salva ao concluir via Timeline
- Falta horário na timeline, falta botões de ação

#### Descontos (Plano Financeiro)
- Lógica de cálculo incorreta (15 → 1,50)
- Desconto aplicado só na 1ª parcela (deveria ser todo plano)
- "Desconto por parcela" vs "Desconto sob valor total" com cálculo errado
- Desconto incondicional vs pontualidade não separados corretamente

### Melhorias Solicitadas

#### Formatação de Campos
- Telefone: formatação automática, aceitar apenas dígitos
- WhatsApp: sempre salvar código do país (+55)
- Email/CPF: não aparecer na tela inicial de pessoas

#### Herança de Dados
- Botão "Mesmo endereço do responsável" (checkbox)
- Herdar campos repetitivos (matriculador, origem) ao criar conexões

#### UX Geral
- Ícone de edição em campos de seleção (editar sem sair da tela)
- Busca ignorar acentuação em TODO o sistema
- Salvar vs Salvar e Fechar comportamento consistente

---

## 5. Regras de Negócio Críticas

### Aluno Auto-Responsável
> "Muitas vezes o aluno é responsável por si só. Tenho muitos alunos adultos que são responsáveis por si mesmos, participam de turmas, tem boletins, notas, frequência... porém também são os mesmos que pagam, assinam contrato."

**Implicação:** Sistema deve suportar aluno = responsável (mesma pessoa)

### Múltiplos Responsáveis por Matrícula
- Uma matrícula → Um aluno apenas
- Uma matrícula → Múltiplos responsáveis possíveis
- Apenas um responsável financeiro por matrícula
- Responsável financeiro pode ≠ responsável pedagógico

### CRM vs SGE
> "Uma pessoa criada no CRM não necessariamente vai ser um cliente, ela ainda está na fase de negociação. Só quando de fato gero uma matrícula, que aquela pessoa vira um cliente."

**Cuidado:** Criar pessoa no SGE antes da matrícula pode gerar conflitos de BI

### Tarefas = Mesma Entidade
> "Devem sim ter o mesmo registro, até porque só contam como uma. Uma tarefa pode ser gerenciada através de 4 lugares diferentes (Timeline, Aba Tarefas, Pessoa, Lead)."

---

## 6. Documentos Fonte

| Documento | Caminho | Conteúdo |
|-----------|---------|----------|
| DNA & Working Style | `docs/00_METHODOLOGY/00_PO_DNA_WORKING_STYLE.md` | 17 Golden Rules, fases, filosofia |
| Visão Estratégica Tarefas | `docs/07_NEGOCIO/tarefas-internas/02_Consolidated/11_VISAO_ESTRATEGICA_PO_VICTOR.md` | Módulo Protocolos, KPIs, gatilhos |
| Decisões Aprovadas | `docs/07_NEGOCIO/tarefas-internas/03_Architecture/14_DECISOES_APROVADAS_PO.md` | Status, permissões, configurações |
| Feedback Onboarding | `docs/05_DEBUGGING/ONBOARDING_MELHORIAS/FEEDBACK_VICTOR_ORIGINAL_24_12_2025.md` | Bugs, melhorias, regras de negócio |
| Contexto Projeto | `docs/01_PROJECT/CONTEXTO_COMPLETO_PROJETO.md` | Visão geral do sistema |

---

*Este documento é uma consolidação para referência rápida. Sempre consulte os documentos fonte para detalhes completos.*
