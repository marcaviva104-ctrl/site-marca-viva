# PARALLEL OPUS 4.5 - MASTERFUL PROMPTS

**Date:** 29/12/2024
**Purpose:** Complete, methodology-compliant prompts for 4 parallel Claude Opus 4.5 tabs
**Methodology:** PO DNA v5.3 - 100% Thoroughness, EXHAUSTIVE Documentation

---

## CRITICAL: READ THIS FIRST

Before copying ANY prompt below:

1. **Each tab is INDEPENDENT** - No file conflicts between tabs
2. **Each tab follows FULL METHODOLOGY** - 17 Golden Rules apply
3. **Each tab has CLEAR SCOPE** - Do not cross boundaries
4. **ADDITIVE ONLY** - Add information, never delete without PO approval
5. **EXHAUSTIVE** - 0.01% incomplete is NOT acceptable

---

## TAB OWNERSHIP MATRIX (NO CONFLICTS)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FILE OWNERSHIP MATRIX                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Resource                          │ Tab 1 │ Tab 2 │ Tab 3 │ Tab 4 │         │
├───────────────────────────────────┼───────┼───────┼───────┼───────┤         │
│ src/components/crm/*              │ ✅ OWN│ ❌    │ ❌    │ ❌    │         │
│ src/components/matricula/*        │ ✅ OWN│ ❌    │ ❌    │ ❌    │         │
│ src/components/financeiro/*       │ ❌    │ ❌    │ ✅READ│ ❌    │         │
│ src/components/alunos/*           │ ❌    │ ✅READ│ ❌    │ ❌    │         │
│ docs/03_MODULES/CRM/*             │ ✅ OWN│ ❌    │ ❌    │ ❌    │         │
│ docs/03_MODULES/MATRICULAS/*      │ ✅ OWN│ ❌    │ ❌    │ ❌    │         │
│ docs/03_MODULES/PORTAL/*          │ ❌    │ ✅ OWN│ ❌    │ ❌    │         │
│ docs/03_MODULES/FINANCEIRO/*      │ ❌    │ ❌    │ ✅ OWN│ ❌    │         │
│ docs/01_ARCHITECTURE/*            │ ❌    │ ❌    │ ❌    │ ✅ OWN│         │
│ supabase/migrations/*             │ ✅READ│ ❌    │ ✅READ│ ✅READ│         │
│ src/types/database.ts             │ READ  │ READ  │ READ  │ READ  │         │
└─────────────────────────────────────────────────────────────────────────────┘

Legend:
- ✅ OWN = Can create/modify files in this directory
- ✅ READ = Can read but NOT modify
- ❌ = Do NOT access this directory
```

---

## TAB 1: CRM + MATRÍCULAS IMPLEMENTATION (CURRENT SESSION)

**Owner:** This conversation (already active)
**Status:** Continue working

### Scope
- D-07 implementation updates ✅ DONE
- CRM_MASTER.md v1.1 ✅ DONE
- MATRICULAS_MASTER.md D-07 integration (in progress)
- Active bug fixes and implementations
- Any PO requests that arise

### Files Owned
```
src/components/crm/*
src/components/matricula/*
docs/03_MODULES/CRM/*
docs/03_MODULES/MATRICULAS/*
docs/05_DEBUGGING/D-07_*
```

### Current Task
Updating MATRICULAS_MASTER.md with D-07 VIEW integration documentation.

---

## TAB 2: PORTAL DO ALUNO/RESPONSÁVEL - DEEP RESEARCH

### PROMPT (Copy this entire block into a new Claude Code tab)

```
# COSMUS PROJECT - PORTAL DO ALUNO/RESPONSÁVEL RESEARCH

## CONTEXT

You are working on **COSMUS** - a multi-tenant SaaS ERP for Brazilian educational institutions (schools, language centers, music schools, etc.).

**COSMUS Definition:**
> "A UNIVERSE of information that works in harmony but also somehow 'independent', yet very well integrated and connected."

**Scale:**
- Thousands of schools as tenants
- Hundreds of thousands of students (alunos)
- Parents/Guardians (responsáveis)
- Teachers, staff, administrators
- LGPD compliance MANDATORY

---

## YOUR MISSION

**RESEARCH ONLY** - Create comprehensive documentation for a future student/parent portal.

**DO NOT WRITE ANY CODE.**

Your deliverable is: `docs/03_MODULES/PORTAL/PORTAL_RESEARCH_29_12_2024.md`

---

## METHODOLOGY REQUIREMENTS (MANDATORY - NO EXCEPTIONS)

You MUST follow PO DNA v5.3:

### Rule 1: 100% THOROUGHNESS
> "Not even 0.01% can be left incomplete. Every little issue, as insignificant as it may seem, must be addressed."

### Rule 3: ONE THING AT A TIME
- Analyze one file at a time
- Analyze one concept at a time
- Document each finding before moving on

### Rule 7: EXHAUSTIVE QUESTIONING
- List EVERY question that needs PO answers
- Question every assumption
- Document alternatives for each decision

### Rule 9: NO SUPERFICIALITY
❌ "Portal will show grades" (too vague)
✅ "Portal displays grades from `notas` table, filtered by `aluno_id`, grouped by `turma_id`, showing columns: disciplina, nota, data_avaliacao, professor. Grades under 6.0 highlighted in red. WHY: Immediate visibility of academic risk."

### Rule 10: 10X REVIEW PATTERN
Do each analysis section at least twice before moving on.

### Rule 13: MANDATORY TECHNICAL RATIONALE
Every recommendation must include WHY with technical reasoning.

### Rule 14: MANDATORY DOCUMENTATION
Document everything. Nothing is too small to document.

### Rule 18: FOUNDATION BEFORE FEATURES
Focus on data model, permissions, authentication architecture BEFORE features.

---

## RESEARCH SCOPE

### PHASE 1: UNDERSTAND WHAT EXISTS

**Read these files first (in order):**
1. `docs/03_MODULES/ALUNOS/ALUNOS_MASTER.md` - Student data model
2. `docs/03_MODULES/FINANCEIRO/FINANCEIRO_MASTER.md` - Financial data (parents see payments)
3. `docs/03_MODULES/MATRICULAS/MATRICULAS_MASTER.md` - Enrollment data
4. `src/components/alunos/*` - Existing student components
5. `supabase/migrations/*` - Search for RLS policies, understand current security

**Document findings:**
- What student/parent data already exists?
- What tables would portal users access?
- What RLS policies exist today?
- What's the current auth architecture?

### PHASE 2: PORTAL DO ALUNO (Student Portal)

Research and document EXHAUSTIVELY:

**2.1 Data Access Requirements**
| Data Type | Table(s) | Access Level | LGPD Consideration | WHY Portal Needs This |
|-----------|----------|--------------|--------------------|-----------------------|
| Personal Info | alunos | Own record only | Consent required | Self-service profile |
| Grades | notas (future) | Own grades only | Educational legitimate interest | Academic progress |
| Attendance | frequencia (future) | Own records | Educational legitimate interest | Attendance tracking |
| Schedule | turmas, horarios | Own classes | N/A | Daily planning |
| Documents | documentos | Own documents | Consent for downloads | Certificate access |
| Financial | lancamentos_receitas | Own payments | Contract basis | Payment visibility |

**2.2 Features Deep Dive**
For EACH feature, document:
- What exactly can the student see?
- What can they edit (if anything)?
- What actions can they take?
- What notifications do they receive?
- What are the edge cases?
- What could go wrong?

**Features to research:**
1. View grades/notas
2. View schedule/horários
3. View attendance/frequência
4. View financial status (own payments only)
5. Download documents (certificates, declarations)
6. Update profile (which fields? WHY those fields?)
7. Request documents (requerimentos workflow)
8. View course materials (future LMS integration?)

### PHASE 3: PORTAL DO RESPONSÁVEL (Parent/Guardian Portal)

**3.1 Critical Difference from Staff Portal**
Parents are EXTERNAL users. Document:
- Different authentication requirements
- Different data visibility rules
- Multi-child access (parent with 3 children)
- Financial visibility (can see what they owe)
- Communication preferences

**3.2 The Parent-Child Relationship**
Research the `aluno_responsavel` junction table:
```sql
-- How does this work?
-- What types of relationships exist?
-- How does this affect portal access?
SELECT * FROM aluno_responsavel;
```

Document:
- Parent can see ALL linked children
- But only with tipo_responsabilidade that grants access
- Financeiro type = can see/pay invoices
- Pedagógico type = can see grades/attendance
- Ambos = both access levels

**3.3 D-07 Impact on Parent Portal**
The D-07 decision (VIEW approach) affects parent portal:
- Self-responsible students (18+) ARE their own "parent" for portal purposes
- They access BOTH student and financial views
- Use `vw_responsaveis_financeiros` VIEW for unified lookup

### PHASE 4: AUTHENTICATION ARCHITECTURE

Research and document options with WHY:

**4.1 Separate Auth vs Unified Auth**
| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| Separate app/auth | Complete isolation | Duplicate code | ??? |
| Same app, different role | Code reuse | More complex RLS | ??? |
| Supabase Auth with claims | Native support | Learning curve | ??? |

**4.2 Authentication Methods**
For each, document WHY appropriate or not:
- Magic link (email-based)
- Password with email verification
- OAuth (Google for parents?)
- SMS verification (Brazilian mobile culture)

**4.3 Multi-Child Access**
```
Parent: Maria
├── Child 1: João (School A)
├── Child 2: Ana (School A)
└── Child 3: Pedro (School B - different tenant!)

QUESTION: Can Maria see all 3 from one login?
QUESTION: What about tenant isolation?
QUESTION: How does this work with RLS?
```

### PHASE 5: DATA ISOLATION & SECURITY

**5.1 Current RLS Audit**
Search migrations for RLS policies:
- Are they tenant-isolated?
- Do they support portal user type?
- What gaps exist?

**5.2 Portal-Specific RLS Requirements**
Document policies needed for:
- Student can only see own data
- Parent can only see linked children's data
- Parent cannot see other parents' children
- Tenant isolation must still work
- Staff cannot access portal path, portal cannot access staff path

**5.3 LGPD Compliance**
| Data Category | Legal Basis | Portal User Access | Retention | Notes |
|---------------|-------------|-------------------|-----------|-------|
| Personal info | Consent + Contract | View own | Contract duration | Right to access |
| Financial | Contract | View linked | 5+ years fiscal | Cannot delete |
| Academic | Educational | View own/children | Permanent | MEC requirement |
| Attendance | Educational | View own/children | Academic year | Aggregatable |

### PHASE 6: INTEGRATION POINTS

Map connections to existing modules:
```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PORTAL INTEGRATION MAP                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [PORTAL]                                                               │
│     │                                                                    │
│     ├──► [ALUNOS] - Student profile data                                │
│     │        └──► Read: nome, email, telefone, foto                     │
│     │        └──► Write: Limited profile fields                         │
│     │                                                                    │
│     ├──► [RESPONSÁVEIS] - Parent profile (if parent login)              │
│     │        └──► Read: own profile                                     │
│     │        └──► Write: contact preferences                            │
│     │                                                                    │
│     ├──► [MATRÍCULAS] - Enrollment status                               │
│     │        └──► Read: situacao, turma, dates                          │
│     │        └──► Write: None                                           │
│     │                                                                    │
│     ├──► [FINANCEIRO] - Payment status                                  │
│     │        └──► Read: own/child lancamentos                           │
│     │        └──► Action: Pay (via ASAAS redirect)                      │
│     │                                                                    │
│     ├──► [TURMAS] - Class schedule                                      │
│     │        └──► Read: turma info, horarios                            │
│     │                                                                    │
│     └──► [DOCUMENTOS] - Certificates/declarations                       │
│              └──► Read: available documents                             │
│              └──► Action: Request, Download                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### PHASE 7: QUESTIONS FOR PO

**EXHAUSTIVE LIST** - Number every question:

**Architecture Questions:**
1. Should the portal be a separate application or integrated into the main app?
2. Should portal users share the same Supabase Auth or have separate auth?
3. Can a parent access children in DIFFERENT tenants from one login?
4. Should we build mobile app (React Native) or responsive web first?

**Feature Questions:**
5. Which features are MVP vs future?
6. Can students/parents send messages to staff through the portal?
7. Should there be push notifications? Email notifications?
8. Can parents make payments directly in the portal?
9. Should document requests have an approval workflow?
10. Can students see grades from previous years/enrollments?

**Access Control Questions:**
11. Can a student see their own financial data, or only the parent?
12. At what age can a student access the portal independently?
13. Should there be different portal tiers (free vs premium features)?
14. Can schools disable specific portal features per tenant?

**Security Questions:**
15. Two-factor authentication required for financial access?
16. Session timeout duration?
17. Device management (remember this device)?
18. Audit logging requirements for portal access?

**UX Questions:**
19. Language support (Portuguese only or multi-language)?
20. Accessibility requirements (screen readers, etc.)?
21. Dark mode support?
22. Offline capability needed?

**Add more questions as you discover them during research.**

---

## OUTPUT FORMAT

Create: `docs/03_MODULES/PORTAL/PORTAL_RESEARCH_29_12_2024.md`

Structure:
```markdown
# PORTAL DO ALUNO/RESPONSÁVEL - RESEARCH DOCUMENT

**Version:** 1.0
**Date:** 29/12/2024
**Status:** RESEARCH COMPLETE - AWAITING PO REVIEW
**Author:** Claude (following PO DNA v5.3)

---

## EXECUTIVE SUMMARY
[2-3 paragraphs summarizing findings]

## 1. CURRENT STATE ANALYSIS
### 1.1 Existing Data Model
### 1.2 Current Authentication
### 1.3 RLS Policy Audit
### 1.4 D-07 Impact

## 2. PORTAL DO ALUNO (Student)
### 2.1 Feature Requirements
### 2.2 Data Access Rules
### 2.3 UX Considerations

## 3. PORTAL DO RESPONSÁVEL (Parent/Guardian)
### 3.1 Feature Requirements
### 3.2 Multi-Child Access
### 3.3 Financial Visibility

## 4. AUTHENTICATION ARCHITECTURE
### 4.1 Options Analysis
### 4.2 Recommendation with WHY
### 4.3 Implementation Considerations

## 5. DATA ACCESS & RLS
### 5.1 Current Gaps
### 5.2 Required Policies
### 5.3 Tenant Isolation

## 6. INTEGRATION MAP
[ASCII diagram + details]

## 7. LGPD & COMPLIANCE
### 7.1 Legal Basis Per Data Type
### 7.2 Consent Requirements
### 7.3 Audit Trail Needs

## 8. QUESTIONS FOR PO
[Numbered, categorized list]

## 9. RISK ANALYSIS
[What could go wrong, mitigation]

## 10. IMPLEMENTATION RECOMMENDATIONS
[Ordered by priority with WHY]

## 11. APPENDICES
### A. Tables Referenced
### B. Files Read
### C. Technical Notes
```

---

## DO NOT

❌ Write any code
❌ Modify existing files (except creating new docs in PORTAL/)
❌ Make implementation decisions without documenting alternatives
❌ Skip the WHY for any recommendation
❌ Leave any section incomplete
❌ Assume anything without documenting the assumption

---

## DELIVERABLE CHECKLIST

Before finishing, verify:
- [ ] Executive summary complete
- [ ] All phases researched
- [ ] All files listed in scope were read
- [ ] D-07 impact documented
- [ ] Multi-child access documented
- [ ] Authentication options analyzed
- [ ] RLS requirements documented
- [ ] LGPD considerations complete
- [ ] 20+ questions for PO listed
- [ ] Risk analysis included
- [ ] Implementation recommendations ordered
- [ ] All file references included
- [ ] ASCII diagrams for data flow
- [ ] No section left at 0.01% incomplete

---

## START NOW

Begin with Phase 1: Read the existing documentation and code.
Use the Explore agent or Glob/Grep tools to find relevant files.
Document findings as you go.

Remember: RESEARCH ONLY. Your output is documentation, not code.
```

---

## TAB 3: FINANCEIRO 360° REVIEW

### PROMPT (Copy this entire block into a new Claude Code tab)

```
# COSMUS PROJECT - FINANCEIRO MODULE 360° REVIEW

## CONTEXT

You are working on **COSMUS** - a multi-tenant SaaS ERP for Brazilian educational institutions.

**Scale:** Thousands of schools, hundreds of thousands of students, LGPD compliant.

---

## YOUR MISSION

**REVIEW AND VALIDATION** - Audit the existing FINANCEIRO documentation and code for completeness, accuracy, and gaps.

**THIS IS AN AUDIT, NOT IMPLEMENTATION.**

Your deliverable is: `docs/03_MODULES/FINANCEIRO/FINANCEIRO_360_REVIEW_29_12_2024.md`

---

## METHODOLOGY REQUIREMENTS (MANDATORY)

You MUST follow PO DNA v5.3:

### Rule 1: 100% THOROUGHNESS
> "Not even 0.01% can be left incomplete."

### Rule 10: 10X REVIEW PATTERN
Review each section multiple times with increasing scope.

### Rule 11: ABSOLUTE SYSTEM-WIDE CONGRUENCY
Check for inconsistencies between documentation and code.

### Rule 13: MANDATORY TECHNICAL RATIONALE
Every finding must include WHY it matters.

### Rule 14: MANDATORY DOCUMENTATION
Document every finding, even small ones.

---

## REVIEW SCOPE

### PHASE 1: DOCUMENTATION AUDIT

**Read and analyze:**
1. `docs/03_MODULES/FINANCEIRO/FINANCEIRO_MASTER.md` - Main document
2. All files in `docs/03_MODULES/FINANCEIRO/*.md`

**For each document, verify:**

| Criterion | Check | Score (0-100%) |
|-----------|-------|----------------|
| Is the WHY documented for every feature? | | |
| Are all fields exhaustively documented? | | |
| Are code references accurate (file:line)? | | |
| Is migration history complete? | | |
| Are edge cases documented? | | |
| Is error handling documented? | | |
| Is LGPD compliance documented? | | |
| Are integration points documented? | | |

### PHASE 2: CODE vs DOCS VALIDATION

**Compare documentation against actual code:**

1. `src/components/financeiro/*` - All components
2. `src/pages/Financeiro.tsx` - Main page
3. `supabase/migrations/*` - Search for financeiro/lancamentos

**Create a discrepancy table:**

| Location | Doc Says | Code Does | Severity | Action Needed |
|----------|----------|-----------|----------|---------------|
| Example | "Field X is required" | "Field X is optional" | HIGH | Update doc OR fix code |

**Find:**
- Features in code not documented
- Features documented but not in code
- Field names that don't match
- Outdated code references
- Status values that differ
- Validation rules that differ

### PHASE 3: D-07 INTEGRATION CHECK

**D-07 Decision (29/12/2024) affects Financeiro because:**
- Self-responsible students have `responsavel_id = NULL` in lancamentos
- Must use `vw_responsaveis_financeiros` VIEW for responsible lookups
- `NovoLancamentoReceita` must handle self-responsible case

**Verify:**
1. Is D-07 documented in FINANCEIRO_MASTER.md?
2. Is the VIEW usage documented?
3. Is `responsavel_id = NULL` case handled?
4. Are edge cases covered (adult student paying own tuition)?

**Read these D-07 files for context:**
- `docs/03_PO_INPUTS/APPROVED_DECISIONS/D-07_P0-1_VIEW_APPROACH_29_12_2024.md`
- `supabase/migrations/20251229200000_create_vw_responsaveis_financeiros.sql`

### PHASE 4: COMPONENT-BY-COMPONENT AUDIT

**For each file in src/components/financeiro/:**

| Component | Purpose | Documented? | Fields Match? | Status Values Match? | Integration Correct? |
|-----------|---------|-------------|---------------|---------------------|---------------------|
| NovoLancamentoReceita.tsx | Create revenue entry | | | | |
| LancamentosReceitasList.tsx | List revenue | | | | |
| FinanceiroResumo.tsx | Dashboard | | | | |
| PlanoParcelamentoDialog.tsx | Payment plans | | | | |
| QuitacaoDialog.tsx | Record payment | | | | |
| [List all...] | | | | | |

### PHASE 5: GAP ANALYSIS

Create a comprehensive gap list:

**Gap Categories:**
1. **Documentation Gaps** - Missing sections/fields
2. **Code Gaps** - Features not implemented
3. **Integration Gaps** - Missing connections
4. **D-07 Gaps** - Self-responsible handling
5. **LGPD Gaps** - Compliance issues
6. **UX Gaps** - Inconsistent patterns

**For each gap:**
```markdown
### GAP-FIN-001: [Title]

**Category:** [Documentation/Code/Integration/D-07/LGPD/UX]
**Severity:** [CRITICAL/HIGH/MEDIUM/LOW]
**Location:** [file:line or doc section]

**What's Missing:**
[Description]

**WHY This Matters:**
[Technical/business impact]

**Recommendation:**
[How to fix]

**Effort Estimate:**
[Small/Medium/Large]
```

### PHASE 6: ASAAS INTEGRATION STATUS

**Research and document:**
1. Current state of ASAAS integration
2. What's implemented vs planned
3. Configuration requirements
4. Webhook handling
5. PIX/Boleto support
6. Sandbox vs production

**Read any ASAAS-related files:**
- Search for "asaas" in codebase
- Check for webhook endpoints
- Check for configuration

### PHASE 7: RÉGUA DE COBRANÇA STATUS

**The collection workflow (régua de cobrança) is critical:**
1. Is the workflow documented?
2. Is it implemented?
3. What automation exists?
4. What's manual vs automatic?

---

## OUTPUT FORMAT

Create: `docs/03_MODULES/FINANCEIRO/FINANCEIRO_360_REVIEW_29_12_2024.md`

Structure:
```markdown
# FINANCEIRO MODULE - 360° REVIEW

**Version:** 1.0
**Date:** 29/12/2024
**Status:** REVIEW COMPLETE
**Reviewer:** Claude (following PO DNA v5.3)

---

## EXECUTIVE SUMMARY

### Overall Assessment
| Criterion | Score | Status |
|-----------|-------|--------|
| Documentation Accuracy | X% | 🟢/🟡/🔴 |
| Code Alignment | X% | 🟢/🟡/🔴 |
| D-07 Integration | X% | 🟢/🟡/🔴 |
| ASAAS Integration | X% | 🟢/🟡/🔴 |
| LGPD Compliance | X% | 🟢/🟡/🔴 |

### Critical Findings
[Bullet list of top issues]

---

## 1. DOCUMENTATION AUDIT RESULTS
### 1.1 FINANCEIRO_MASTER.md Analysis
### 1.2 Other Documentation Files
### 1.3 Missing Sections

## 2. CODE vs DOCS DISCREPANCIES
[Table of all discrepancies]

## 3. D-07 INTEGRATION STATUS
### 3.1 Current State
### 3.2 Gaps Found
### 3.3 Recommendations

## 4. COMPONENT AUDIT
[Table per component]

## 5. GAP ANALYSIS
### 5.1 Critical Gaps
### 5.2 High Priority Gaps
### 5.3 Medium Priority Gaps
### 5.4 Low Priority Gaps

## 6. ASAAS INTEGRATION STATUS
### 6.1 Current Implementation
### 6.2 Missing Features
### 6.3 Configuration Requirements

## 7. RÉGUA DE COBRANÇA STATUS
### 7.1 Workflow Documentation
### 7.2 Implementation Status
### 7.3 Automation Gaps

## 8. QUESTIONS FOR PO
[Numbered list]

## 9. RECOMMENDATIONS
### 9.1 Documentation Updates Needed
### 9.2 Code Fixes Needed
### 9.3 Priority Order

## 10. APPENDICES
### A. Files Reviewed
### B. Migration Analysis
### C. Field Mapping Matrix
```

---

## DO NOT

❌ Modify FINANCEIRO_MASTER.md (only create review doc)
❌ Write any code
❌ Fix bugs (only document them)
❌ Work on files outside FINANCEIRO scope
❌ Skip D-07 verification

---

## DELIVERABLE CHECKLIST

Before finishing, verify:
- [ ] All FINANCEIRO docs read
- [ ] All FINANCEIRO components audited
- [ ] D-07 integration verified
- [ ] ASAAS status documented
- [ ] All gaps categorized
- [ ] Severity assigned to each gap
- [ ] Recommendations prioritized
- [ ] Questions for PO listed
- [ ] File references accurate

---

## START NOW

Begin with Phase 1: Read FINANCEIRO_MASTER.md completely.
Score each section for completeness.
Document findings as you go.

Remember: This is an AUDIT. Your output reveals gaps, not fixes.
```

---

## TAB 4: DATA_MODEL + PERMISSIONS ARCHITECTURE

### PROMPT (Copy this entire block into a new Claude Code tab)

```
# COSMUS PROJECT - DATA_MODEL + PERMISSIONS ARCHITECTURE

## CONTEXT

You are working on **COSMUS** - a multi-tenant SaaS ERP for Brazilian educational institutions.

**COSMUS Scale:**
- Thousands of schools (tenants)
- Hundreds of thousands of students
- Multi-role users (Admin, Manager, Secretary, Finance, Teacher, etc.)
- LGPD and MEC compliance required

---

## YOUR MISSION

**DOCUMENTATION CREATION** - Create two critical architecture documents from Phase 2.3 and 2.4 of the master plan.

Your deliverables:
1. `docs/01_ARCHITECTURE/DATA_MODEL.md`
2. `docs/01_ARCHITECTURE/PERMISSIONS.md`

---

## METHODOLOGY REQUIREMENTS (MANDATORY)

You MUST follow PO DNA v5.3:

### Rule 1: 100% THOROUGHNESS
> "Not even 0.01% can be left incomplete."

Every table documented. Every column explained. Every relationship mapped.

### Rule 3: ONE THING AT A TIME
- One migration file at a time
- One table at a time
- One relationship at a time

### Rule 13: MANDATORY TECHNICAL RATIONALE
Every design decision must include WHY.

### Rule 18: FOUNDATION BEFORE FEATURES
This is FOUNDATION documentation. It enables everything else.

---

## DELIVERABLE 1: DATA_MODEL.md

### PHASE 1: MIGRATION ANALYSIS

**Read ALL migration files in order:**
```
supabase/migrations/*.sql
```

**For each CREATE TABLE statement, extract:**
- Table name
- All columns with types
- Primary keys
- Foreign keys
- Indexes
- CHECK constraints
- DEFAULT values
- Comments

### PHASE 2: TABLE INVENTORY

Create a complete table inventory:

```markdown
## TABLE: [table_name]

**Purpose:** [WHY this table exists]
**Created:** [Migration date/file]
**Module:** [Which module owns this table]

### Columns

| Column | Type | Nullable | Default | FK | Purpose | WHY |
|--------|------|----------|---------|----|---------|----|
| id | UUID | NO | gen_random_uuid() | - | Primary key | Standard pattern |
| tenant_id | UUID | YES | - | tenants(id) | Tenant isolation | Multi-tenancy |
| ... | ... | ... | ... | ... | ... | ... |

### Indexes

| Index Name | Columns | Type | Purpose |
|------------|---------|------|---------|
| idx_xxx | column | BTREE | Performance |

### RLS Policies

| Policy Name | Operation | Expression | WHY |
|-------------|-----------|------------|-----|
| "tenant_isolation" | ALL | USING (tenant_id = current_tenant_id()) | Data isolation |

### Relationships

| Related Table | Relationship | FK Column | WHY |
|---------------|--------------|-----------|-----|
| alunos | 1:N | aluno_id | Students have many enrollments |
```

### PHASE 3: ENTITY RELATIONSHIP DIAGRAM

Create ASCII ERD:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    COSMUS - ENTITY RELATIONSHIP DIAGRAM                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        CORE ENTITIES                                     │
│                        ─────────────                                     │
│                                                                          │
│   ┌──────────────┐         ┌──────────────┐                             │
│   │   alunos     │◄────────┤ matriculas   │                             │
│   │              │  1:N    │              │                             │
│   │  - id (PK)   │         │  - id (PK)   │                             │
│   │  - nome      │         │  - aluno_id  │──────────┐                  │
│   │  - cpf       │         │  - turma_id  │          │                  │
│   │  ...         │         │  ...         │          │                  │
│   └──────────────┘         └──────────────┘          │                  │
│          │                        │                   │                  │
│          │  aluno_responsavel     │                   │                  │
│          │  (M:N junction)        │                   │                  │
│          ▼                        ▼                   │                  │
│   ┌──────────────┐         ┌──────────────┐          │                  │
│   │ responsaveis │         │   turmas     │◄─────────┘                  │
│   │              │         │              │                             │
│   │  - id (PK)   │         │  - id (PK)   │                             │
│   │  - nome      │         │  - nome      │                             │
│   │  - cpf       │         │  - curso_id  │                             │
│   └──────────────┘         └──────────────┘                             │
│                                                                          │
│   [Continue for ALL core entities...]                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### PHASE 4: KEY RELATIONSHIPS

Document critical relationships:

**4.1 alunos ↔ responsaveis (M:N via junction)**
```sql
-- The junction table enables:
-- 1. Multiple guardians per student
-- 2. Multiple students per guardian
-- 3. Different relationship types (Financeiro, Pedagógico, Ambos)

aluno_responsavel:
  - aluno_id (FK → alunos)
  - responsavel_id (FK → responsaveis)
  - tipo_responsabilidade (enum)
  - is_principal (boolean)
```

**4.2 D-07: vw_responsaveis_financeiros VIEW**
```sql
-- This VIEW unifies:
-- 1. External guardians from responsaveis table
-- 2. Self-responsible students from alunos table (where responsavel_por_si_mesmo = true)

-- WHY: No data duplication for self-responsible adults
```

### PHASE 5: NAMING CONVENTIONS

Document the naming patterns:

| Category | Pattern | Examples | WHY |
|----------|---------|----------|-----|
| Domain entities | Portuguese | alunos, turmas, matriculas | Brazilian domain |
| Technical columns | English | created_at, updated_at, id | Standard convention |
| Junction tables | entity1_entity2 | aluno_responsavel, matricula_turmas | Clear relationship |
| Status enums | status_[entity]_enum | status_validacao_enum | Consistent typing |
| CRM tables | crm_[entity] | crm_pessoas, crm_negociacoes | Module prefix |
| Views | vw_[purpose] | vw_responsaveis_financeiros | View indicator |

---

## DELIVERABLE 2: PERMISSIONS.md

### PHASE 1: ROLE HIERARCHY

**Document all roles:**

```markdown
## ROLE HIERARCHY

```
SUPERADMIN (system level - Anthropic/Victor)
    │
    ├── ADMIN (tenant level - school owner/director)
    │       │
    │       ├── GERENTE (manager)
    │       │       │
    │       │       ├── COMERCIAL (sales/CRM)
    │       │       ├── FINANCEIRO (finance)
    │       │       ├── SECRETARIA (secretary)
    │       │       └── COORDENADOR (coordinator)
    │       │
    │       └── PROFESSOR (teacher)
    │
    └── [Future: PORTAL roles]
            ├── ALUNO (student portal)
            └── RESPONSAVEL (parent portal)
```

**For each role, document:**
- Who typically has this role
- What they need to do (job function)
- What data they need access to
- What actions they can take
```

### PHASE 2: PERMISSION MATRIX

Create comprehensive matrix:

```markdown
## MODULE PERMISSION MATRIX

| Module | ADMIN | GERENTE | COMERCIAL | FINANCEIRO | SECRETARIA | PROFESSOR |
|--------|-------|---------|-----------|------------|------------|-----------|
| **CRM** |
| - View leads | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Create leads | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| - Delete leads | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Alunos** |
| - View all | ✅ | ✅ | ❌ | ❌ | ✅ | Own classes |
| - Create | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| - Edit | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **Financeiro** |
| - View lancamentos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| - Create lancamentos | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| - Approve | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| [Continue for ALL modules...] |
```

### PHASE 3: RLS STRATEGY

**Current State (CRITICAL AUDIT):**
```sql
-- PROBLEM: Most tables use:
USING (true)  -- NO TENANT ISOLATION!

-- This is a CRITICAL GAP for multi-tenant security.
```

**Required State:**
```sql
-- Every table with tenant-scoped data needs:
CREATE POLICY "tenant_isolation" ON [table_name]
  FOR ALL
  USING (
    unidade_id IN (
      SELECT u.id FROM unidades u
      WHERE u.entidade_legal_id IN (
        SELECT el.id FROM entidades_legais el
        WHERE el.tenant_id = auth.jwt() ->> 'tenant_id'
      )
    )
  );
```

### PHASE 4: MULTI-TENANT ISOLATION

```markdown
## TENANT ISOLATION ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    TENANT ISOLATION CHAIN                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   USER LOGIN                                                            │
│       │                                                                  │
│       │  JWT contains: tenant_id                                        │
│       ▼                                                                  │
│   ┌────────────────┐                                                    │
│   │   auth.users   │                                                    │
│   │                │                                                    │
│   │  tenant_id ────┼──────────────────────┐                             │
│   └────────────────┘                      │                             │
│                                           ▼                             │
│                               ┌────────────────────┐                    │
│                               │     tenants        │                    │
│                               │                    │                    │
│                               │  id ◄──────────────┘                    │
│                               │  nome              │                    │
│                               └─────────┬──────────┘                    │
│                                         │                               │
│                                         │ 1:N                           │
│                                         ▼                               │
│                               ┌────────────────────┐                    │
│                               │  entidades_legais  │                    │
│                               │                    │                    │
│                               │  - id              │                    │
│                               │  - tenant_id ──────┘ (FK)               │
│                               │  - cnpj            │                    │
│                               └─────────┬──────────┘                    │
│                                         │                               │
│                                         │ 1:N                           │
│                                         ▼                               │
│                               ┌────────────────────┐                    │
│                               │     unidades       │                    │
│                               │                    │                    │
│                               │  - id              │                    │
│                               │  - entidade_id ────┘ (FK)               │
│                               │  - nome            │                    │
│                               └─────────┬──────────┘                    │
│                                         │                               │
│                                         │ (referenced by)               │
│                                         ▼                               │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │                     DATA TABLES                                  │  │
│   │                                                                  │  │
│   │   alunos          matriculas       lancamentos_receitas          │  │
│   │   responsaveis    turmas           crm_negociacoes               │  │
│   │   ...             ...              ...                           │  │
│   │                                                                  │  │
│   │   ALL have unidade_id → RLS filters by tenant chain              │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```
```

### PHASE 5: AUDIT REQUIREMENTS

```markdown
## AUDIT TRAIL REQUIREMENTS

### What Gets Logged

| Action Category | Events | Table | Retention | WHY |
|-----------------|--------|-------|-----------|-----|
| Authentication | Login, Logout, Failed | auth_logs | 1 year | Security |
| Data Access | Sensitive reads | access_logs | 1 year | LGPD |
| Data Modification | All CUD | audit_trail | Permanent | Compliance |
| Financial | All operations | financial_audit | 5+ years | Fiscal |
| Configuration | Settings changes | config_history | Permanent | Accountability |

### LGPD Audit Requirements

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Right to access | Audit of who accessed data | ??? |
| Right to rectification | Log of changes | ??? |
| Right to erasure | Log of deletion requests | ??? |
| Consent tracking | Consent log table | ??? |
```

---

## OUTPUT FORMAT

### DATA_MODEL.md Structure

```markdown
# COSMUS - DATA MODEL

**Version:** 1.0
**Date:** 29/12/2024
**Author:** Claude (following PO DNA v5.3)

---

## 1. OVERVIEW
### 1.1 Database Technology
### 1.2 Schema Organization
### 1.3 Table Count Summary

## 2. ENTITY RELATIONSHIP DIAGRAM
[ASCII diagram]

## 3. TABLE INVENTORY
### 3.1 Core Tables
#### alunos
#### responsaveis
#### matriculas
#### turmas
[... for each table]

### 3.2 CRM Tables
#### crm_pessoas
#### crm_negociacoes
[...]

### 3.3 Financial Tables
[...]

### 3.4 Configuration Tables
[...]

## 4. KEY RELATIONSHIPS
### 4.1 aluno ↔ responsavel
### 4.2 matricula ↔ turma
### 4.3 D-07 VIEW
[...]

## 5. NAMING CONVENTIONS

## 6. INDEX STRATEGY

## 7. RLS CURRENT STATE

## 8. MIGRATION HISTORY

## 9. RECOMMENDATIONS
```

### PERMISSIONS.md Structure

```markdown
# COSMUS - PERMISSIONS ARCHITECTURE

**Version:** 1.0
**Date:** 29/12/2024
**Author:** Claude (following PO DNA v5.3)

---

## 1. ROLE HIERARCHY
[Diagram + descriptions]

## 2. PERMISSION MATRIX
[Tables per module]

## 3. RLS STRATEGY
### 3.1 Current State (Gap Analysis)
### 3.2 Required State
### 3.3 Implementation Plan

## 4. MULTI-TENANT ISOLATION
[Architecture diagram]

## 5. AUDIT TRAIL
### 5.1 Requirements
### 5.2 Implementation Status
### 5.3 LGPD Compliance

## 6. FUTURE: PORTAL ROLES
### 6.1 ALUNO Role
### 6.2 RESPONSAVEL Role

## 7. RECOMMENDATIONS
```

---

## FILES TO READ (Priority Order)

1. `supabase/migrations/*.sql` - ALL migrations
2. `docs/01_ARCHITECTURE/SYSTEM_OVERVIEW.md`
3. `src/types/database.ts` - Generated types
4. `docs/03_MODULES/*/MASTER.md` - For module-specific permissions

---

## DO NOT

❌ Modify any code
❌ Create migrations
❌ Work on files outside docs/01_ARCHITECTURE/
❌ Skip any table in the inventory
❌ Leave RLS gaps undocumented

---

## DELIVERABLE CHECKLIST

Before finishing, verify:
- [ ] ALL tables from migrations documented
- [ ] ERD diagram complete
- [ ] All relationships mapped
- [ ] D-07 VIEW documented
- [ ] Naming conventions documented
- [ ] Role hierarchy complete
- [ ] Permission matrix for all modules
- [ ] RLS current state audited
- [ ] RLS gaps identified
- [ ] Multi-tenant architecture documented
- [ ] Audit requirements documented
- [ ] Recommendations prioritized

---

## START NOW

Begin by reading ALL migration files in chronological order.
Extract every CREATE TABLE statement.
Build the table inventory systematically.

Remember: This is FOUNDATION documentation. Everything else depends on it.
```

---

## SYNCHRONIZATION NOTES

After all 4 tabs complete their work:

### Merge Order
1. **Tab 4 first** - Architecture docs are foundation
2. **Tab 3 second** - Financeiro gaps inform other modules
3. **Tab 2 third** - Portal research informs feature planning
4. **Tab 1 ongoing** - Active implementation continues

### Cross-References to Create
- Portal research should reference DATA_MODEL.md
- Financeiro review should identify architecture gaps
- CRM docs should reference Permissions for role restrictions
- All modules should reference the same role hierarchy

### Conflict Resolution
If any tab finds conflicting information:
1. STOP and document the conflict
2. Do NOT resolve independently
3. Wait for PO to decide the standard
4. Document the decision

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 29/12/2024 | Initial masterful prompts created |

---

*Created following PO DNA v5.3*
*100% Thoroughness - 0.01% incomplete is NOT acceptable*
*EXHAUSTIVE documentation for parallel work*
