# PARALLEL OPUS 4.5 TASK PLAN

**Date:** 29/12/2024
**Purpose:** Maximize productivity with 4 parallel Claude Opus 4.5 tabs
**Methodology:** Full PO DNA v5.2 compliance

---

## CRITICAL RULES FOR PARALLEL WORK

1. **NO FILE CONFLICTS** - Each tab works on completely separate directories/files
2. **CLEAR BOUNDARIES** - Each tab has explicit scope
3. **METHODOLOGY COMPLIANCE** - Every tab follows 100% thoroughness rule
4. **DOCUMENTATION FIRST** - Research and document before implementing

---

## TAB ALLOCATION

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    4 PARALLEL OPUS 4.5 TABS                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TAB 1: CURRENT SESSION                                                 │
│  ────────────────────                                                   │
│  Owner: This conversation                                               │
│  Focus: CRM + D-07 + Active implementation                              │
│  Files: src/components/crm/*, docs/03_MODULES/CRM/*                     │
│                                                                          │
│  TAB 2: PORTAL DO ALUNO/RESPONSÁVEL RESEARCH                           │
│  ───────────────────────────────────────────                            │
│  Owner: New conversation                                                │
│  Focus: Deep research on student/parent portal                          │
│  Files: docs/03_MODULES/PORTAL/* (new)                                  │
│                                                                          │
│  TAB 3: FINANCEIRO 360° REVIEW                                          │
│  ─────────────────────────────                                          │
│  Owner: New conversation                                                │
│  Focus: Validate existing FINANCEIRO_MASTER, find gaps                  │
│  Files: docs/03_MODULES/FINANCEIRO/*, src/components/financeiro/*       │
│                                                                          │
│  TAB 4: DATA_MODEL + PERMISSIONS ARCHITECTURE                           │
│  ────────────────────────────────────────────                           │
│  Owner: New conversation                                                │
│  Focus: Complete Phase 2.3 and 2.4 from master plan                     │
│  Files: docs/01_ARCHITECTURE/*, supabase/migrations/*                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## TAB 1: CURRENT SESSION (Already Active)

**YOU ARE HERE** - Continue with current work.

### Scope
- CRM_MASTER.md updates ✅ DONE
- D-07 implementation ✅ DONE
- Active bug fixes and implementations
- Any PO requests that come up

### Files Owned
- `src/components/crm/*`
- `docs/03_MODULES/CRM/*`
- `docs/05_DEBUGGING/D-07_*`
- Any active implementation files

### Current Status
- D-07 complete and applied
- CRM_MASTER.md v1.1 complete
- Ready for next task

---

## TAB 2: PORTAL DO ALUNO/RESPONSÁVEL RESEARCH

### PROMPT TO COPY INTO NEW TAB:

```
You are working on the COSMUS project - a multi-tenant SaaS ERP for Brazilian educational institutions.

## YOUR MISSION: PORTAL DO ALUNO/RESPONSÁVEL - Deep Research

This is a **RESEARCH ONLY** task. Do NOT write code. Your goal is to create comprehensive documentation for a future student/parent portal.

## METHODOLOGY REQUIREMENTS (MANDATORY)

Follow these rules from PO DNA v5.2:
1. **100% Thoroughness** - Not even 0.01% can be left incomplete
2. **Document the WHY** - Every decision needs justification
3. **Exhaustive Questions** - List ALL questions that need PO answers
4. **Find Contradictions** - Identify any gaps or conflicts
5. **LGPD Compliance** - Data protection is mandatory

## RESEARCH SCOPE

Create: `docs/03_MODULES/PORTAL/PORTAL_RESEARCH_29_12_2024.md`

### 1. WHAT EXISTS ANALYSIS
- Search the codebase for any existing portal-related code
- Check migrations for portal tables
- Identify what data students/parents would need to see

### 2. FEATURE REQUIREMENTS (Research What's Needed)

For STUDENTS (Portal do Aluno):
- View grades/notas
- View schedule/horários
- View attendance/frequência
- View financial status (their own payments)
- Download documents (certificates, declarations)
- Update profile (limited fields)
- Request documents (requerimentos)

For PARENTS/GUARDIANS (Portal do Responsável):
- View child's grades
- View child's attendance
- View financial obligations
- Make payments (future ASAAS integration)
- Communicate with school
- Access multiple children (if applicable)

### 3. AUTHENTICATION ARCHITECTURE
Research and document:
- Separate auth from staff portal?
- Magic link vs password?
- Email verification requirements
- Multi-child access for parents
- LGPD consent requirements

### 4. DATA ACCESS RULES
Document which tables each portal user type can access:
- alunos (student can see own, parent can see linked children)
- matriculas
- turmas
- notas (future)
- frequencia (future)
- lancamentos_receitas (financial)
- documentos

### 5. INTEGRATION POINTS
Map connections to existing modules:
- Alunos module (profile data)
- Matrículas module (enrollment info)
- Financeiro module (payment status)
- Turmas module (schedule)
- Future: Pedagógico (grades)

### 6. QUESTIONS FOR PO
List EVERY question that needs clarification:
- Should portal be separate app or integrated?
- Mobile app vs responsive web?
- Notification preferences?
- Document request workflow?
- Payment capabilities?

### 7. SECURITY & COMPLIANCE
Document requirements for:
- LGPD data access rights
- Audit logging
- Session management
- Data isolation (can't see other students)

## OUTPUT FORMAT

Create comprehensive markdown document with:
- Executive summary
- Feature breakdown with WHY for each
- Data model requirements
- Authentication flow diagrams (ASCII)
- Question list for PO (numbered)
- Risk analysis
- Implementation recommendations

## FILES TO READ (Start Here)
1. docs/03_MODULES/ALUNOS/ALUNOS_MASTER.md
2. docs/03_MODULES/FINANCEIRO/FINANCEIRO_MASTER.md
3. src/components/alunos/*
4. supabase/migrations/* (search for RLS policies)

## DO NOT
- Write any code
- Modify any existing files except creating new docs in docs/03_MODULES/PORTAL/
- Make implementation decisions without documenting alternatives

## DELIVERABLE
A comprehensive PORTAL_RESEARCH_29_12_2024.md that could serve as the foundation for future implementation planning.
```

---

## TAB 3: FINANCEIRO 360° REVIEW

### PROMPT TO COPY INTO NEW TAB:

```
You are working on the COSMUS project - a multi-tenant SaaS ERP for Brazilian educational institutions.

## YOUR MISSION: FINANCEIRO MODULE - 360° Review

This is a **REVIEW AND VALIDATION** task. Your goal is to audit the existing FINANCEIRO documentation and code for completeness, accuracy, and gaps.

## METHODOLOGY REQUIREMENTS (MANDATORY)

Follow these rules from PO DNA v5.2:
1. **100% Thoroughness** - Not even 0.01% can be left incomplete
2. **Exhaustive Review** - Every field, every function, every edge case
3. **Find Contradictions** - Compare docs vs code vs database
4. **Document Gaps** - What's missing from documentation?
5. **Validate D-07 Impact** - Check if self-responsible handling is documented

## REVIEW SCOPE

### 1. DOCUMENTATION AUDIT
Read and analyze:
- `docs/03_MODULES/FINANCEIRO/FINANCEIRO_MASTER.md`
- All files in `docs/03_MODULES/FINANCEIRO/`

For each document, verify:
- Is the WHY documented for every feature?
- Are all fields exhaustively documented?
- Are code references accurate (file:line)?
- Is the migration history complete?

### 2. CODE vs DOCS VALIDATION
Compare documentation against actual code:
- `src/components/financeiro/*`
- `src/pages/Financeiro.tsx`
- `supabase/migrations/*` (financeiro-related)

Find discrepancies:
- Features in code not in docs
- Features in docs not in code
- Field names that don't match
- Outdated code references

### 3. D-07 INTEGRATION CHECK
The D-07 decision affects Financeiro because:
- Self-responsible students have `responsavel_id = NULL` in lancamentos
- Must use `vw_responsaveis_financeiros` VIEW for lookups
- NovoLancamentoReceita must handle self-responsible case

Verify:
- Is D-07 documented in FINANCEIRO_MASTER.md?
- Is the VIEW usage documented?
- Are edge cases covered?

### 4. GAP ANALYSIS
Create a list of:
- Missing sections in documentation
- Missing field documentation
- Missing integration documentation
- Missing error handling documentation
- Missing LGPD considerations

### 5. ASAAS INTEGRATION STATUS
Research and document:
- Current state of ASAAS integration
- What's implemented vs planned
- Configuration requirements
- Webhook handling

## OUTPUT FORMAT

Create: `docs/03_MODULES/FINANCEIRO/FINANCEIRO_360_REVIEW_29_12_2024.md`

Structure:
1. Executive Summary (pass/fail assessment)
2. Documentation Accuracy Score (%)
3. Code vs Docs Discrepancies (table)
4. D-07 Integration Status
5. Gap List (prioritized)
6. ASAAS Status Report
7. Recommendations for Updates
8. Questions for PO

## FILES TO READ (Priority Order)
1. docs/03_MODULES/FINANCEIRO/FINANCEIRO_MASTER.md
2. src/components/financeiro/NovoLancamentoReceita.tsx
3. src/components/financeiro/LancamentosReceitasList.tsx
4. supabase/migrations/*financeiro* or *lancamentos*
5. docs/03_MODULES/FINANCEIRO/*.md (all files)

## DO NOT
- Modify FINANCEIRO_MASTER.md (only create review doc)
- Write any code
- Work on files outside FINANCEIRO scope

## DELIVERABLE
A comprehensive review document that identifies all gaps and provides a roadmap for documentation updates.
```

---

## TAB 4: DATA_MODEL + PERMISSIONS ARCHITECTURE

### PROMPT TO COPY INTO NEW TAB:

```
You are working on the COSMUS project - a multi-tenant SaaS ERP for Brazilian educational institutions.

## YOUR MISSION: Complete Phase 2.3 and 2.4 of Documentation Plan

This is a **DOCUMENTATION CREATION** task from the master plan. You will create two critical architecture documents.

## METHODOLOGY REQUIREMENTS (MANDATORY)

Follow these rules from PO DNA v5.2:
1. **100% Thoroughness** - Document EVERY table, EVERY relationship
2. **Document the WHY** - Every design decision needs justification
3. **Visual Diagrams** - Use ASCII art for ERD and flow diagrams
4. **Include Constraints** - All FKs, indexes, RLS policies
5. **Multi-tenant Focus** - Everything through tenant isolation lens

## DELIVERABLES

### DELIVERABLE 1: DATA_MODEL.md

Create: `docs/01_ARCHITECTURE/DATA_MODEL.md`

Content:
1. **Overview**
   - Database: PostgreSQL via Supabase
   - Total tables count
   - Schema organization

2. **Entity Relationship Diagram (ASCII)**
   - Core entities (alunos, responsaveis, matriculas)
   - CRM entities (pessoas, negociacoes, etc.)
   - Financial entities (lancamentos, etc.)
   - Configuration entities (cursos, turmas, etc.)

3. **Table Inventory**
   For EACH table:
   - Table name
   - Purpose (WHY it exists)
   - Key columns
   - Foreign keys
   - Indexes
   - RLS policies (current state)
   - Related tables

4. **Key Relationships**
   - alunos ↔ responsaveis (junction)
   - alunos ↔ matriculas
   - crm_pessoas → alunos/responsaveis (promotion)
   - matriculas → lancamentos_receitas
   - D-07: vw_responsaveis_financeiros VIEW

5. **Naming Conventions**
   - Portuguese for domain (alunos, turmas)
   - English for technical (created_at, id)
   - Prefixes (crm_*, status_*)

### DELIVERABLE 2: PERMISSIONS.md

Create: `docs/01_ARCHITECTURE/PERMISSIONS.md`

Content:
1. **Role Hierarchy**
   - SUPERADMIN (system level)
   - ADMIN (tenant level)
   - GERENTE
   - COMERCIAL
   - FINANCEIRO
   - SECRETARIA
   - PROFESSOR
   - ALUNO (future portal)
   - RESPONSAVEL (future portal)

2. **Permission Matrix**
   Table showing each module vs each role:
   - CRM: who can access
   - Alunos: who can access
   - Matrículas: who can access
   - Financeiro: who can access
   - Turmas: who can access
   - Configurações: who can access

3. **RLS Strategy**
   Current state (CRITICAL GAP: most tables use `USING (true)`)
   Required state (tenant isolation)
   Implementation plan

4. **Multi-tenant Isolation**
   - tenant_id propagation
   - unidade_id → entidade_legal → tenant chain
   - Cross-tenant protection

5. **Audit Requirements**
   - What actions are logged
   - Who can view logs
   - Retention policy

## FILES TO READ (Priority Order)
1. supabase/migrations/*.sql (ALL - for table structure)
2. docs/01_ARCHITECTURE/SYSTEM_OVERVIEW.md
3. src/types/database.ts (generated types)
4. docs/03_MODULES/*/MASTER.md (for module-specific permissions)

## METHODOLOGY FOR TABLE ANALYSIS

For each migration file:
1. Extract CREATE TABLE statements
2. Document columns with types
3. Identify foreign keys
4. Note any RLS policies
5. Cross-reference with other tables

## OUTPUT STRUCTURE

Both documents should follow:
- Table of Contents
- Executive Summary
- Detailed sections with diagrams
- GAP Analysis section
- Recommendations

## DO NOT
- Modify any code
- Create migrations
- Work on files outside docs/01_ARCHITECTURE/

## DELIVERABLE
Two comprehensive architecture documents that serve as the foundation for all other documentation.
```

---

## CONFLICT PREVENTION MATRIX

| Resource | Tab 1 | Tab 2 | Tab 3 | Tab 4 |
|----------|-------|-------|-------|-------|
| `src/components/crm/*` | ✅ OWN | ❌ | ❌ | ❌ |
| `src/components/financeiro/*` | ❌ | ❌ | ✅ READ | ❌ |
| `src/components/alunos/*` | ❌ | ✅ READ | ❌ | ❌ |
| `docs/03_MODULES/CRM/*` | ✅ OWN | ❌ | ❌ | ❌ |
| `docs/03_MODULES/PORTAL/*` | ❌ | ✅ OWN | ❌ | ❌ |
| `docs/03_MODULES/FINANCEIRO/*` | ❌ | ❌ | ✅ OWN | ❌ |
| `docs/01_ARCHITECTURE/*` | ❌ | ❌ | ❌ | ✅ OWN |
| `supabase/migrations/*` | ✅ WRITE | ❌ | ✅ READ | ✅ READ |

**Legend:**
- ✅ OWN = Can create/modify files
- ✅ READ = Can read but not modify
- ✅ WRITE = Can create new files
- ❌ = Do not touch

---

## EXPECTED OUTPUTS

| Tab | Primary Deliverable | Secondary Deliverables |
|-----|--------------------|-----------------------|
| 1 | Ongoing implementation | Bug fixes, PO requests |
| 2 | `PORTAL_RESEARCH_29_12_2024.md` | Questions list for PO |
| 3 | `FINANCEIRO_360_REVIEW_29_12_2024.md` | Gap list, D-07 validation |
| 4 | `DATA_MODEL.md` + `PERMISSIONS.md` | ERD diagrams, RLS audit |

---

## HOW TO START EACH TAB

1. **Open new Claude Code terminal/tab**
2. **Navigate to project**: `cd thevictorsouzaprojetct`
3. **Copy the prompt** from the relevant section above
4. **Paste and execute**
5. **Let it run autonomously**

---

## SYNCHRONIZATION POINTS

After all tabs complete, merge findings:
1. Tab 2 (Portal) may identify new requirements for Tab 3 (Financeiro)
2. Tab 4 (Architecture) provides foundation for all modules
3. Tab 3 (Financeiro review) may find D-07 gaps that Tab 1 needs to fix

---

*Document created: 29/12/2024*
*Following PO DNA v5.2 - Maximize productivity through parallelization*
