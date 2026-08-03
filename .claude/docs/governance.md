# Documentation Governance

> Rules for keeping the knowledge system accurate and maintainable. Anyone (human or AI) who changes the repository should follow these. Last updated: 2026-08-04.

## Principles

1. **The code is the source of truth for *what*.** Docs describe *why* and *state*; never copy code into docs.
2. **One owner per fact.** Every fact lives in exactly one place. If two files disagree, the owner wins (see [knowledge-map.md](knowledge-map.md)).
3. **Rewrite, don't append.** Update a section in place rather than stacking new notes. Compress instead of expanding.
4. **Remove obsolete knowledge.** If a fact is wrong or outdated, fix or delete it — do not leave a correction note.
5. **Keep it small.** If a doc needs more than ~2 pages, split the topic or move detail into the code/CodeGraph.

## What goes where

| Content | Destination |
|---|---|
| Commands, conventions, entry point | `CLAUDE.md` |
| Current status, feature flags, known issues | `.claude/docs/current-state.md` |
| Durable design rationale | `.claude/docs/project-memory.md` |
| Decisions with context/consequences | `.claude/docs/architecture-decisions.md` (new ADR per decision) |
| Public API, deployment, MD3 guides | `docs/` |
| Roadmap, milestones, tasks | `plan.md` |
| Everything else (ephemeral, task-specific) | Do **not** write to disk — leave it in the conversation or a git branch |

## When to update

- **After any merged PR** that changes architecture, flags, commands, or milestone status → update `current-state.md`, and `project-memory.md`/`architecture-decisions.md` only if design *why* changed.
- **When a feature flag flips** → update `current-state.md` + `plan.md` immediately.
- **When a decision is made** → record it as an ADR in the same change.
- **After context loss / long sessions** → compress using [context-compression.md](context-compression.md).

## Review workflow

For a normal change: code → tests → `current-state.md` if needed. For an architectural change: also touch `project-memory.md`/`architecture-decisions.md` and `docs/` only if the public contract changes.

Do **not** expand this knowledge system for every PR — that is how docs rot. Update only what the change actually invalidates.

## Ownership

- Maintained collaboratively by all contributors; final consistency check on every PR.
- Keep `docs/` in sync with `docs/README.md` index when files are added/removed.
- This governance file itself follows the same rules — improve it here rather than working around it.
