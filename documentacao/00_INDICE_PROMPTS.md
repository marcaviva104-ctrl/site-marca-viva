# PROMPTS MASTER - INDEX

**Version:** 1.9
**Created:** 27/12/2024
**Updated:** 27/12/2024
**Optimized for:** Claude Opus 4.5
**Language:** English (optimized for AI performance)

---

## OVERVIEW

This directory contains optimized prompts for each phase of the development cycle.
Each prompt is independent and reusable for any system module.

> **CRITICAL:** Before using ANY prompt, read and internalize:
> [00_PO_DNA_WORKING_STYLE.md](./00_PO_DNA_WORKING_STYLE.md)
> This document defines the PO's working principles that apply to ALL phases.
> **Now includes 17 Golden Rules (v5.2).**

> **ABSOLUTE REQUIREMENT - SYSTEM CONGRUENCY:**
> Every change, no matter how small, must maintain 100% UI/UX consistency
> across the entire SaaS. 0% tolerance for pattern deviations.
> See Rule 11 in PO DNA for complete protocol.

---

## DEVELOPMENT PIPELINE

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           PROMPT PIPELINE                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   [01] INFORMATION       [02] CONSOLIDATION     [03] PLANNING &              │
│        GATHERING    -->      FROM SOURCES  -->      ARCHITECTURE             │
│                                                                               │
│        Collect all           Merge research         Design structure          │
│        information           into Master            and architecture          │
│                                                                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   [04] DEEP              [05] FINAL              [06] EXECUTION              │
│        AUDIT        -->      REFINEMENT     -->                              │
│                                                                               │
│        Compare doc           Consolidate            Implement with            │
│        vs reality            and close gaps         maximum quality           │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## FILES

| # | File | Phase | When to Use | Key Focus |
|---|------|-------|-------------|-----------|
| 00 | [00_PO_DNA_WORKING_STYLE.md](./00_PO_DNA_WORKING_STYLE.md) | **ALL PHASES** | **ALWAYS READ FIRST** | **17 Golden Rules, conversational dialogue, autonomous additive work** |
| 01 | [01_INFORMATION_GATHERING.md](./01_INFORMATION_GATHERING.md) | Collection | Start of any new module | Map files, status, dependencies |
| 02 | [02_CONSOLIDATION_FROM_SOURCES.md](./02_CONSOLIDATION_FROM_SOURCES.md) | Consolidation | Merge research into Master | Extract from source folders, add to Master |
| 03 | [03_PLANNING_ARCHITECTURE.md](./03_PLANNING_ARCHITECTURE.md) | Planning | After consolidation | Design DB, UI/UX, architecture |
| 04 | [04_DEEP_AUDIT.md](./04_DEEP_AUDIT.md) | Audit | Validate doc vs code | Find gaps, bugs, inconsistencies |
| 05 | [05_FINAL_REFINEMENT.md](./05_FINAL_REFINEMENT.md) | Refinement | Before execution | Resolve all issues, close gaps |
| 06 | [06_EXECUTION.md](./06_EXECUTION.md) | Execution | Final implementation | Code with extreme precision |
| 07 | [07_TASK_MASTER_PLAN_TEMPLATE.md](./07_TASK_MASTER_PLAN_TEMPLATE.md) | **PRE-PHASE** | **Before ANY task** | **360° Analysis, 12 dimensions, single source of truth** |

---

## HOW TO USE

### Step 0: Read PO DNA (MANDATORY)
Read and internalize [00_PO_DNA_WORKING_STYLE.md](./00_PO_DNA_WORKING_STYLE.md).
This applies to ALL phases and contains the 17 Golden Rules.

### Step 1: Identify the Phase
Determine which phase of development you're in.

### Step 2: Copy the Prompt
Open the corresponding file and copy the prompt block.

### Step 3: Fill in the Fields
Replace `_______________` placeholders with your module information.

### Step 4: Execute with 10x Pattern
Execute the phase following the 10x repetition pattern from PO DNA.

### Step 5: Validate and Advance
Validate results before advancing to the next phase.

---

## PHASE DEPENDENCIES

```
Phase 01 ──┬── Required before Phase 02
           │
Phase 02 ──┼── Required before Phase 03
           │
Phase 03 ──┼── Required before Phase 04
           │
Phase 04 ──┼── Required before Phase 05
           │
Phase 05 ──┼── Required before Phase 06
           │
Phase 06 ──┴── Final implementation
```

**IMPORTANT:** Do NOT skip phases. Each phase builds on the previous one.

---

## PROMPT PRINCIPLES

1. **Universal** - Work for any module, any task size
2. **Incremental** - Each phase builds on previous
3. **Validatable** - Clear checkpoints between phases
4. **Detailed** - Leave no gaps or ambiguities
5. **Autonomous** - Claude can execute with minimal intervention
6. **Quality-focused** - 100% completion, 0% gaps
7. **CONGRUENT** - 100% system-wide UI/UX consistency, 0% deviation

---

## QUALITY STANDARD (ALL PHASES)

```
Reanalyze, look for gaps, issues, inconsistencies NONSTOP until you are
100% certain the work is 100% complete to its minimum details without
a single thing left out.

Not even 0.01% can be left incomplete.

Every little issue, as insignificant as it may seem, must be addressed.
```

---

## ROLE SPECIFICATION (ALL PHASES)

Claude should act as expert in:
- UX/UI Design
- Backend/Frontend Development
- Product Designer & Product Owner
- Project Manager
- Database & Migrations Expert
- SQL Specialist
- Senior Fullstack Developer

---

## IMPORTANT REMINDERS

1. **System is Connected** - All modules send/receive data between each other
2. **360° Evaluation** - Always consider impact on entire system
3. **No Assumptions** - When in doubt, ASK
4. **Document Everything** - Maintain execution logs
5. **Review Constantly** - Reread documentation as needed

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 27/12/2024 | Initial creation - 5 prompts (01-05) |
| 1.1 | 27/12/2024 | Added 6th prompt (Consolidation from Sources) |
| 1.2 | 27/12/2024 | Reorganized: Consolidation became 02, others shifted (now 01-06) |
| 1.3 | 27/12/2024 | Added PO DNA (00) with 10 Golden Rules, updated all prompts |
| 1.4 | 27/12/2024 | Added Rules 11-12 (Congruency, Universal Process), updated all prompts |
| 1.5 | 27/12/2024 | Standardized: English filenames, 12 Golden Rules confirmed |
| 1.6 | 27/12/2024 | PO DNA v3.1: Added Phase Failure Protocol, Version History |
| 1.7 | 27/12/2024 | PO DNA v5.0: Added Rules 13 (Mandatory Technical Rationale) & 14 (Mandatory Documentation Updates) - Now 15 Golden Rules |
| 1.8 | 27/12/2024 | PO DNA v5.1: Added Rule 2.1 (Autonomous Additive Work) - Agent works autonomously for research & adding info - Now 16 Golden Rules |
| 1.9 | 27/12/2024 | PO DNA v5.2: Added Rule 8.1 (Conversational Technical Dialogue) - Be a senior partner, challenge, share examples - Now 17 Golden Rules |
| 2.0 | 29/12/2024 | Added 07_TASK_MASTER_PLAN_TEMPLATE.md - 360° Analysis Framework with 12 mandatory dimensions (Database, Backend, Frontend, TypeScript, UX/UI, Integration, Compliance, Documentation, Testing, Security, Performance, Rollback, Observability) |
