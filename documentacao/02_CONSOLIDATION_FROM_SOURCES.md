# PROMPT 02: CONSOLIDATION FROM SOURCES

**Version:** 2.0
**Created:** 27/12/2024
**Updated:** 30/12/2024
**Optimized for:** Claude Opus 4.5
**Phase:** Source Consolidation into Master Document

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
│      This phase requires 10 iterations before Phase 3          │
│      Each iteration MUST be documented as proof                │
│                                                                 │
│  V3: ONE THING AT A TIME                                       │
│      One source file → consolidate → document → next file      │
│      Complete and document before moving on                     │
│                                                                 │
│  V4: EXHAUSTIVE THOROUGHNESS                                   │
│      No superficial consolidation                               │
│      Every detail from every source matters                     │
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

## Phase 2 Specific Rules:

| Rule | Application |
|------|-------------|
| **NO CODE CHANGES** | This phase is DOCUMENTATION ONLY. Do not modify any source code files. |
| **ADDITIVE ONLY** | Add information to Master. NEVER delete or "clean up" existing content. |
| **One File at a Time** | Process ONE source file completely before moving to the next. |
| **Chunk Size** | For large files (>500 lines), work in chunks of 300-500 lines max. |
| **Precision Level** | MAXIMUM - Every detail matters. Extract everything relevant. |
| **Speed** | NOT important. Take as long as needed for quality. |
| **Master Protection** | Do NOT restructure or refine the Master yet. Just ADD content. |
| **TECHNICAL RATIONALE (Rule 13)** | Every recommendation AND question MUST include WHY. |
| **DOC UPDATES (Rule 14)** | Document EACH finding IMMEDIATELY as you consolidate. No batching. |
| **10x VERIFICATION (Rule 10)** | Complete 10 iterations of this phase, each documented. |

### What CAN be modified:
- Documentation files (.md) - ADDITIVE changes only
- Master document - ADD new sections/content only

### What CANNOT be modified:
- Components (.tsx, .jsx)
- Services (.ts, .js)
- Styles (.css)
- Migrations (.sql)
- Any source code
- Existing content in Master (do not delete/alter)

### Why ADDITIVE ONLY:
> "First gather ALL puzzle pieces, THEN assemble. If you start assembling too early, pieces will be missing."

Early "cleaning" loses vital information. Refinement comes ONLY at the end of Phase 5.

### CONGRUENCY CHECK (Phase 2 Specific):

```
DURING CONSOLIDATION, ALWAYS:

1. CONSOLIDATE pattern information:
   ├── How is this component type done elsewhere?
   ├── What's the established standard?
   ├── Are sources describing the same pattern differently?

2. FLAG pattern conflicts:
   ├── "Source A says filters work like X"
   ├── "Source B says filters work like Y"
   ├── "Existing code does Z"
   ├── → FLAG FOR PO DECISION

3. ADD to Master document:
   ├── "Pattern Standards" section
   ├── List all UI/UX patterns identified
   ├── Note any inconsistencies for resolution
```

**CONGRUENCY OUTPUT:**

```markdown
## PATTERN ANALYSIS (Add to Master)

### Identified Patterns:
| Pattern Type | Standard | Source | Notes |
|--------------|----------|--------|-------|
| Filters | Dropdown multiselect | financeiro/ | Used in 3 modules |
| Modals | 600px, center, ESC close | alunos/ | Consistent |

### Pattern Conflicts:
| Pattern | Module A | Module B | Needs PO Decision |
|---------|----------|----------|-------------------|
| Advanced Filter | Dropdown | Hidden fields | YES |
```

---

## WHEN TO USE

- When you have multiple research/planning documents scattered across folders
- When you need to consolidate initial research into a master document
- When merging findings from different sources into one definitive doc
- Before implementation, to ensure nothing from research phase is lost

---

## PROMPT

```
# CONSOLIDATION FROM SOURCES - MERGE INTO MASTER

## IDENTIFICATION

| Field | Value |
|-------|-------|
| **Master Document** | ___________________________________ |
| **Source Folder(s)** | ___________________________________ |
| **Module/Feature** | ___________________________________ |

---

## OBJECTIVE

Perform deep analysis of ALL source documents in the specified folder(s).
Extract ALL relevant information not yet present in the Master Document.
ADD findings to the Master Document (do not alter existing content).

---

## ROLE

Act as expert in:
- Information Architecture
- Technical Documentation
- Product Management
- UX/UI Design
- Backend/Frontend Development
- Database & SQL

---

## EXECUTION METHODOLOGY

### Core Principle

FOR each file in Source_Folder:
    READ file completely
    COMPARE with Master Document
    IDENTIFY information not in Master
    ADD relevant findings to Master
    MOVE to next file

### Phase 1: Source Inventory

1. List ALL files in the source folder(s)
2. Categorize by type:
   - Planning docs
   - Technical specs
   - Decision records
   - Meeting notes
   - Research findings
   - SQL/Migrations
   - UI mockups/specs

### Phase 2: File-by-File Analysis

For EACH source file:

1. **Read completely** - Understand full context
2. **Extract key information:**
   - Decisions made
   - Technical specifications
   - Business rules
   - UI/UX requirements
   - SQL schemas
   - Integration points
   - Open questions
   - Pending items

3. **Compare with Master:**
   - Is this info already in Master?
   - Is it more detailed than Master?
   - Does it contradict Master?
   - Is it new information?

4. **Document findings:**
   - What to ADD to Master
   - Which section it belongs to
   - Any conflicts to resolve

### Phase 3: Master Document Update

For each finding:

1. **Identify target section** in Master
2. **Add information** without altering existing content
3. **Mark source** for traceability
4. **Flag conflicts** if any exist

---

## FINDING FORMAT

**[SOURCE: filename.md] - Finding Title**
- Target Section: Section X.X in Master
- Type: New Info | More Detail | Conflict | Missing in Master
- Content to Add:
  [The actual content to be added]
- Notes: [Any relevant context]

---

## CONFLICT HANDLING

When source contradicts Master:

| Scenario | Action |
|----------|--------|
| Source is newer/updated | Flag for PO decision |
| Source is older/superseded | Note but don't add |
| Both valid (different aspects) | Add both with context |
| Unclear which is correct | Flag for PO decision |

---

## OUTPUT FORMAT

### 1. Source Inventory

| # | File | Type | Status | Findings |
|---|------|------|--------|----------|
| 1 | file1.md | Planning | Analyzed | 5 items |
| 2 | file2.md | Technical | Pending | - |

### 2. Findings by Source

#### From: filename.md
- Finding 1: [description] → Add to Section X
- Finding 2: [description] → Add to Section Y

### 3. Conflicts Requiring PO Decision

| # | Conflict | Source Says | Master Says | Recommendation |
|---|----------|-------------|-------------|----------------|
| 1 | ... | ... | ... | ... |

### 4. Summary of Additions

| Section | Items Added | Source(s) |
|---------|-------------|-----------|
| Section 5 | 3 | file1.md, file3.md |
| Section 8 | 2 | file2.md |

---

## RULES

1. **DO NOT DELETE** - Only add, never remove from Master
2. **DO NOT ALTER** - Existing content stays as-is
3. **TRACE SOURCES** - Always note where info came from
4. **FLAG CONFLICTS** - Don't resolve conflicts unilaterally
5. **BE EXHAUSTIVE** - Leave no source file unanalyzed
6. **STOP BETWEEN FILES** - Allow PO to validate before continuing

---

## QUALITY STANDARD

Analyze each source file COMPLETELY.
Extract EVERY piece of relevant information.
Leave NOTHING behind that could be useful.
Not even 0.01% of relevant information can be missed.

---

## PROCESS FLOW

FILE 1 --> Analyze --> Extract --> Add to Master --> STOP --> PO OK?
FILE 2 --> Analyze --> Extract --> Add to Master --> STOP --> PO OK?
...
FILE N --> Analyze --> Extract --> Add to Master --> STOP --> PO OK?
FINAL  --> Summary of all additions --> Conflicts for PO decision

---

## CHECKPOINT QUESTIONS

Before moving to next file:

- [ ] Read source file completely?
- [ ] Extracted all relevant information?
- [ ] Compared everything with Master?
- [ ] Added findings to Master?
- [ ] Flagged any conflicts?
- [ ] Ready for PO approval to continue?
```

---

## EXAMPLE USAGE

### For Regua de Cobranca:

| Field | Value |
|-------|-------|
| **Master Document** | docs/FINANCAS_4.0/Regua-de-Cobranca-PM/03_Architecture/REGUA_COBRANCA_MASTER.md |
| **Source Folder(s)** | docs/FINANCAS_4.0/Regua-de-Cobranca-PM/01_Research/ |
| **Module/Feature** | Regua de Cobranca (Collection Rules) |

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 27/12/2024 | Initial version |
| 1.1 | 27/12/2024 | Added PO DNA Working Style section |
| 1.2 | 27/12/2024 | Added CONGRUENCY CHECK section |
| 1.3 | 27/12/2024 | Added Rules 13 & 14 references (Mandatory Technical Rationale & Documentation Updates) |
