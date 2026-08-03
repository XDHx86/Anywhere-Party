# Internal Knowledge System

> Authoritative project memory for AI-assisted development. This directory is the repository's long-term memory — not user-facing documentation.

**Audience:** AI sessions and contributors restoring context.

## Layout

| File | Role | When to read |
|---|---|---|
| [context-summary.md](context-summary.md) | 1-page orientation | Start of every session |
| [current-state.md](current-state.md) | Snapshot of active work | Before touching code |
| [project-memory.md](project-memory.md) | Durable architecture knowledge | When reasoning about design |
| [architecture-decisions.md](architecture-decisions.md) | Recorded decisions & rationale | When a decision is in question |
| [knowledge-map.md](knowledge-map.md) | Retrieval policy | When searching for knowledge |
| [troubleshooting.md](troubleshooting.md) | Operational issues & fixes | When something breaks |
| [governance.md](governance.md) | How to maintain this system | When updating docs |
| [context-compression.md](context-compression.md) | Context management & compression | When context is long |

## Relationship to other knowledge

- **[CLAUDE.md](../../CLAUDE.md)** — entry point; commands, architecture overview, conventions. Do not duplicate its content here.
- **[docs/](../../docs/)** — public, consumer-facing documentation (API, deployment, MD3 guides). Internal memory stays authoritative; docs/ is derived.
- **[plan.md](../../plan.md)** — implementation roadmap (milestones). Consumed by current-state.

## Loading order

1. `context-summary.md`
2. `current-state.md`
3. `project-memory.md` (only if architectural understanding is needed)
4. `architecture-decisions.md` (only when a decision is relevant)
5. Use CodeGraph for code-level questions — the docs describe *why*, the code is the source of truth for *what*.
