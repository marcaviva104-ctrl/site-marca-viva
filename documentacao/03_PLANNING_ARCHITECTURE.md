# PROMPT 03: PLANNING & ARCHITECTURE

**Version:** 2.0
**Created:** 27/12/2024
**Updated:** 30/12/2024
**Optimized for:** Claude Opus 4.5
**Phase:** Planning & Structure Design

---

## RULE ZERO: METHODOLOGY IS THE OPERATING SYSTEM (EMBEDDED)

```
┌─────────────────────────────────────────────────────────────────┐
│              THE 5 VITAL RULES - ACTIVE FOR THIS PHASE          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  V1: DOCUMENT AS YOU GO                                        │
│      Every design decision → IMMEDIATE documentation            │
│      No batching. No "I'll add this later."                    │
│                                                                 │
│  V2: 10X VERIFICATION                                          │
│      This phase requires 10 iterations before Phase 4          │
│      Each iteration MUST be documented as proof                │
│                                                                 │
│  V3: ONE THING AT A TIME                                       │
│      One component → design → document → next component        │
│      Complete and document before moving on                     │
│                                                                 │
│  V4: EXHAUSTIVE THOROUGHNESS                                   │
│      No superficial designs                                     │
│      Every field, layout, interaction fully specified          │
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

## Phase 3 Specific Rules:

| Rule | Application |
|------|-------------|
| **NO CODE CHANGES** | This phase is DOCUMENTATION ONLY. Do not modify any source code files. |
| **ADDITIVE ONLY** | Add to Master. NEVER delete or "clean up" existing content yet. |
| **One Section at a Time** | Design ONE component/section completely before moving to the next. |
| **Chunk Size** | For complex designs, work in logical chunks. Don't rush. |
| **Precision Level** | MAXIMUM - Every field, every layout, every interaction must be defined. |
| **Speed** | NOT important. Take as long as needed for quality. |
| **No Assumptions** | When in doubt about requirements, ASK the PO. |
| **TECHNICAL RATIONALE (Rule 13)** | Every architecture decision MUST include WHY. Explain alternatives considered and trade-offs for each design choice. |
| **DOC UPDATES (Rule 14)** | Document EACH design decision IMMEDIATELY as you make it. No batching. |
| **10x VERIFICATION (Rule 10)** | Complete 10 iterations of this phase, each documented. |

### What CAN be modified:
- Documentation files (.md) - ADDITIVE changes only
- Master document - ADD architecture sections

### What CANNOT be modified:
- Components (.tsx, .jsx)
- Services (.ts, .js)
- Styles (.css)
- Migrations (.sql) - design them in docs, don't create files yet
- Any source code

### Design vs Implementation:
> All SQL schemas, component architectures, and UI specs are DOCUMENTED in this phase.
> Actual file creation happens ONLY in Phase 6 (Execution).

### CONGRUENCY CHECK (Phase 3 Specific):

```
DURING ARCHITECTURE PLANNING, MANDATORY:

1. BEFORE designing ANY component:
   ├── Search for existing patterns in the system
   ├── How are similar components built elsewhere?
   ├── What's the established standard for this type?

2. DESIGN must align with system standards:
   ├── If filters are dropdowns elsewhere → design dropdowns
   ├── If modals are 600px elsewhere → design 600px
   ├── If tables have X columns → follow that pattern
   ├── NO EXCEPTIONS without PO approval

3. INCLUDE in architecture output:
   ├── "Pattern Compliance" section
   ├── Reference to existing patterns used
   ├── Any new patterns proposed (need PO approval)
```

**ARCHITECTURE CONGRUENCY CHECKLIST:**

```
[ ] Identified the component type being designed
[ ] Searched for ALL existing instances of this type
[ ] Documented the established pattern
[ ] My design follows the established pattern EXACTLY
[ ] If proposing new pattern → documented why + asked PO
[ ] UI layouts match existing module layouts
[ ] Form structures match existing form structures
[ ] Navigation patterns match existing navigation
[ ] Error handling matches existing error patterns
[ ] Success feedback matches existing patterns
```

**CRITICAL:**
> "I am not designing in isolation. I am designing for a SYSTEM.
> Every design decision must align with the existing system.
> If there's no existing pattern, I propose one and ASK PO to approve."

---

## WHEN TO USE

- After completing Information Gathering (Phase 01) and Consolidation (Phase 02)
- When you have all necessary information collected
- Before any implementation begins
- When designing module structure and architecture

---

## PROMPT

```
# PLANNING & ARCHITECTURE - MODULE DESIGN

## IDENTIFICATION

| Field | Value |
|-------|-------|
| **Module/Feature** | ___________________________________ |
| **Master Document** | ___________________________________ |
| **Related Folders** | ___________________________________ |
| **Information Gathering Output** | ___________________________________ |

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

Design complete planning and architecture for the specified module.
DO NOT EXECUTE ANYTHING - only plan, structure, and document.

---

## EXECUTION INSTRUCTIONS

### PHASE 1: Requirements Consolidation

1. Review all information gathered in Phase 01
2. Consolidate requirements into categories:
   - Functional Requirements
   - Non-Functional Requirements
   - Business Rules
   - Constraints & Limitations

3. Validate against existing system:
   - Does it align with current architecture?
   - What adaptations are needed?
   - What existing components can be reused?

### PHASE 2: Architecture Design

1. **Database Schema**
   - Tables needed (new and modifications)
   - Relationships and cardinalities
   - Indexes and constraints
   - ENUMs and types
   - RLS policies

2. **Backend Structure**
   - RPCs/Functions needed
   - Services architecture
   - API endpoints
   - Validations and business logic

3. **Frontend Structure**
   - Component hierarchy
   - State management approach
   - Forms and validations
   - UI/UX layouts (detailed)

4. **Integrations**
   - With existing modules
   - External APIs
   - Automations and triggers

### PHASE 3: UI/UX Detailed Design

For EACH screen/component, define:

1. **Layout Structure**
   [ASCII representation of the layout]

2. **Components Used**
   - Which shadcn/ui components
   - Custom components needed
   - Responsive behavior

3. **User Flows**
   - Step-by-step interactions
   - Success paths
   - Error handling
   - Edge cases

4. **Visual States**
   - Loading states
   - Empty states
   - Error states
   - Success feedback

### PHASE 4: Implementation Blocks

Break down implementation into atomic blocks:

| Block | Description | Dependencies | Estimated Complexity |
|-------|-------------|--------------|---------------------|
| B-01 | ... | None | Low/Medium/High |
| B-02 | ... | B-01 | ... |

### PHASE 5: Decision Points

Document ALL decisions that need PO approval:

| # | Decision | Options | Technical Impact | Recommendation |
|---|----------|---------|------------------|----------------|
| D-01 | ...? | A, B, C | ... | Option A because... |

---

## OUTPUT FORMAT

### 1. Executive Summary
- Module overview
- Key features
- Integration points
- Critical decisions

### 2. Database Schema
-- Complete SQL with comments (in documentation, not actual files)
CREATE TABLE ...

### 3. Component Architecture
src/
├── components/module/
│   ├── Component1.tsx - Description
│   └── ...
├── services/
│   └── moduleService.ts
└── hooks/
    └── useModule.ts

### 4. UI/UX Specifications
For each screen:
- ASCII layout
- Component breakdown
- User flow
- States

### 5. Implementation Roadmap
| Phase | Blocks | Description |
|-------|--------|-------------|
| 1 | B-01, B-02 | Foundation |
| 2 | B-03, B-04 | Core features |
| 3 | B-05+ | Polish & integrations |

### 6. Pending Decisions
All decisions requiring PO input

---

## RULES

1. **NO EXECUTION** - Only plan and document
2. **100% Definition** - Every function, every layout, every UX detail
3. **System Congruency** - New module ADAPTS to existing system, not the other way
4. **360° Evaluation** - Consider all connected modules
5. **No Assumptions** - Ask if unclear

---

## IMPORTANT CONSIDERATIONS

- The system is broad and fully connected
- Modules send and receive information between each other
- There are already internal automations
- When planning a module, always do a complete 360° evaluation
- Everything composes a single project

---

## BEFORE FINALIZING

Confirm:
- [ ] All requirements are addressed
- [ ] Architecture aligns with existing system
- [ ] UI/UX is fully specified
- [ ] All decision points are documented
- [ ] Implementation blocks are atomic and clear
- [ ] No ambiguity remains
```

---

## EXAMPLE USAGE

### For Regua de Cobranca:

| Field | Value |
|-------|-------|
| **Module/Feature** | Regua de Cobranca (Collection Rules) |
| **Master Document** | docs/FINANCAS_4.0/Regua-de-Cobranca-PM/03_Architecture/REGUA_COBRANCA_MASTER.md |
| **Related Folders** | docs/FINANCAS_4.0/Regua-de-Cobranca-PM/ |
| **Information Gathering Output** | 01_Research/ folder |

---

## VERSION HISTORY

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 27/12/2024 | Initial version |
| 1.1 | 27/12/2024 | Added PO DNA Working Style section |
| 1.2 | 27/12/2024 | Added CONGRUENCY CHECK section |
| 1.3 | 27/12/2024 | Added Rules 13 & 14 references (Mandatory Technical Rationale & Documentation Updates) |
| 2.0 | 30/12/2024 | RULE ZERO integration: Embedded 5 Vital Rules, added 10x requirement, fixed doc timing |
