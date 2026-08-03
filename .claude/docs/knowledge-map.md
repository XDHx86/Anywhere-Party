# Knowledge Map

> Retrieval policy — where to look for what. This file tells you the fastest path to each kind of knowledge. Last updated: 2026-08-04.

## Question → source

| Question | Go to |
|---|---|
| What does this code do? / who calls it? | **CodeGraph** (`codegraph_explore`) first — it returns verbatim source + call paths |
| What is this project? | [context-summary.md](context-summary.md) → CLAUDE.md |
| What is happening right now? | [current-state.md](current-state.md) |
| Why is it designed this way? | [project-memory.md](project-memory.md) + [architecture-decisions.md](architecture-decisions.md) |
| How do I build/test/lint? | CLAUDE.md → Commands |
| What messages can flow over signaling? | `src/@core/signaling/message-types.ts` |
| How do I add a message type? | `message-types.ts` union types + background/content handler maps |
| Cross-browser API access pattern | `src/@core/browser-bridge/` |
| Public API / REST / WebSocket protocol | [docs/api.md](../../docs/api.md) |
| Deployment / Docker / nginx / monitoring | [docs/deployment.md](../../docs/deployment.md), `docker-compose*.yml`, `monitoring/`, `nginx/` |
| MD3 components / style / migration | `docs/material-design-3-*.md` |
| What is planned / not yet done? | [plan.md](../../plan.md) + [current-state.md](current-state.md) |
| Something is broken (build/test/server) | [troubleshooting.md](troubleshooting.md) |
| Git history of a change | `git log`, PRs (history is authoritative for *what changed*) |

## CodeGraph usage

- Always query with `projectPath: "D:/Projos/AnywhereParty"`.
- Ask questions in natural language or name symbols — one `codegraph_explore` call usually answers the whole question.
- Manual Grep/Glob/Read is the **fallback**, not the default.

## Knowledge ownership

| Knowledge | Owner |
|---|---|
| *What* the code does | Code + tests |
| *Why* (design) | `.claude/docs/project-memory.md`, `architecture-decisions.md` |
| *State now* | `.claude/docs/current-state.md` |
| *Roadmap* | `plan.md` |
| *Public contract* | `docs/` |

Never store a fact in two places — pick the owner above. If you find duplication, resolve it toward the single owner and update [governance.md](governance.md) if the ownership rules need changing.
