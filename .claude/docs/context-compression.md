# Context Compression

> Policy for managing long sessions and restoring context efficiently. Last updated: 2026-08-04.

## Problem

This knowledge system + CLAUDE.md + code exploration can overflow a single context window. Compression keeps the *essential* state loadable while letting detail live in files that are only read on demand.

## Progressive loading model

Only load what the current task needs:

| Depth | Files | When |
|---|---|---|
| L1 | `CLAUDE.md` + [context-summary.md](context-summary.md) | Every session |
| L2 | [current-state.md](current-state.md) | Before touching code |
| L3 | [project-memory.md](project-memory.md) | Reasoning about design/architecture |
| L4 | `architecture-decisions.md`, `docs/`, `plan.md` | Relevant decision/contract/roadmap questions |
| L5 | Code via **CodeGraph** | Concrete implementation questions |

## Compression rules

- **Prefer CodeGraph over reading files** — one `codegraph_explore` returns verbatim source + call paths, replacing dozens of Read/Grep calls.
- **Prefer this docs tree over raw exploration** — the docs answer *why* cheaply; don't re-derive it by reading code.
- **When context runs low**, drop L3–L5 and rely on L1–L2 + CodeGraph. The docs are on disk; you can always re-read.
- **Update-then-compress:** after finishing a task, fold its learnings into the right file (per [governance.md](governance.md)) so the *next* session starts cold and cheap.

## What must always be loadable

- Where things live (context-summary)
- What is currently true (current-state)
- How to get more detail (knowledge-map + CodeGraph)

These three are sufficient to resume any task without re-deriving repository knowledge from scratch.

## Recovery after interruption

Follow the order in `CLAUDE.md` → Context Restoration:
1. Read `CLAUDE.md`
2. Read `context-summary.md`
3. Read `current-state.md`
4. Use CodeGraph for code
5. Load more only when required

If a previous session left `current-state.md` stale, fix it as part of recovery (see governance).
