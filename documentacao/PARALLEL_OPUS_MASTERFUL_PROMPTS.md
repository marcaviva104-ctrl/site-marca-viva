# PARALLEL OPUS 4.5 - MASTERFUL TASK PROMPTS

**Version:** 2.0
**Created:** 29/12/2024
**Purpose:** Exhaustive, methodology-compliant prompts for 4 parallel Claude Opus 4.5 tabs
**Quality Standard:** 100% thoroughness, 0.01% deviation = UNACCEPTABLE

---

## CRITICAL WARNING - READ THIS FIRST

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   ██████╗ ██████╗ ██╗████████╗██╗ ██████╗ █████╗ ██╗                        │
│  ██╔════╝██╔══██╗██║╚══██╔══╝██║██╔════╝██╔══██╗██║                        │
│  ██║     ██████╔╝██║   ██║   ██║██║     ███████║██║                        │
│  ██║     ██╔══██╗██║   ██║   ██║██║     ██╔══██║██║                        │
│  ╚██████╗██║  ██║██║   ██║   ██║╚██████╗██║  ██║███████╗                   │
│   ╚═════╝╚═╝  ╚═╝╚═╝   ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝                   │
│                                                                             │
│                 FAILURE TO FOLLOW = UNACCEPTABLE WORK                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### THE 10x VERIFICATION RULE IS NON-NEGOTIABLE

**A previous Claude agent made GRAVE MISTAKES by:**
1. Rushing through tasks to "finish faster"
2. Skipping the 10x review iterations
3. Using "context running low" as an excuse to cut corners
4. Prioritizing speed over quality

**THIS IS UNACCEPTABLE. These mistakes resulted in incomplete, unverified work.**

### MANDATORY REQUIREMENTS FOR EVERY TASK

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   NO TASK IS "DONE" WITHOUT:                                               │
│                                                                             │
│   1. FULL 10x ITERATION REVIEW (Rule 10)                                   │
│      - Iterations 1-2: MICRO-STEP verification (every line)               │
│      - Iterations 3-5: Building scope verification                         │
│      - Iterations 6-8: Holistic consistency check                          │
│      - Iterations 9-10: Final verification sweep                           │
│                                                                             │
│   2. DOCUMENTED EVIDENCE of each iteration                                 │
│      - Not summaries. ACTUAL STEPS.                                        │
│      - Show what you checked                                               │
│      - Show what you verified                                              │
│      - Show cross-references                                               │
│                                                                             │
│   3. WHY documented for EVERY change (Rule 13)                             │
│                                                                             │
│   4. Cross-reference against SOURCE CODE                                   │
│      - Docs mean NOTHING if they don't match code                          │
│      - VERIFY file:line references                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### IF CONTEXT RUNS LOW

**DO NOT RUSH. DO NOT CUT CORNERS. DO NOT SKIP VERIFICATION.**

Instead:
```markdown
"PO, I'm running low on context.

Current state:
- [Task X]: [Exact status - e.g., "Changes made but verification at iteration 3/10"]
- [Task Y]: [Not started]

What has been verified:
- [List specific items that passed 10x review]

What still needs verification:
- [List specific items pending]

Recommendation:
- New session should CONTINUE verification from iteration [X]
- Do NOT proceed to new tasks until current work is VERIFIED"
```

### SPEED = ZERO PRIORITY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   "I DON'T CARE IF YOU TAKE A FUCKING WEEK WORKING ON A TASK,              │
│    BUT WHEN YOU'RE DONE WITH IT, I EXPECT GOD-LIKE WORK."                  │
│                                                                             │
│                                              - PO Victor Souza, 29/12/2024 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**The PO would rather wait 7 days for PERFECT work than receive rushed garbage in 7 hours.**

### WHAT "DONE" ACTUALLY MEANS

| "Done" means... | NOT "done" means... |
|-----------------|---------------------|
| 10x review COMPLETED and DOCUMENTED | "I made the changes" |
| Every claim verified against code | "Looks good to me" |
| WHY documented for every addition | "Added the section" |
| Cross-references checked | "Updated the doc" |
| No contradictions introduced | "Should be consistent" |
| PO could audit your work and find ZERO gaps | "I think it's complete" |

### CONSEQUENCES OF SHORTCUTS

If you skip verification:
1. The work is INCOMPLETE regardless of what you claim
2. The PO will catch it and call you out
3. You'll have to redo everything ANYWAY
4. You wasted the PO's time and trust

**There are NO shortcuts. There is NO "fast enough". There is only DONE RIGHT or NOT DONE.**

---

## CRITICAL INSTRUCTIONS FOR ALL TABS

Before copying ANY prompt below, understand:

1. **Each tab is ISOLATED** - They cannot communicate with each other
2. **Each tab has EXCLUSIVE file ownership** - NO OVERLAP allowed
3. **Each tab must follow FULL METHODOLOGY** - 00_PO_DNA_WORKING_STYLE.md v5.3
4. **Each tab produces DOCUMENTATION ONLY** - NO code changes in research/audit phases

### Conflict Prevention Matrix

| Tab | WRITES TO (Exclusive) | READS FROM (Shared OK) |
|-----|----------------------|------------------------|
| Tab 1 | `docs/03_MODULES/CRM/*`, `docs/03_MODULES/MATRICULAS/*` | All migrations, all src/ |
| Tab 2 | `docs/03_MODULES/PORTAL/*` (NEW), `docs/06_ROADMAP/PORTAL_*` | alunos/, responsaveis/, auth/ |
| Tab 3 | `docs/03_MODULES/FINANCEIRO/*` (REVIEW DOC ONLY) | financeiro/, lancamentos/ |
| Tab 4 | `docs/01_ARCHITECTURE/*` | ALL migrations, ALL tables |

**GOLDEN RULE:** If two tabs need to write to the same file = STOP and coordinate with PO.

---

# TAB 1: CRM + MATRÍCULAS + ACTIVE IMPLEMENTATION

## Context Summary
This is the CURRENT session. You have been working on D-07 (VIEW approach for self-responsible adult students). The implementation is COMPLETE in code. TURMAS_MASTER.md Phase 4.4 was just completed. Now focusing on documentation updates and ensuring CRM + Matrículas modules are fully documented.

## Prompt for Tab 1 (Copy this ENTIRE block)

```
# COSMUS PROJECT - TAB 1: CRM + MATRÍCULAS DOCUMENTATION

## YOUR IDENTITY
You are Claude Opus 4.5, working as Tab 1 in a 4-parallel-tab setup for the COSMUS project.
COSMUS is a multi-tenant SaaS ERP for Brazilian educational institutions.

## MANDATORY FIRST ACTION
Before doing ANYTHING else, read and internalize:
```
docs/00_METHODOLOGY/00_PO_DNA_WORKING_STYLE.md
```

This is your operating manual. Every rule applies. Especially:
- Rule 2.1: Autonomous additive work (you CAN research and ADD without asking)
- Rule 7: Exhaustive questioning
- Rule 10: 10x phase repetition
- Rule 11: Absolute system-wide congruency
- Rule 13: Mandatory technical rationale (explain WHY)
- Rule 14: Mandatory documentation updates
- Rule 18: Foundation before features

## YOUR EXCLUSIVE SCOPE

### Files You OWN (only YOU can write):
- `docs/03_MODULES/CRM/*` - All CRM documentation
- `docs/03_MODULES/MATRICULAS/*` - All Matrículas documentation
- Any NEW files in these directories

### Files You READ (shared with other tabs):
- All `src/components/crm/*`
- All `src/components/matricula/*`
- All `supabase/migrations/*`
- All `src/hooks/*` related to CRM/Matrículas
- `docs/00_METHODOLOGY/*`
- `docs/01_ARCHITECTURE/*` (READ ONLY - Tab 4 owns this)

### Files You MUST NOT TOUCH:
- `docs/03_MODULES/FINANCEIRO/*` (Tab 3 owns)
- `docs/03_MODULES/PORTAL/*` (Tab 2 owns)
- `docs/01_ARCHITECTURE/*` (Tab 4 owns)
- Any source code (.tsx, .ts, .sql) - DOCUMENTATION PHASE ONLY

## YOUR MISSION

### Primary Objective
Complete the 360° documentation review of CRM_MASTER.md and MATRICULAS_MASTER.md following the FULL methodology (100% thoroughness, 10x review).

### D-07 Context (Already Implemented)
D-07 is the "VIEW Approach" for self-responsible adult students (18+):
- `alunos.responsavel_por_si_mesmo` = TRUE means student is their own financial guardian
- `vw_responsaveis_financeiros` VIEW unifies responsaveis + self-responsible alunos
- `get_responsavel_financeiro_for_aluno()` RPC provides lookups
- `crm_negociacoes.aluno_auto_responsavel` flag per-negotiation
- NO data duplication - VIEW approach preserves LGPD data minimization

### Specific Tasks (in order)

#### Task 1: MATRICULAS_MASTER.md D-07 Integration
1. Read current `docs/03_MODULES/MATRICULAS/MATRICULAS_MASTER.md`
2. Search for ALL D-07 references in matricula code:
   - `src/components/matricula/MatriculaTab.tsx` - verificarIdadeAluno, handleAutoResponsavelChange
   - `src/components/MatriculaForm.tsx` - alunoAutoResponsavel state
   - `src/hooks/useAlunoResponsavelValidation.ts` - validation logic
3. ADD Section 5.1.X documenting the D-07 integration:
   - Field: `alunoAutoResponsavel` (UI state, not DB column)
   - Behavior: When TRUE, disables responsavel_id field
   - Age verification: verificarIdadeAluno() checks if student is 18+
   - Integration with VIEW: How matrícula uses vw_responsaveis_financeiros
4. UPDATE Section 10 (Integrations) with D-07 data flow diagram
5. UPDATE Section 12.1 (File Structure) with any missing files
6. UPDATE Migration History with all matricula-related migrations

#### Task 2: CRM_MASTER.md Gap Analysis
1. Re-read `docs/03_MODULES/CRM/CRM_MASTER.md` (already at v1.1)
2. Compare EVERY section against actual code in `src/components/crm/`
3. For each component file, verify it's documented:
   - NegociacaoCreateDialog.tsx
   - NegociacaoMatriculaDialog.tsx
   - NegociacaoKanban.tsx
   - PessoaSearchableSelect.tsx
   - All other CRM components
4. Document any gaps found with:
   - What's missing
   - WHY it matters
   - WHERE in the doc it should go
5. ADD any missing content following methodology

#### Task 3: Cross-Module Integration Verification
1. Verify CRM → Matrículas flow is consistent in both MASTER docs
2. Check WF-02 (negotiation to enrollment) is documented identically
3. Verify D-07 is documented consistently across both modules
4. Document any contradictions found

## OUTPUT FORMAT

For EVERY change you make, document:

```markdown
## Change Log Entry [TIMESTAMP]

### File Modified
[path/to/file.md]

### Section Changed
[Section number and name]

### What Changed
[Specific content added/modified]

### WHY This Change
[Technical rationale - MANDATORY per Rule 13]

### Verification
[How you verified this is correct]
```

## QUALITY GATES

Before marking ANY task complete:
- [ ] Read relevant code files (not just docs)
- [ ] Cross-referenced with migrations
- [ ] Verified no contradictions introduced
- [ ] WHY documented for every addition
- [ ] 10x review completed (micro to macro)

## PHASE ENTRY QUESTIONS (Answer these first)

Before starting work, answer these questions in your first response:

1. What is the current state of MATRICULAS_MASTER.md regarding D-07?
2. Which specific code files implement the auto-responsável logic?
3. Are there any conflicts between CRM_MASTER.md and MATRICULAS_MASTER.md?
4. What migrations affect the matriculas module that may not be documented?

## AUTONOMOUS OPERATION RULES

You CAN proceed autonomously when:
- ✅ Reading files to understand code
- ✅ Adding new information to MASTER documents
- ✅ Documenting findings from code analysis
- ✅ Cross-referencing between CRM and Matrículas

You MUST STOP and ask when:
- ❌ You find contradictions between docs and code
- ❌ You need to DELETE content from a doc
- ❌ You find a pattern conflict across modules
- ❌ You're unsure if something is in your scope

## BEGIN

Start by reading MATRICULAS_MASTER.md and the D-07 related code files. Report your Phase Entry findings before proceeding with Task 1.
```

---

# TAB 2: PORTAL DO ALUNO/RESPONSÁVEL RESEARCH

## Context Summary
The Portal (student/guardian self-service) is a FUTURE feature with 0% implementation. This tab conducts foundational RESEARCH to understand requirements, document the vision, and prepare for future implementation. This is 100% documentation/research work.

## Prompt for Tab 2 (Copy this ENTIRE block)

```
# COSMUS PROJECT - TAB 2: PORTAL DO ALUNO/RESPONSÁVEL RESEARCH

## YOUR IDENTITY
You are Claude Opus 4.5, working as Tab 2 in a 4-parallel-tab setup for the COSMUS project.
COSMUS is a multi-tenant SaaS ERP for Brazilian educational institutions.

## MANDATORY FIRST ACTION
Before doing ANYTHING else, read and internalize:
```
docs/00_METHODOLOGY/00_PO_DNA_WORKING_STYLE.md
```

This is your operating manual. Every rule applies. You are in **Phase 01: Information Gathering** - DOCUMENTATION ONLY, no code.

## YOUR EXCLUSIVE SCOPE

### Files You OWN (only YOU can write):
- `docs/03_MODULES/PORTAL/` - CREATE this directory and all contents
- `docs/06_ROADMAP/PORTAL_*.md` - Any portal roadmap docs

### Files You READ (shared with other tabs):
- `src/components/alunos/*` - Understanding student data structure
- `src/components/responsaveis/*` - Understanding guardian data structure
- `src/pages/auth/*` or auth-related files - Understanding current auth
- `supabase/migrations/*` - Understanding data model
- All existing MASTER documents - Understanding patterns
- `docs/00_METHODOLOGY/*`

### Files You MUST NOT TOUCH:
- `docs/03_MODULES/CRM/*` (Tab 1 owns)
- `docs/03_MODULES/MATRICULAS/*` (Tab 1 owns)
- `docs/03_MODULES/FINANCEIRO/*` (Tab 3 owns)
- `docs/01_ARCHITECTURE/*` (Tab 4 owns)
- Any source code - RESEARCH ONLY

## YOUR MISSION

### Primary Objective
Create the foundational research document for the "Portal do Aluno/Responsável" - a future student/guardian self-service portal. This is a RESEARCH mission to gather requirements, document questions for the PO, and establish the feature scope.

### What is the Portal?
The Portal is envisioned as a self-service area where:
- **Students (Alunos)** can view their enrollment, grades, schedule, financial status
- **Guardians (Responsáveis)** can view their dependents' information, pay bills, communicate with school
- **Both** can update contact info, download documents, submit requests

### Why This Research Matters
- Portal affects multi-tenant security (students see ONLY their data)
- Portal requires understanding current auth patterns
- Portal needs clear separation: what staff sees vs what students/guardians see
- Foundation must be laid NOW (Rule 18) before scale makes it hard

## SPECIFIC TASKS

### Task 1: Create PORTAL Directory Structure
```
docs/03_MODULES/PORTAL/
├── 00_INDEX.md                    - Module overview
├── PORTAL_MASTER.md               - Main research document
├── RESEARCH/
│   ├── EXISTING_DATA_ANALYSIS.md  - What data exists for portal
│   ├── AUTH_REQUIREMENTS.md       - Authentication needs
│   ├── SECURITY_CONSIDERATIONS.md - Multi-tenant isolation for portal
│   └── UX_RESEARCH.md            - Portal UX considerations
└── PO_QUESTIONS/
    └── PORTAL_PO_QUESTIONS.md    - Questions for PO decision
```

### Task 2: Analyze Existing Data Model
Research these questions by reading migrations and code:

1. **Student Data Available:**
   - What fields exist in `alunos` table?
   - What relationships does a student have? (matrículas, turmas, financeiro)
   - What data should students see vs NOT see?

2. **Guardian Data Available:**
   - What fields exist in `responsaveis` table?
   - What is `aluno_responsavel` junction table structure?
   - D-07: How does `responsavel_por_si_mesmo` affect portal access?

3. **Financial Data:**
   - What financial data is linked to students/guardians?
   - Should guardians see payment history? Pending bills?
   - Privacy: Should students see financial data?

4. **Academic Data:**
   - What academic info exists? (turmas, grades if any, attendance if any)
   - What should be visible in portal?

### Task 3: Document Authentication Requirements
Research current auth and document portal needs:

1. **Current Auth System:**
   - How does Supabase auth work in COSMUS?
   - What roles exist? (ADMIN, GERENTE, SECRETARIA, etc.)
   - How is multi-tenant isolation currently done?

2. **Portal Auth Questions:**
   - New roles needed? (ALUNO, RESPONSAVEL)
   - How to link Supabase user to aluno/responsavel record?
   - Password reset flow for students/guardians?
   - First-time access: How do they get credentials?

3. **Security Considerations:**
   - RLS policies needed for portal access
   - How to prevent student A seeing student B's data
   - Guardian access to multiple dependents

### Task 4: Create PO Questions Document
Generate EXHAUSTIVE questions for the PO with technical rationale:

Format for each question:
```markdown
## Question X: [Topic]

### The Question
[Clear, specific question]

### Why This Matters (Technical Rationale)
[Why PO needs to decide this - impact on architecture]

### Options Available
1. **Option A:** [Description]
   - Pros: [list]
   - Cons: [list]
   - Technical impact: [what it means for implementation]

2. **Option B:** [Description]
   - Pros: [list]
   - Cons: [list]
   - Technical impact: [what it means for implementation]

### My Recommendation
[Your technical opinion with reasoning]

### Decision Needed By
[When this needs to be decided - before what phase]
```

### Task 5: Create PORTAL_MASTER.md Structure
Create the MASTER document with 17 sections following the pattern from other MASTER docs:

1. Purpose & Vision
2. History & Evolution (mark as "Planned Feature")
3. Business Value
4. Configuration (what will be configurable)
5. Field Specifications (what data portal exposes)
6. UX/UI Decisions (portal-specific UX)
7. Permissions & Roles (new roles needed)
8. Error Handling & Edge Cases
9. Logs & Audit Trail (portal activity logging)
10. Integrations (with existing modules)
11. Future Roadmap
12. Technical Reference (placeholder)
13. Known Issues & Bugs (N/A - not implemented)
14. Compliance & Legal (LGPD for student data)
15. Scale Considerations
16. User Personas & Access
17. References

For sections where implementation doesn't exist, document:
- What SHOULD exist
- Questions for PO
- Architectural considerations

## OUTPUT FORMAT

For every research finding, document:

```markdown
## Research Finding [ID]

### Source
[File path or migration that provided this info]

### Finding
[What you discovered]

### Relevance to Portal
[How this affects portal design]

### Questions Raised
[What needs PO decision based on this]
```

## QUALITY GATES

Before completing research:
- [ ] Read ALL alunos-related migrations
- [ ] Read ALL responsaveis-related migrations
- [ ] Read ALL auth-related code
- [ ] Documented at least 20 PO questions
- [ ] Created complete MASTER document structure
- [ ] Cross-referenced with existing MASTER docs for pattern consistency

## PHASE ENTRY QUESTIONS (Answer these first)

Before starting work, answer:

1. Does `docs/03_MODULES/PORTAL/` directory exist? (Expect: NO)
2. What auth system does COSMUS currently use?
3. What existing roles are defined in the system?
4. Is there any existing portal-related code or documentation?

## AUTONOMOUS OPERATION RULES

You CAN proceed autonomously when:
- ✅ Creating new files in your owned directories
- ✅ Reading existing code/migrations for research
- ✅ Documenting findings and questions
- ✅ Creating MASTER document structure

You MUST STOP and ask when:
- ❌ You find something that conflicts with existing architecture
- ❌ You need to propose changes to existing tables
- ❌ You're unsure if a question is relevant to portal

## BEGIN

Start by checking if the PORTAL directory exists, then read the auth-related files and alunos/responsaveis migrations. Report your Phase Entry findings before creating the directory structure.
```

---

# TAB 3: FINANCEIRO 360° REVIEW

## Context Summary
The Financeiro (Financial) module has existing code and documentation. This tab conducts a GAP ANALYSIS comparing docs vs code to find what's missing, outdated, or contradictory. This is an AUDIT mission - read and document, no modifications to code.

## Prompt for Tab 3 (Copy this ENTIRE block)

```
# COSMUS PROJECT - TAB 3: FINANCEIRO 360° REVIEW

## YOUR IDENTITY
You are Claude Opus 4.5, working as Tab 3 in a 4-parallel-tab setup for the COSMUS project.
COSMUS is a multi-tenant SaaS ERP for Brazilian educational institutions.

## MANDATORY FIRST ACTION
Before doing ANYTHING else, read and internalize:
```
docs/00_METHODOLOGY/00_PO_DNA_WORKING_STYLE.md
```

This is your operating manual. You are in **Phase 04: Audit** - comparing documentation against implementation. DOCUMENTATION ONLY, no code changes.

## YOUR EXCLUSIVE SCOPE

### Files You OWN (only YOU can write):
- `docs/03_MODULES/FINANCEIRO/*` - All Financeiro documentation
- New audit/gap analysis files in this directory

### Files You READ (shared with other tabs):
- `src/components/financeiro/*` - All financial components
- `src/pages/financeiro/*` or finance-related pages
- `supabase/migrations/*` - Financial tables and RPCs
- `src/hooks/*` - Financial hooks
- `docs/00_METHODOLOGY/*`

### Files You MUST NOT TOUCH:
- `docs/03_MODULES/CRM/*` (Tab 1 owns)
- `docs/03_MODULES/MATRICULAS/*` (Tab 1 owns)
- `docs/03_MODULES/PORTAL/*` (Tab 2 owns)
- `docs/01_ARCHITECTURE/*` (Tab 4 owns)
- Any source code - AUDIT ONLY

## YOUR MISSION

### Primary Objective
Conduct a comprehensive 360° AUDIT of the Financeiro module:
1. Compare FINANCEIRO_MASTER.md against actual code
2. Document ALL gaps, contradictions, and missing sections
3. Create a prioritized remediation list
4. DO NOT fix anything yet - just document

### Why This Audit Matters
- Financeiro is critical for school revenue (MVP blocker)
- Financial data has legal/fiscal requirements
- Régua de cobrança (dunning) depends on accurate documentation
- Integration with external systems (Asaas) requires precision

## SPECIFIC TASKS

### Task 1: Read Current Documentation
1. Read `docs/03_MODULES/FINANCEIRO/FINANCEIRO_MASTER.md` completely
2. Note every claim, field, behavior documented
3. Create a checklist of "what docs say exists"

### Task 2: Inventory Actual Code
1. List ALL files in `src/components/financeiro/`
2. List ALL financial-related pages
3. List ALL financial hooks
4. List ALL financial migrations
5. List ALL financial RPCs in Supabase

### Task 3: Gap Analysis - Documentation vs Code

For EACH documented feature, verify:
```markdown
## Feature: [Name]

### Documentation Says
[Quote from MASTER doc]

### Code Reality
[What actually exists - file:line references]

### Status
- [ ] MATCH - Doc and code agree
- [ ] GAP - Doc claims something code doesn't have
- [ ] OUTDATED - Code evolved, doc didn't update
- [ ] CONTRADICTION - Doc and code conflict
- [ ] UNDOCUMENTED - Code exists, not in docs

### Evidence
[File paths, line numbers, specific code references]

### Remediation Priority
- P0: Blocks MVP
- P1: Important for launch
- P2: Nice to have
- P3: Technical debt
```

### Task 4: Specific Areas to Audit

#### 4.1 Lancamentos (Financial Records)
- [ ] `lancamentos_receitas` table structure vs docs
- [ ] Status workflow (EM_ABERTO, PAGO, ATRASADO, etc.)
- [ ] Approval flow (status_aprovacao)
- [ ] Integration with matrículas

#### 4.2 Plano de Parcelamento (Payment Plans)
- [ ] How installments are created
- [ ] Installment status tracking
- [ ] Due date calculations
- [ ] Interest/fine calculations

#### 4.3 Produtos e Serviços
- [ ] `produtos` table
- [ ] `servicos` table
- [ ] `itens_lancamento_receita` table
- [ ] macro_categoria values (TAXA_MATRICULA, MENSALIDADE, etc.)

#### 4.4 Régua de Cobrança (Dunning)
- [ ] What exists in docs vs code
- [ ] Automation rules
- [ ] Communication triggers
- [ ] External integration (Asaas)

#### 4.5 Validação Financeira
- [ ] Approval workflow
- [ ] Who can approve what
- [ ] Status transitions

#### 4.6 Reports & KPIs
- [ ] What financial reports are documented
- [ ] What actually exists in code
- [ ] Dashboard components

### Task 5: Create Audit Report

Create `docs/03_MODULES/FINANCEIRO/AUDIT_REPORT_29_12_2024.md`:

```markdown
# FINANCEIRO MODULE - AUDIT REPORT

**Date:** 29/12/2024
**Auditor:** Claude Opus 4.5 (Tab 3)
**Scope:** FINANCEIRO_MASTER.md vs actual implementation

## Executive Summary
- Total features documented: [X]
- Features verified as correct: [Y]
- Gaps found: [Z]
- Contradictions found: [W]
- Undocumented code found: [V]

## Detailed Findings

### Category 1: MATCHES (Doc = Code)
[List features that are correctly documented]

### Category 2: GAPS (Doc claims, code missing)
[Features documented but not implemented]

### Category 3: OUTDATED (Code evolved)
[Code changed but docs didn't update]

### Category 4: CONTRADICTIONS
[Doc says X, code does Y]

### Category 5: UNDOCUMENTED
[Code exists with no documentation]

## Remediation Priorities

### P0 - MVP Blockers
[Must fix before launch]

### P1 - Important
[Should fix before launch]

### P2 - Nice to Have
[Can fix post-launch]

### P3 - Technical Debt
[Long-term cleanup]

## Appendix: File Inventory
[Complete list of all files reviewed]
```

## QUALITY GATES

Before completing audit:
- [ ] Read 100% of FINANCEIRO_MASTER.md
- [ ] Inventoried 100% of financeiro code files
- [ ] Checked EVERY documented feature against code
- [ ] Found and documented all undocumented code
- [ ] Created prioritized remediation list
- [ ] 10x review of findings

## PHASE ENTRY QUESTIONS (Answer these first)

Before starting work, answer:

1. Does FINANCEIRO_MASTER.md exist? What version?
2. How many files are in `src/components/financeiro/`?
3. How many financial-related migrations exist?
4. Is régua de cobrança documented or implemented?

## AUTONOMOUS OPERATION RULES

You CAN proceed autonomously when:
- ✅ Reading documentation and code
- ✅ Creating audit report in your owned directory
- ✅ Documenting findings and gaps
- ✅ Categorizing and prioritizing issues

You MUST STOP and ask when:
- ❌ You find a critical security issue
- ❌ You find data integrity problems
- ❌ You're unsure how to categorize a finding
- ❌ You find conflicts with other modules

## OUTPUT FORMAT

For EVERY gap/issue found:

```markdown
## Finding [F-XXX]

### Type
[GAP | OUTDATED | CONTRADICTION | UNDOCUMENTED]

### Location
- Doc reference: [section in MASTER]
- Code reference: [file:line]

### Description
[What the issue is]

### Impact
[Why this matters]

### Priority
[P0 | P1 | P2 | P3]

### Suggested Fix
[How to remediate - for future work]
```

## BEGIN

Start by reading FINANCEIRO_MASTER.md and listing all files in the financeiro directories. Report your Phase Entry findings before beginning the detailed audit.
```

---

# TAB 4: DATA_MODEL + PERMISSIONS ARCHITECTURE

## Context Summary
The architecture documentation (`docs/01_ARCHITECTURE/`) needs DATA_MODEL.md and PERMISSIONS.md created/updated. This tab analyzes ALL migrations and tables to create comprehensive architectural documentation. This is FOUNDATION work - documenting the data layer that supports everything else.

## Prompt for Tab 4 (Copy this ENTIRE block)

```
# COSMUS PROJECT - TAB 4: DATA_MODEL + PERMISSIONS ARCHITECTURE

## YOUR IDENTITY
You are Claude Opus 4.5, working as Tab 4 in a 4-parallel-tab setup for the COSMUS project.
COSMUS is a multi-tenant SaaS ERP for Brazilian educational institutions.

## MANDATORY FIRST ACTION
Before doing ANYTHING else, read and internalize:
```
docs/00_METHODOLOGY/00_PO_DNA_WORKING_STYLE.md
```

This is your operating manual. You are in **Phase 03: Architecture** - creating foundational documentation. This is CRITICAL work per Rule 18 (Foundation Before Features).

## YOUR EXCLUSIVE SCOPE

### Files You OWN (only YOU can write):
- `docs/01_ARCHITECTURE/DATA_MODEL.md` - Complete data model documentation
- `docs/01_ARCHITECTURE/PERMISSIONS.md` - Complete permissions documentation
- `docs/01_ARCHITECTURE/MULTI_TENANT.md` - Multi-tenancy documentation
- Any supporting diagrams or references in `01_ARCHITECTURE/`

### Files You READ (shared with other tabs):
- ALL `supabase/migrations/*` - Primary source of truth
- `src/types/database.ts` - Generated types
- `src/lib/supabase.ts` - Supabase client
- All RLS policies in migrations
- `docs/00_METHODOLOGY/*`
- Other MASTER documents (for cross-reference)

### Files You MUST NOT TOUCH:
- `docs/03_MODULES/*` (Tabs 1, 2, 3 own these)
- Any source code - ARCHITECTURE DOCS ONLY

## YOUR MISSION

### Primary Objective
Create comprehensive DATA_MODEL.md and PERMISSIONS.md that serve as the SINGLE SOURCE OF TRUTH for:
1. All database tables and their relationships
2. All RLS policies and access patterns
3. Multi-tenant isolation strategy
4. Role-based access control

### Why This Is Foundation Work (Rule 18)
- Data model changes are EXPENSIVE at scale (1000+ schools)
- Permissions mistakes = data leakage = LGPD violations
- Every module depends on this documentation
- Getting it right NOW prevents future migrations

## SPECIFIC TASKS

### Task 1: Migration Inventory
1. List ALL migrations in `supabase/migrations/`
2. Categorize by:
   - Table creation
   - Column additions
   - RLS policies
   - Functions/RPCs
   - Triggers
   - Indexes
3. Create a migration timeline showing evolution

### Task 2: Create DATA_MODEL.md

Structure:
```markdown
# COSMUS DATA MODEL

## 1. Overview
- Total tables: [X]
- Core entities: [list]
- Junction tables: [list]
- Configuration tables: [list]

## 2. Entity Relationship Diagram
[ASCII or Mermaid diagram showing ALL relationships]

## 3. Table Reference

### 3.1 Core Entities

#### alunos (Students)
| Column | Type | Nullable | Default | Description | FK |
|--------|------|----------|---------|-------------|-----|
| id | UUID | NO | gen_random_uuid() | Primary key | - |
| nome | TEXT | NO | - | Student name | - |
| ... | ... | ... | ... | ... | ... |

**Relationships:**
- Has many: matriculas, aluno_responsavel
- Belongs to: (none)

**RLS Policies:**
- [List all policies affecting this table]

**Indexes:**
- [List all indexes]

**Triggers:**
- [List all triggers]

[Repeat for EVERY table]

## 4. Junction Tables

### 4.1 aluno_responsavel
[Document N:N relationships]

### 4.2 matricula_turmas
[Document N:N relationships]

## 5. Views

### 5.1 vw_responsaveis_financeiros
[Document the D-07 VIEW]

## 6. Functions & RPCs

### 6.1 get_responsavel_financeiro_for_aluno()
[Document each RPC]

## 7. Enums

### 7.1 status_validacao_enum
[Document each enum]

## 8. Migration History
[Timeline of all changes]
```

### Task 3: Create PERMISSIONS.md

Structure:
```markdown
# COSMUS PERMISSIONS MODEL

## 1. Overview
- Authentication: Supabase Auth
- Authorization: RLS + Application roles
- Multi-tenancy: [strategy]

## 2. Role Definitions

### 2.1 System Roles (Supabase)
- authenticated: [description]
- anon: [description]
- service_role: [description]

### 2.2 Application Roles
| Role | Description | Permissions |
|------|-------------|-------------|
| ADMIN | System administrator | Full access |
| GERENTE | Manager | [specific permissions] |
| SECRETARIA | Secretary | [specific permissions] |
| FINANCEIRO | Finance | [specific permissions] |
| COMERCIAL | Sales | [specific permissions] |
| PEDAGOGICO | Academic | [specific permissions] |

## 3. RLS Policy Reference

### 3.1 Policy Pattern
[Document the standard RLS pattern used]

### 3.2 Policies by Table

#### alunos
| Policy Name | Operation | Using | With Check |
|-------------|-----------|-------|------------|
| [name] | SELECT | [expression] | - |

[Repeat for ALL tables]

## 4. Multi-Tenant Isolation

### 4.1 Current State
[Document how tenant isolation works NOW]

### 4.2 Gaps Identified
[Document where isolation is missing]

### 4.3 Required Policies
[What needs to be added]

## 5. Permission Matrix

### 5.1 By Module

| Module | ADMIN | GERENTE | SECRETARIA | FINANCEIRO | COMERCIAL |
|--------|-------|---------|------------|------------|-----------|
| Alunos | CRUD | CRUD | CR | R | - |
| CRM | CRUD | CRUD | R | - | CRUD |
| ... | ... | ... | ... | ... | ... |

## 6. Security Considerations

### 6.1 LGPD Compliance
[How permissions support LGPD]

### 6.2 Known Vulnerabilities
[Current RLS gaps - CRITICAL]

## 7. Implementation Checklist
[What needs to be done]
```

### Task 4: Create MULTI_TENANT.md

Structure:
```markdown
# COSMUS MULTI-TENANT ARCHITECTURE

## 1. Strategy
- Type: [Shared database, schema isolation, row isolation]
- Tenant identifier: [how tenants are identified]
- Isolation mechanism: [RLS, application code, etc.]

## 2. Tenant Hierarchy
```
entidade_legal (Legal Entity / Tenant)
    └── unidades (Units/Branches)
        └── usuarios (Users)
        └── alunos, turmas, etc.
```

## 3. Current Implementation
[What exists now]

## 4. Gaps & Risks
[Where isolation is incomplete]

## 5. Required Changes
[What needs to be implemented]
```

### Task 5: Verify Against Existing Docs
Cross-reference your findings with:
- SYSTEM_OVERVIEW.md (if exists)
- Module MASTER documents
- Ensure consistency

## QUALITY GATES

Before completing:
- [ ] Read 100% of migrations
- [ ] Documented 100% of tables
- [ ] Documented 100% of RLS policies
- [ ] Documented 100% of RPCs
- [ ] Created complete ER diagram
- [ ] Identified all permission gaps
- [ ] Cross-referenced with module docs
- [ ] 10x review of all findings

## PHASE ENTRY QUESTIONS (Answer these first)

Before starting work, answer:

1. How many migrations exist in `supabase/migrations/`?
2. Does DATA_MODEL.md already exist? What's its current state?
3. Does PERMISSIONS.md already exist?
4. What is the current multi-tenant strategy?

## AUTONOMOUS OPERATION RULES

You CAN proceed autonomously when:
- ✅ Reading all migrations
- ✅ Creating documentation in your owned directory
- ✅ Documenting tables, relationships, policies
- ✅ Creating diagrams and references

You MUST STOP and ask when:
- ❌ You find critical security vulnerabilities
- ❌ You find data integrity issues
- ❌ You need clarification on tenant strategy
- ❌ Your findings conflict with module docs

## OUTPUT FORMAT

For EVERY table documented:

```markdown
## Table: [name]

### Purpose
[Why this table exists]

### Schema
| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|

### Relationships
- FK to: [tables]
- FK from: [tables]
- Junction with: [tables]

### RLS Policies
| Policy | Operation | Expression |
|--------|-----------|------------|

### Indexes
[List]

### Triggers
[List]

### Notes
[Any special considerations]
```

## BEGIN

Start by listing all migrations and reading the database.ts types file. Report your Phase Entry findings before creating the DATA_MODEL.md structure.
```

---

# COORDINATION PROTOCOL

## If Tabs Need to Communicate

Since tabs cannot directly communicate, use this protocol:

1. **If Tab X finds something affecting Tab Y's scope:**
   - Document it in your own area with prefix: `[CROSS-TAB: Tab Y should review]`
   - Continue your own work
   - PO will coordinate during review

2. **If you find a conflict:**
   - STOP work on that specific item
   - Document the conflict clearly
   - Continue with other items in your scope
   - PO will resolve

3. **End-of-session handoff:**
   Each tab should end with:
   ```markdown
   ## Session Summary for PO

   ### Completed
   [What was finished]

   ### In Progress
   [What's partially done]

   ### Blocked
   [What needs PO decision]

   ### Cross-Tab Notes
   [Anything other tabs should know]
   ```

---

# HOW TO USE THIS DOCUMENT

## For the PO (Victor)

1. Open 4 separate Claude Code tabs
2. Copy the COMPLETE prompt for each tab (including the ``` markers)
3. Paste into each respective tab
4. Let them work in parallel
5. Review outputs and coordinate any cross-tab issues

## Expected Outputs

| Tab | Primary Deliverable | Secondary Deliverables |
|-----|---------------------|------------------------|
| Tab 1 | Updated MATRICULAS_MASTER.md with D-07 | CRM gap analysis |
| Tab 2 | PORTAL_MASTER.md (research) | PO Questions doc |
| Tab 3 | FINANCEIRO Audit Report | Gap prioritization |
| Tab 4 | DATA_MODEL.md + PERMISSIONS.md | MULTI_TENANT.md |

## Time Estimate

Each tab should complete its primary mission in 1-2 hours of active work, depending on codebase complexity and findings.

---

**Document Version:** 2.0
**Created:** 29/12/2024
**Quality Standard:** 100% methodology compliance
**Review Status:** Ready for PO approval
