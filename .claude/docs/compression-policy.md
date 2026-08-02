# Knowledge Compression Policy

> Rules for how repository knowledge evolves. Maximize information density while preserving correctness.

---

# Compression Principles

- Rewriting replaces appending
- Summarizing replaces expanding
- Merging replaces fragmenting
- Removal replaces accumulation

---

# Knowledge Lifecycles

| Lifecycle | Examples | Action |
|---|---|---|
| Temporary | Debugging notes, experiments | Promote or remove |
| Current | Active milestone, blockers | Rewrite in place |
| Long-Term | Architectural philosophy, lessons | Rewrite as understanding improves |
| Permanent | Architectural invariants, platform requirements | Change only when repository fundamentally changes |

---

# Compression Triggers

Review and compress knowledge when:
- A milestone completes
- An architectural decision is made
- A major refactor finishes
- Duplicate knowledge is discovered
- Documentation grows without increasing value
- Context restoration becomes slower

---

# Context Budget

Before adding information, ask:
- Does this already exist elsewhere?
- Can existing knowledge be rewritten instead?
- Can another document simply be referenced?
- Does this improve future context restoration?

If the answer is no, do not increase repository memory.

---

# Current Compression Notes

- Six root-level summary MDs contain fix-history that has been absorbed into Project Memory. They are candidates for removal once git is initialized.
- `.kiro/specs/watch-party-extension/requirements.md` (46 requirements) is the canonical spec. No separate requirements document should be created.
- The `docs/` directory is well-structured and does not require consolidation.
