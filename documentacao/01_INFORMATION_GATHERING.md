# PROMPT 01: INFORMATION GATHERING

**Version:** 2.0
**Created:** 27/12/2024
**Updated:** 30/12/2024
**Optimized for:** Claude Opus 4.5
**Phase:** Information Collection

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
│      This phase requires 10 iterations before Phase 2          │
│      Each iteration MUST be documented as proof                │
│                                                                 │
│  V3: ONE THING AT A TIME                                       │
│      One file → document → next file                           │
│      Complete and document before moving on                     │
│                                                                 │
│  V4: EXHAUSTIVE THOROUGHNESS                                   │
│      No superficial answers                                     │
│      Specific, detailed, verified                               │
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

## Phase 1 Specific Rules:

| Rule | Application |
|------|-------------|
| **NO CODE CHANGES** | This phase is DOCUMENTATION ONLY. Do not modify any source code files. |
| **One Thing at a Time** | Analyze ONE file/section at a time. Never process everything at once. |
| **Chunk Size** | For large files (>500 lines), work in chunks of 300-500 lines max. |
| **Precision Level** | HIGH - Build a solid foundation with accurate information. |
| **Speed** | NOT important. Take as long as needed for quality. |
| **Stopping** | ENCOURAGED. Stop to ask questions, verify, or reread docs. |
| **TECHNICAL RATIONALE (Rule 13)** | Every recommendation AND question MUST include WHY. |
| **DOC UPDATES (Rule 14)** | Document EACH finding IMMEDIATELY as you discover it. No batching. |
| **10x VERIFICATION (Rule 10)** | Complete 10 iterations of this phase, each documented. |

### What CAN be modified:
- Documentation files (.md)
- Analysis reports

### What CANNOT be modified:
- Components (.tsx, .jsx)
- Services (.ts, .js)
- Styles (.css)
- Migrations (.sql)
- Any source code

### CONGRUENCY CHECK (Phase 1 Specific):

```
DURING INFORMATION GATHERING, ALWAYS:

1. IDENTIFY existing patterns in the system:
   ├── How do filters work in other modules?
   ├── How do forms behave elsewhere?
   ├── What modal patterns exist?
   ├── What table patterns exist?

2. DOCUMENT any inconsistencies found:
   ├── "Module X uses pattern A"
   ├── "Module Y uses pattern B for the same thing"
   ├── Flag for PO decision

3. INCLUDE in output:
   ├── Pattern analysis section
   ├── Existing standards identified
   ├── Inconsistencies found
```

**CONGRUENCY MINDSET:**
> "I am not just gathering info about ONE module.
> I am understanding how this module fits into the WHOLE system.
> Any pattern I find here must align with patterns everywhere."

---

## WHEN TO USE

- Start of any new module
- When you need to understand the current state of the system
- Before any planning
- When you need to map dependencies and integrations

---

## PROMPT

```
# INFORMATION GATHERING - DATA COLLECTION

## IDENTIFICATION

| Field | Value |
|-------|-------|
| **Module/Feature** | ___________________________________ |
| **Main Folder** | ___________________________________ |
| **Reference Document (if exists)** | ___________________________________ |

---

## ROLE

Act as expert developer in:
- UX/UI Design
- Backend/Frontend Development
- Product Designer & Product Owner
- Project Manager
- Database & Migrations Expert
- SQL Specialist
- Senior Fullstack Developer

---

## OBJECTIVE

Perform deep and complete analysis of everything related to the specified module.
DO NOT EXECUTE ANYTHING - only collect information, map and document.

---

## EXECUTION INSTRUCTIONS

### STEP 1: File Mapping

1. Identify ALL files related to the module:
   - React Components
   - Services
   - Hooks
   - Types/Interfaces
   - SQL Migrations
   - Existing documentation

2. For each file, document:
   - Location (full path)
   - Main function
   - Dependencies
   - Status (working/has bugs/incomplete)

### STEP 2: Documentation Analysis

1. Read ALL existing documentation in folders:
   - Module main folder
   - Related folders
   - CLAUDE.md and other reference docs

2. Identify:
   - Decisions already made
   - Documented pending items
   - PO feedback
   - Known bugs

### STEP 3: Code Analysis

1. For each component, analyze:
   - Implemented features
   - Missing features
   - Visible bugs in code
   - Inconsistencies with documentation

2. Map integrations:
   - Which other modules does it connect to?
   - What data does it send/receive?
   - What automations exist?

### STEP 4: Clarification Questions

IMPORTANT: Do not spare questions. Do not leave any point unclear.

For each question:
1. Explain the technical context
2. Explain what the answer affects
3. Give a technical recommendation (if applicable)
4. List possible options

---

## OUTPUT FORMAT

### 1. File Map
module/
├── components/
│   ├── File1.tsx - [STATUS] - Description
│   └── File2.tsx - [STATUS] - Description
├── services/
│   └── ...
└── ...

### 2. Development Status
| Area | Status | Notes |
|------|--------|-------|
| UI/UX | X% | ... |
| Backend | X% | ... |
| Integrations | X% | ... |

### 3. Bugs and Pending Items
| # | Type | Description | File | Priority |
|---|------|-------------|------|----------|
| 1 | Bug | ... | ... | High/Medium/Low |

### 4. Questions for PO
| # | Question | Technical Context | Impact | Recommendation |
|---|----------|-------------------|--------|----------------|
| 1 | ...? | ... | ... | ... |

---

## RULES

1. **DO NOT EXECUTE ANYTHING** - Only collect information
2. **Read and reread** - Return to documentation as many times as necessary
3. **Zero doubts** - Do not accept 0.1% of unclear doubt
4. **360° Vision** - The system is broad and connected, consider everything
5. **Document everything** - Even what seems obvious

---

## UPON COMPLETION

Deliver a complete report containing:
1. Complete file map
2. Detailed development status
3. List of bugs and pending items
4. Clarification questions for PO
5. Initial recommendations
```

---

## EXAMPLE USAGE

### For Collection Rules (Regua de Cobranca):

| Field | Value |
|-------|-------|
| **Module/Feature** | Collection Rules (Regua de Cobranca) |
| **Main Folder** | docs/FINANCAS_4.0/ |
| **Reference Document** | REGUA_COBRANCA_MASTER.md |

### For Tickets Module:

| Field | Value |
|-------|-------|
| **Module/Feature** | Tickets Module |
| **Main Folder** | src/components/tickets/ |
| **Reference Document** | docs/tickets/ |

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 27/12/2024 | Initial version |
| 1.1 | 27/12/2024 | Added PO DNA Working Style section |
| 1.2 | 27/12/2024 | Added CONGRUENCY CHECK section |
| 1.3 | 27/12/2024 | Standardized to English for consistency with other prompts |
| 1.4 | 27/12/2024 | Translated ALL content to English (prompt block, examples) |
| 1.5 | 27/12/2024 | Added Rules 13 & 14 references (Mandatory Technical Rationale & Documentation Updates) |
