# PROMPT 04: DEEP AUDIT

**Version:** 2.0
**Created:** 27/12/2024
**Updated:** 30/12/2024
**Optimized for:** Claude Opus 4.5
**Phase:** Documentation vs Reality Audit

---

## RULE ZERO: METHODOLOGY IS THE OPERATING SYSTEM (EMBEDDED)

```
┌─────────────────────────────────────────────────────────────────┐
│              THE 5 VITAL RULES - ACTIVE FOR THIS PHASE          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  V1: DOCUMENT AS YOU GO                                        │
│      Every finding → IMMEDIATE documentation                    │
│      No batching. No "I'll add this later."                    │
│                                                                 │
│  V2: 10X VERIFICATION                                          │
│      This phase requires 10 iterations before Phase 5          │
│      Each iteration MUST be documented as proof                │
│                                                                 │
│  V3: ONE THING AT A TIME                                       │
│      One component → audit → document → next component         │
│      Complete and document before moving on                     │
│                                                                 │
│  V4: EXHAUSTIVE THOROUGHNESS                                   │
│      No superficial audits                                      │
│      Every single behavior verified                             │
│                                                                 │
│  V5: UNIVERSAL APPLICATION                                     │
│      These rules apply to EVERY action in this phase           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

BEFORE EVERY ACTION IN THIS PHASE:
□ Am I doing ONE thing at a time?
□ Will I document this IMMEDIATELY (not after)?
□ Am I being exhaustive, not superficial?

Full Details: [RULE_ZERO.md](./RULE_ZERO.md) | [METHODOLOGY_COMPACT.md](./METHODOLOGY_COMPACT.md)
```

---

## Phase 4 Specific Rules:

| Rule | Application |
|------|-------------|
| **NO CODE CHANGES** | This phase is AUDIT ONLY. Do not modify any source code files. |
| **NO FIXES** | Document findings. Do NOT fix bugs or gaps yet. |
| **ADDITIVE ONLY** | Add findings to Master. NEVER delete or "clean up" content. |
| **Micro-reads** | Analyze ONE component at a time, document, then move to next. |
| **Chunk Size** | For large components (>300 lines), work in chunks of 100-200 lines. |
| **Precision Level** | MAXIMUM - Every single behavior must be verified. |
| **Speed** | NOT important. Take as long as needed for quality. |
| **Evidence Required** | Every finding must have verification evidence. |
| **TECHNICAL RATIONALE (Rule 13)** | Every finding MUST include WHY it matters. Explain technical impact and recommendation with reasoning. |
| **DOC UPDATES (Rule 14)** | Document EACH audit finding IMMEDIATELY as you discover it. No batching. |
| **10x VERIFICATION (Rule 10)** | Complete 10 iterations of this phase, each documented. |

### What CAN be modified:
- Documentation files (.md) - ADD findings only
- Master document - ADD audit findings section

### What CANNOT be modified:
- Components (.tsx, .jsx) - READ ONLY for comparison
- Services (.ts, .js) - READ ONLY for comparison
- Styles (.css)
- Migrations (.sql)
- Any source code

### Micro-Read Pattern:
```
READ component (small chunk)
COMPARE with documentation
DOCUMENT findings
UPDATE Master with findings
NEXT chunk
```
This prevents context loss and ensures maximum precision.

### CONGRUENCY AUDIT (Phase 4 Specific):

```
DURING AUDIT, MANDATORY CONGRUENCY CHECKS:

1. FOR EACH component audited:
   ├── Does it follow the pattern used elsewhere?
   ├── Compare with similar components in OTHER modules
   ├── Document ANY deviation from system standards

2. CONGRUENCY FINDINGS FORMAT:
   ├── [CONGRUENCY] - Aligned with system pattern
   ├── [INCONGRUENCY] - Deviates from system pattern
   ├── [PATTERN CONFLICT] - Multiple patterns exist

3. SPECIFIC CHECKS:
   ├── Filters: Same type as other modules?
   ├── Forms: Same validation patterns?
   ├── Modals: Same size, behavior, buttons?
   ├── Tables: Same column patterns, actions?
   ├── Toasts: Same style, duration, position?
   ├── Loading: Same spinners, skeletons?
   ├── Errors: Same display format?
```

**CONGRUENCY FINDING FORMAT:**

```
**[INCONGRUENCY] - Finding Title**
- Component: [path/to/component.tsx]
- Pattern in this module: [what it does]
- Pattern in other modules: [what they do]
- Modules compared: [list of modules checked]
- Impact: High | Medium | Low
- Recommendation: Align to [X] pattern

**[PATTERN CONFLICT] - Finding Title**
- Pattern Type: [filters/forms/modals/etc.]
- Module A does: [X]
- Module B does: [Y]
- Module C does: [Z]
- REQUIRES PO DECISION: Which is the standard?
```

**CRITICAL:**
> "I am not just auditing one module. I am auditing SYSTEM CONGRUENCY.
> Every component must be compared with its counterparts in OTHER modules.
> Inconsistency is a BUG, not a 'style choice'."

---

## WHEN TO USE

- After Planning & Architecture (Phase 03) is complete
- To validate documentation against actual code
- To ensure nothing was left behind
- Before final refinement phase

---

## PROMPT

```
# DEEP AUDIT - DOCUMENTATION VS REALITY

## IDENTIFICATION

| Field | Value |
|-------|-------|
| **Target Document** | ___________________________________ |
| **Module** | ___________________________________ |
| **Primary Focus** | ___________________________________ |
| **Raw Findings Section** | ___________________________________ |

---

## ROLE

Act as expert in:
- UX/UI Design
- Backend/Frontend Development
- Product Designer & Product Owner
- Project Manager
- Database & Migrations Expert
- SQL Specialist
- Senior Fullstack Developer

---

## OBJECTIVE

Perform exhaustive audit comparing documentation against actual system.
Identify ALL gaps, inconsistencies, bugs, and missing information.
DO NOT FIX - only document findings.

---

## METHODOLOGY

### Core Principle

READ component --> COMPARE with doc --> DOCUMENT findings --> NEXT component

Do micro-reads. Do NOT do general reads.
After each component, update the master document.
This prevents context loss.

### Audit Scope

For EACH section of the document:

1. **Read the section completely**
2. **Identify related components in code**
3. **Compare documented behavior vs actual behavior**
4. **Document findings** (do not alter existing content)
5. **STOP and wait for PO approval before next section**

---

## EXECUTION INSTRUCTIONS

### PHASE 1: Section-by-Section Audit

For each section in the target document:

1. **Read** - Understand what is documented
2. **Locate** - Find related code files
3. **Compare** - Does reality match documentation?
4. **Document** - Add findings to raw section

### PHASE 2: Code Component Sweep

For EACH component file:

1. **Functionality** - What does it actually do?
2. **Behavior** - How does it behave in edge cases?
3. **Integrations** - How does it connect to other modules?
4. **UI/UX** - Does the interface match specs?
5. **Bugs** - Any visible bugs or issues?

### PHASE 3: Cross-Module Verification

1. Check cascading behavior across entities
2. Verify data inheritance flows
3. Validate field connections
4. Test automation triggers

### PHASE 4: Folder Sweep

Individually analyze EACH related folder:

For folder in [related_folders]:
    Read all files
    Compare with master doc
    Document anything missing
    Move to next folder

---

## FINDING FORMAT

**[SECTION X.X] - Finding Title**
- Type: Gap | Bug | Future Improvement | Doc Addition | Inconsistency
- Location: file_path:line_number (if applicable)
- Description: What was found
- Evidence: How it was verified
- Impact: High | Medium | Low

---

## CATEGORIZATION (POST-AUDIT)

All findings go to the Raw Findings Section.
Categorization happens AFTER all sections are audited:

| Category | Definition | Example |
|----------|------------|---------|
| **Future Improvement** | Upgrade, evolution, new feature | "Add advanced filter" |
| **Gap/Bug/Fix** | Should work but doesn't | "Filter X doesn't filter" |
| **Doc Addition** | Relevant info not documented | "Field Y exists but not in doc" |
| **Inconsistency** | Doc says X, code does Y | "Doc says required, code allows null" |

---

## OUTPUT FORMAT

### 1. Audit Progress Tracker

| Section | Status | Findings Count | Notes |
|---------|--------|----------------|-------|
| 1.x | Audited | 3 | ... |
| 2.x | Pending | - | ... |

### 2. Raw Findings (append to master doc)

All findings in standard format, organized by section.

### 3. Component Coverage

| Component | File | Audited | Findings |
|-----------|------|---------|----------|
| ComponentA | path/to/file.tsx | Yes | 2 |
| ComponentB | path/to/file.tsx | No | - |

### 4. Folder Coverage

| Folder | Files | Audited | Status |
|--------|-------|---------|--------|
| /path/folder1 | 5 | 5/5 | Complete |
| /path/folder2 | 8 | 3/8 | In Progress |

---

## RULES

1. **NO FIXES** - Only document, do not change anything
2. **Micro-reads** - One component at a time, update doc, move on
3. **100% Coverage** - Leave nothing unaudited
4. **Evidence Required** - Always show how you verified
5. **Stop Between Sections** - Wait for PO approval

---

## QUALITY STANDARD

Reanalyze, look for gaps, issues, inconsistencies NONSTOP until you are
100% certain the audit is 100% complete to its minimum details without
a single thing left out.

Not even 0.01% can be left unchecked.

Every little issue, as insignificant as it may seem, must be documented.

---

## CHECKPOINT QUESTIONS

Before moving to next section, confirm:

- [ ] Read all related code for this section?
- [ ] Compared every documented behavior with reality?
- [ ] Documented all findings in standard format?
- [ ] No assumptions made - everything verified?
- [ ] Ready for PO approval to continue?

---

## PROCESS FLOW

SECTION 1 --> Audit --> Findings --> STOP --> PO Approval
SECTION 2 --> Audit --> Findings --> STOP --> PO Approval
...
SECTION N --> Audit --> Findings --> STOP --> PO Approval
FINAL    --> Consolidate Raw Findings --> Categorize Together
```

---

## EXAMPLE USAGE

### For Regua de Cobranca:

| Field | Value |
|-------|-------|
| **Target Document** | docs/FINANCAS_4.0/Regua-de-Cobranca-PM/03_Architecture/REGUA_COBRANCA_MASTER.md |
| **Module** | Regua de Cobranca |
| **Primary Focus** | Collection workflow, templates, integrations |
| **Raw Findings Section** | Section 19 (new) |

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 27/12/2024 | Initial version |
| 1.1 | 27/12/2024 | Added PO DNA Working Style section |
| 1.2 | 27/12/2024 | Added CONGRUENCY AUDIT section |
| 1.3 | 27/12/2024 | Added Rules 13 & 14 references (Mandatory Technical Rationale & Documentation Updates) |
| 2.0 | 30/12/2024 | RULE ZERO integration: Embedded 5 Vital Rules, added 10x requirement, fixed doc timing |
