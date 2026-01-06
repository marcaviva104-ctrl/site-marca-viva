# TASK MASTER PLAN TEMPLATE

**Version:** 1.0
**Created:** 29/12/2024
**Updated:** 29/12/2024
**Optimized for:** Claude Opus 4.5
**Purpose:** Template for creating comprehensive task plans before any work begins

---

## PURPOSE

This template ensures that **EVERY task**, regardless of size, has:
1. A documented plan before execution
2. Full 360° analysis across all system dimensions
3. Clear scope, decisions, and success criteria
4. A single source of truth throughout all 6 phases

---

## WHEN TO USE

**ALWAYS** - Before starting ANY task that involves:
- Bug fixes
- Feature implementation
- Refactoring
- Documentation updates
- Database changes
- Any code modifications

**WHY:** Even "simple" tasks can have hidden complexity. The TASK MASTER PLAN reveals that complexity BEFORE we start coding.

---

## THE 360° ANALYSIS FRAMEWORK

Every task must be analyzed across **12 mandatory dimensions**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    360° ANALYSIS CHECKLIST                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  DATABASE                                                           │
│  [ ] Schema analysis (tables, columns, types, defaults)            │
│  [ ] Relationships (FKs, constraints, cascades)                    │
│  [ ] RLS policies (Row Level Security rules)                       │
│  [ ] Indexes (existing, needed for performance)                    │
│  [ ] Migrations needed (new tables, columns, alterations)          │
│  [ ] Data integrity (existing data state, orphaned records)        │
│  [ ] Triggers (existing, needed)                                   │
│                                                                     │
│  BACKEND                                                            │
│  [ ] Supabase queries (select, insert, update, delete)             │
│  [ ] RPCs/Functions (existing, needed)                             │
│  [ ] Business logic (rules, validations)                           │
│  [ ] Validation rules (server-side)                                │
│  [ ] Error handling (try/catch, error messages)                    │
│  [ ] Edge cases (nulls, empty, duplicates)                         │
│  [ ] Transaction handling (atomic operations)                      │
│                                                                     │
│  FRONTEND                                                           │
│  [ ] Components structure (hierarchy, dependencies)                │
│  [ ] State management (useState, useEffect, custom hooks)          │
│  [ ] React Hook Form integration (forms, validation)               │
│  [ ] Zod validation schemas (client-side validation)               │
│  [ ] Loading states (spinners, skeletons)                          │
│  [ ] Error states (display, retry options)                         │
│  [ ] Success states (toasts, redirects)                            │
│  [ ] Data flow (props, context, queries)                           │
│                                                                     │
│  TYPESCRIPT                                                         │
│  [ ] Type definitions (interfaces, types)                          │
│  [ ] Interface alignment with DB schema                            │
│  [ ] Type safety (no `any`, proper typing)                         │
│  [ ] Generated types sync (supabase gen types)                     │
│  [ ] Zod schema alignment with TS types                            │
│                                                                     │
│  UX/UI                                                              │
│  [ ] User flow (step-by-step journey)                              │
│  [ ] Visual feedback (colors, icons, animations)                   │
│  [ ] Error messages (clear, actionable)                            │
│  [ ] Success feedback (toasts, confirmations)                      │
│  [ ] Accessibility (ARIA, keyboard nav, contrast)                  │
│  [ ] Consistency with system patterns (Rule 11)                    │
│  [ ] Responsive behavior (mobile, tablet, desktop)                 │
│                                                                     │
│  INTEGRATION                                                        │
│  [ ] Module connections (which modules use this?)                  │
│  [ ] Data inheritance (what flows from this?)                      │
│  [ ] Cascading effects (what breaks if this changes?)              │
│  [ ] Downstream consumers (who reads this data?)                   │
│  [ ] Upstream dependencies (what must exist first?)                │
│  [ ] Cross-module consistency                                      │
│  [ ] CRM → SGE boundary (CRM pessoa ≠ SGE aluno until MATRÍCULA)   │
│                                                                     │
│  COMPLIANCE                                                         │
│  [ ] LGPD implications (personal data handling)                    │
│  [ ] MEC requirements (if educational records)                     │
│  [ ] Audit trail (logging, history)                                │
│  [ ] Data retention (how long kept, why)                           │
│  [ ] Consent tracking (if applicable)                              │
│                                                                     │
│  DOCUMENTATION                                                      │
│  [ ] Module MASTER docs (update needed?)                           │
│  [ ] Code comments (WHY, not just WHAT)                            │
│  [ ] Changelog (record the change)                                 │
│  [ ] Decision records (WHY this approach)                          │
│  [ ] Migration docs (if schema changes)                            │
│                                                                     │
│  TESTING & VERIFICATION                                             │
│  [ ] Test scenarios (happy path)                                   │
│  [ ] Edge case tests (boundaries, nulls)                           │
│  [ ] Regression tests (existing functionality)                     │
│  [ ] Integration tests (cross-module)                              │
│  [ ] Performance tests (if applicable)                             │
│                                                                     │
│  SECURITY (Multi-tenant SaaS Critical)                              │
│  [ ] Authentication checks (is user logged in?)                    │
│  [ ] Authorization checks (can user do this action?)               │
│  [ ] Input sanitization (SQL injection, XSS prevention)            │
│  [ ] Data exposure (are we returning more than needed?)            │
│  [ ] Sensitive data handling (CPF, emails - masked in logs?)       │
│  [ ] Cross-tenant isolation (RLS enforcement)                      │
│                                                                     │
│  PERFORMANCE (Scale to thousands of schools)                        │
│  [ ] Query efficiency (N+1 problems, unnecessary joins?)           │
│  [ ] Index usage (are we hitting indexes?)                         │
│  [ ] Payload size (are we fetching too much data?)                 │
│  [ ] Render optimization (unnecessary re-renders?)                 │
│  [ ] Bundle impact (new dependencies = larger bundle?)             │
│  [ ] Database load (will this scale?)                              │
│                                                                     │
│  ROLLBACK STRATEGY (Risk Mitigation)                                │
│  [ ] Can this change be undone?                                    │
│  [ ] Database migration reversibility                              │
│  [ ] Feature flag possibility                                      │
│  [ ] Data backup before migration                                  │
│  [ ] Recovery procedure if it fails                                │
│                                                                     │
│  OBSERVABILITY (Verify fix in production)                           │
│  [ ] Console logging (development)                                 │
│  [ ] Error tracking (production)                                   │
│  [ ] Audit logs (who did what, when)                               │
│  [ ] Metrics (can we measure success?)                             │
│  [ ] Debugging breadcrumbs (for support team)                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## CORE PRINCIPLES

### TIME PHILOSOPHY

> **"TIME IS NEVER A PROBLEM. You have ALL THE TIME IN THE WORLD."**
>
> - Speed is NOT important
> - Quality and accuracy are EVERYTHING
> - Take as long as needed
> - Re-read as many times as necessary
> - Stop and ask when unclear
> - Never rush, never assume, never skip

### THOROUGHNESS STANDARD

> **"Not even 0.01% can be left incomplete"**
>
> Every:
> - File must be read completely
> - Field must be documented
> - Edge case must be considered
> - Integration must be verified
> - Decision must have a WHY
> - Change must be documented

---

## TEMPLATE STRUCTURE

```markdown
# TASK MASTER PLAN: [Task Title]

**Created:** [Date]
**Task ID:** [ID]
**Status:** Phase [X] - [Phase Name]
**Priority:** [P0/P1/P2/P3]

---

## 1. TASK IDENTIFICATION

| Field | Value |
|-------|-------|
| **Task ID** | ___ |
| **Task Title** | ___ |
| **Module** | ___ |
| **Affected Flow** | ___ |
| **Blocking?** | YES/NO |

---

## 2. PROBLEM STATEMENT

### What Should Happen
[Describe expected behavior]

### What Actually Happens
[Describe current/buggy behavior]

### Business Impact
[Describe impact on users/business]

---

## 3. INITIAL ANALYSIS (Pre-Phase 01)

### 3.1 Root Cause Hypothesis
[Initial thoughts on cause]

### 3.2 Files Suspected
[List files likely involved]

### 3.3 Dependencies Identified
[Other modules/features affected]

---

## 4. PO INPUTS & DECISIONS

### 4.1 Decisions Made
| Input | PO Response | Date |
|-------|-------------|------|
| ... | ... | ... |

### 4.2 Pending PO Decisions
| # | Decision Needed | Options | Impact | Status |
|---|-----------------|---------|--------|--------|
| D-01 | ... | A, B, C | ... | PENDING |

---

## 5. METHODOLOGY TO FOLLOW

### 5.1 The 6-Phase Pipeline
[Reference to standard phases]

### 5.2 Key Rules Applied
[Which rules are most relevant to this task]

### 5.3 Quality Target
[Specific quality criteria for this task]

---

## 6. 360° ANALYSIS FRAMEWORK

[Copy the full checklist and check off as you analyze each dimension]

---

## 7. PHASE 01: INFORMATION GATHERING

### 7.1 Entry Questions
| # | Question | Technical Context | Impact | Status |
|---|----------|-------------------|--------|--------|
| EQ-01 | ... | ... | ... | PENDING |

### 7.2 File Mapping
[Tree structure of all related files]

### 7.3 Documentation Analysis
[List of docs to review]

### 7.4 Exit Questions
| # | Question | Purpose |
|---|----------|---------|
| XQ-01 | ... | ... |

---

## 8. FINDINGS LOG (Updated Per Phase)

| # | Finding | Location | Type | Impact | Status |
|---|---------|----------|------|--------|--------|
| F-001 | ... | ... | ... | ... | ... |

---

## 9. CONGRUENCY REQUIREMENTS

### 9.1 Patterns to Match
[Existing patterns this must align with]

### 9.2 Congruency Checklist
[Specific items to verify alignment]

---

## 10. RISK ASSESSMENT

| Risk | Severity | Mitigation |
|------|----------|------------|
| ... | HIGH/MEDIUM/LOW | ... |

---

## 11. SUCCESS CRITERIA

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Documentation updated
- [ ] All phases completed with PO approval

---

## 12. VERSION HISTORY

| Version | Date | Phase | Change |
|---------|------|-------|--------|
| 1.0 | ... | ... | Initial plan |

---

## 13. REFERENCES

### Related Documents
- [Link 1]
- [Link 2]

### Code References
- `path/to/file.tsx` - Description
```

---

## HOW TO USE

### Step 1: Create the Plan
1. Copy this template
2. Fill in Task Identification (Section 1-2)
3. Document Initial Analysis (Section 3)
4. Record any PO decisions (Section 4)

### Step 2: Phase 01 - Information Gathering
1. Ask Entry Questions
2. Map all related files
3. Analyze documentation
4. Log findings as you go
5. Ask Exit Questions

### Step 3: Phases 02-05
1. Follow the standard phase prompts
2. Update the TASK MASTER PLAN after each phase
3. Log all findings
4. Get PO approval before moving to next phase

### Step 4: Phase 06 - Execution
1. Only after all previous phases complete
2. Reference the plan constantly
3. Log all changes in execution log
4. Update plan with results

---

## KEY BENEFITS

1. **No Hidden Complexity** - The 360° analysis reveals issues BEFORE coding
2. **Single Source of Truth** - One document throughout all phases
3. **PO Alignment** - All decisions documented and approved
4. **Rollback Safety** - Plan includes recovery strategy
5. **Quality Assurance** - Checklist ensures nothing missed
6. **Knowledge Preservation** - Future developers can understand WHY

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 29/12/2024 | Initial template created based on P0-1 bug fix experience |

---

*This template follows PO DNA v5.2 - Quality over speed, document the WHY, EXHAUSTIVE detail*
*"Not even 0.01% can be left incomplete"*
