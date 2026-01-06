# PROMPT 05: FINAL REFINEMENT

**Version:** 2.0
**Created:** 27/12/2024
**Updated:** 30/12/2024
**Optimized for:** Claude Opus 4.5
**Phase:** Consolidation & Gap Closure

---

## RULE ZERO: METHODOLOGY IS THE OPERATING SYSTEM (EMBEDDED)

```
┌─────────────────────────────────────────────────────────────────┐
│              THE 5 VITAL RULES - ACTIVE FOR THIS PHASE          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  V1: DOCUMENT AS YOU GO                                        │
│      Every resolution → IMMEDIATE documentation                 │
│      No batching. No "I'll add this later."                    │
│                                                                 │
│  V2: 10X VERIFICATION                                          │
│      This phase requires 10 iterations before Phase 6          │
│      Each iteration MUST be documented as proof                │
│                                                                 │
│  V3: ONE THING AT A TIME                                       │
│      One finding → resolve → document → next finding           │
│      Complete and document before moving on                     │
│                                                                 │
│  V4: EXHAUSTIVE THOROUGHNESS                                   │
│      No superficial resolutions                                 │
│      100% clarity required on every aspect                      │
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

## Phase 5 Specific Rules:

| Rule | Application |
|------|-------------|
| **NO CODE CHANGES** | This phase is STILL documentation only. Code comes in Phase 6. |
| **Two Sub-Phases** | EARLY: Still additive. END: Now allowed to refine/clean. |
| **One Finding at a Time** | Process ONE finding completely before moving to the next. |
| **Precision Level** | EXTREME - This is the last checkpoint before coding. |
| **Speed** | NOT important. Take as long as needed for 100% clarity. |
| **PO Decisions** | ALL remaining questions MUST be answered before Phase 6. |
| **TECHNICAL RATIONALE (Rule 13)** | Every resolution and PO question MUST include WHY. Present options with full technical context for informed decisions. |
| **DOC UPDATES (Rule 14)** | Document EACH resolution IMMEDIATELY as you make it. No batching. |
| **10x VERIFICATION (Rule 10)** | Complete 10 iterations of this phase, each documented. |

### Phase 5 Sub-Phases:

```
EARLY Phase 5 (Still ADDITIVE):
├── Categorize all findings
├── Analyze each gap/bug
├── Ask PO remaining questions
├── Document all solutions
└── Add approved decisions to Master

END of Phase 5 (NOW can REFINE):
├── Remove redundancies
├── Resolve contradictions
├── Consolidate duplicate sections
├── Clean ambiguous language
├── Create final implementation checklist
└── Master becomes DEFINITIVE
```

### Why This Timing:
> "First gather ALL puzzle pieces (Phases 1-4 + Early 5), THEN assemble (End of 5). 
> Now all pieces are collected. Now it's safe to organize and clean."

### What CAN be modified:
- Documentation files (.md)
- Master document - ADD and (at END) REFINE

### What CANNOT be modified:
- Components (.tsx, .jsx)
- Services (.ts, .js)
- Styles (.css)
- Migrations (.sql)
- Any source code

### CONGRUENCY RESOLUTION (Phase 5 Specific):

```
DURING REFINEMENT, RESOLVE ALL CONGRUENCY ISSUES:

1. REVIEW all [INCONGRUENCY] findings from Phase 4
2. REVIEW all [PATTERN CONFLICT] findings from Phase 4
3. For EACH issue:
   ├── Present options to PO
   ├── Get explicit decision on THE standard
   ├── Document the approved pattern
   ├── Update Master with pattern definition

4. CREATE "System Pattern Standards" section in Master:
   ├── Filters: [approved pattern]
   ├── Forms: [approved pattern]
   ├── Modals: [approved pattern]
   ├── Tables: [approved pattern]
   ├── etc.
```

**CONGRUENCY RESOLUTION FORMAT:**

```
## SYSTEM PATTERN STANDARDS (Add to Master)

### Resolved Pattern Decisions

| Pattern Type | Approved Standard | PO Decision Date | Notes |
|--------------|-------------------|------------------|-------|
| Advanced Filters | Dropdown multiselect | 27/12/2024 | All modules must align |
| Modals | 600px, centered, ESC close | 27/12/2024 | Standard for all |
| Form Validation | Inline errors below field | 27/12/2024 | Red text, icon left |

### Alignment Tasks for Execution

| Module | Component | Current | Required | Priority |
|--------|-----------|---------|----------|----------|
| Turmas | AdvancedFilter | Hidden fields | Dropdown | P0 |
| CRM | Modal size | 500px | 600px | P1 |
```

**CRITICAL:**
> "Phase 5 is where ALL pattern conflicts get RESOLVED.
> No congruency issue can enter Phase 6 unresolved.
> The Master document becomes the DEFINITIVE pattern guide."

---

## WHEN TO USE

- After Deep Audit (Phase 04) is complete
- When all raw findings have been collected
- Before execution phase begins
- To create the definitive implementation document

---

## PROMPT

```
# FINAL REFINEMENT - CONSOLIDATION & GAP CLOSURE

## IDENTIFICATION

| Field | Value |
|-------|-------|
| **Master Document** | ___________________________________ |
| **Module** | ___________________________________ |
| **Raw Findings Section** | ___________________________________ |
| **Audit Output** | ___________________________________ |

---

## ROLE

Act as expert in:
- UX/UI Design
- Backend/Frontend Architecture
- Product Designer & Product Owner
- Project Manager
- Database & Migrations Expert
- SQL Specialist
- Senior Fullstack Developer

---

## OBJECTIVE

Consolidate all audit findings into actionable items.
Categorize, prioritize, and resolve all gaps.
Create the DEFINITIVE implementation document.

---

## EXECUTION INSTRUCTIONS

### PHASE 1: Findings Categorization

Review ALL raw findings and categorize:

| Category | Action Required | Priority |
|----------|-----------------|----------|
| **Bug/Fix** | Must fix before implementation | P0 - Critical |
| **Gap** | Must implement - missing feature | P1 - High |
| **Inconsistency** | Must resolve - doc vs code | P1 - High |
| **Doc Addition** | Update documentation | P2 - Medium |
| **Future Improvement** | Backlog for later | P3 - Low |

### PHASE 2: Gap Resolution

For EACH Gap/Bug/Inconsistency:

1. **Analyze root cause**
2. **Define solution**
3. **Document fix approach**
4. **Estimate impact**
5. **Get PO approval if needed**

### PHASE 3: Questions Resolution

Review all pending questions from previous phases.
For any remaining unclear points:

1. **List the question**
2. **Explain technical context**
3. **Show impact of each option**
4. **Provide recommendation**
5. **ASK THE PO** - No assumptions allowed

IMPORTANT: You must have absolutely 100% clarity on how to proceed.
If you don't have it, ASK ME.
Read and reread documentation as many times as necessary.
No problem going back. Take all necessary time.

### PHASE 4: Document Consolidation

Update the master document with:

1. **Resolved inconsistencies**
2. **Approved decisions**
3. **Final specifications**
4. **Implementation checklist**

### PHASE 5: Pre-Execution Checklist

Create definitive checklist for execution:

PRE-EXECUTION CHECKLIST

[ ] All bugs documented with fix approach
[ ] All gaps have defined solutions
[ ] All inconsistencies resolved
[ ] All PO decisions documented
[ ] All questions answered
[ ] Implementation blocks are atomic
[ ] Dependencies mapped
[ ] No ambiguity remains
[ ] Ready for execution

---

## OUTPUT FORMAT

### 1. Categorized Findings Summary

| # | Finding | Category | Priority | Resolution | Status |
|---|---------|----------|----------|------------|--------|
| F-01 | ... | Bug | P0 | ... | Resolved |
| F-02 | ... | Gap | P1 | ... | Pending PO |

### 2. Resolved Items

For each resolved item:

**[F-XX] Finding Title**
- Original Issue: ...
- Root Cause: ...
- Solution: ...
- Implementation: file_path - what to change
- Status: RESOLVED

### 3. Pending PO Decisions

| # | Question | Options | Impact | Recommendation |
|---|----------|---------|--------|----------------|
| Q-01 | ...? | A, B, C | ... | Option B |

### 4. Final Implementation Checklist

Atomic blocks ready for execution:

| Block | Description | Dependencies | Files | Status |
|-------|-------------|--------------|-------|--------|
| B-01 | ... | None | file1.tsx, file2.ts | Ready |
| B-02 | ... | B-01 | file3.tsx | Ready |

### 5. Future Improvements Backlog

Items for later consideration (not blocking execution):

| # | Improvement | Rationale | Priority |
|---|-------------|-----------|----------|
| FI-01 | ... | ... | P3 |

---

## QUALITY GATES

Before proceeding to Execution (Phase 06):

### Gate 1: Zero Ambiguity
- [ ] Every specification is crystal clear
- [ ] No "maybe" or "probably" in the doc
- [ ] All edge cases addressed

### Gate 2: Zero Pending Questions
- [ ] All questions answered by PO
- [ ] No assumptions made
- [ ] All decisions documented

### Gate 3: Zero Blocking Issues
- [ ] All P0 bugs have fix approach
- [ ] All P1 gaps have solutions
- [ ] All inconsistencies resolved

### Gate 4: Implementation Ready
- [ ] Blocks are atomic and ordered
- [ ] Dependencies are clear
- [ ] Files to modify are identified

---

## RULES

1. **100% Clarity** - No execution without complete clarity
2. **No Assumptions** - When in doubt, ASK
3. **Document Everything** - Every decision, every resolution
4. **PO Approval** - Critical decisions need explicit approval
5. **Quality Over Speed** - Take time to do it right

---

## IMPORTANT

If you have ANY doubt, no matter how small, you must have
absolutely 100% clarity on how to proceed.

If you don't have it, ASK ME.

Read and reread documentation as many times as necessary
when you have doubt or lost context.

No problem going back. Take all necessary time.

I'm here to help you too.

---

## FINAL CONFIRMATION

Before moving to Execution:

CONFIRMATION CHECKLIST

[ ] I have read all documentation multiple times
[ ] I have 100% clarity on every aspect
[ ] I have no remaining questions
[ ] All findings are categorized and resolved
[ ] The master document is complete and accurate
[ ] Implementation blocks are ready
[ ] I am confident to proceed to execution

If ANY checkbox is unchecked, DO NOT PROCEED.
Ask the PO for clarification first.
```

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 27/12/2024 | Initial version |
| 1.1 | 27/12/2024 | Added PO DNA Working Style section with sub-phases |
| 1.2 | 27/12/2024 | Added CONGRUENCY RESOLUTION section |
| 1.3 | 27/12/2024 | Added Rules 13 & 14 references (Mandatory Technical Rationale & Documentation Updates) |
| 2.0 | 30/12/2024 | RULE ZERO integration: Embedded 5 Vital Rules, added 10x requirement, fixed doc timing |
