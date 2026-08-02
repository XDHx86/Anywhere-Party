# Knowledge Map

> Retrieval policy. Determines what should be loaded, when, and what should remain unloaded.

---

# Retrieval Principles

- Begin with the smallest useful context
- Load only documents relevant to the current task
- Prefer summaries before detailed documents
- Expand context only when necessary

---

# Knowledge Hierarchy

| Level | Document | Purpose |
|---|---|---|
| 1 | [Context Summary](context-summary.md) | Repository orientation |
| 2 | [Current Project State](current-state.md) | What is happening now |
| 3 | [Project Memory](project-memory.md) | Long-term knowledge, conventions, assumptions |
| 4 | [Architectural Decisions](architecture-decisions.md) | Why significant decisions were made |
| 5 | [Implementation Plan](../../plan.md) | Planned future work |
| 6 | [Troubleshooting Guide](troubleshooting.md) | Recurring operational issues |
| 7 | [docs/](../../docs/) | Contributor-facing documentation |

Load additional documentation only when required.

---

# Task-Based Retrieval

## Repository Understanding
- Load: Context Summary
- Expand: Current Project State only if active work is relevant

## Feature Development
- Load: Context Summary → Current Project State → Project Memory → Implementation Plan
- Load: Architectural Decisions if architectural reasoning is required

## Bug Investigation
- Load: Current Project State → Troubleshooting Guide
- Expand to Project Memory only if architectural understanding becomes necessary

## Refactoring
- Load: Context Summary → Project Memory → Architectural Decisions
- Consult Implementation Plan only if it affects the refactor

## Cross-Browser Work
- Load: Project Memory (browser-bridge conventions, Firefox quirks)
- Load: docs/ for manifest differences and compatibility notes

## Codebase Exploration
- Use **CodeGraph** (`codegraph_explore`) as the primary exploration tool
- Pass `projectPath: D:/Projos/AnywhereParty` for CodeGraph queries
- Manual Grep/Glob/Read is fallback only

---

# Authoritative Ownership

| Topic | Owner |
|---|---|
| Repository overview | Context Summary |
| Current implementation state | Current Project State |
| Long-term repository knowledge | Project Memory |
| Architectural reasoning | Architectural Decisions |
| Future work | Implementation Plan |
| Recurring operational issues | Troubleshooting Guide |
| Knowledge retrieval policy | Knowledge Map |
| Documentation governance | Governance |
| Knowledge compression | Compression Policy |
| Repository identity | Repository Profile |
| Contributor documentation | docs/ |
