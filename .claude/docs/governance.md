# Documentation Governance

> Rules for maintaining the repository's knowledge system. Protects quality, not quantity.

---

# Governance Principles

- Every topic has exactly one authoritative owner
- References replace copies
- Rewriting replaces appending
- Knowledge should become clearer, not larger

---

# Document Responsibilities

| Document | Owns | Does Not Own |
|---|---|---|
| Context Summary | Repository orientation | Implementation details |
| Current Project State | Active working memory | Historical records |
| Project Memory | Long-term knowledge | Current progress |
| Architectural Decisions | Why decisions were made | What was implemented |
| Implementation Plan | Future work | Completed work |
| Troubleshooting Guide | Operational knowledge | Debugging sessions |
| Knowledge Map | Retrieval policy | Documentation content |
| Governance | Maintenance rules | Knowledge itself |
| Compression Policy | Evolution rules | Knowledge content |
| Repository Profile | Identity metadata | Status or plans |

---

# Updating Rules

When repository knowledge changes:

1. Identify the authoritative document
2. Update that document (rewrite, not append)
3. Remove obsolete information
4. Verify no duplication was introduced
5. Update references if document paths changed

---

# Knowledge Promotion

Temporary → Current State → Project Memory → Architectural Decisions

Promote only when knowledge demonstrates lasting value. Not every implementation detail deserves promotion.

---

# Conflict Resolution

1. Determine the authoritative owner
2. Preserve the authoritative version
3. Update dependent documents
4. Remove conflicting knowledge

---

# Root-Level Summary MDs

The following root-level documents are ephemeral fix summaries created during development. They contain historical fix details that have been absorbed into Project Memory and the canonical specs (`.kiro/specs/`). They should be removed or archived once git is initialized:

- `CROSS_BROWSER_TESTING_GUIDE.md` — cross-browser testing runbook (consider moving to `docs/`)
- `CROSS_BROWSER_TEST_SUMMARY.md` — test results summary (ephemeral)
- `INTEGRATION_TEST_STATUS.md` — test status report (ephemeral)
- `OPTIMIZATION_FIXES_SUMMARY.md` — optimization fixes log (ephemeral)
- `RUNTIME_ERRORS_FIXED.md` — runtime error fixes log (ephemeral)
- `TYPESCRIPT_FIXES_SUMMARY.md` — TypeScript fixes log (ephemeral)
