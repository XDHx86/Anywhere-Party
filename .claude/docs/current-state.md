# Current Project State

> Working memory for the repository. Represents today, not history. Rewrite rather than append.

---

# Current Development

The extension is in a pre-distribution state. Milestones 1–4 of the implementation plan are complete (repo infrastructure, feature completion, documentation, advanced features). Remaining work: Milestone 5 (production readiness — store publishing, deployment).

---

# Immediate Priorities

1. **Production deployment** — Chrome Web Store submission, Firefox Add-ons, TURN server, monitoring.
2. **TypeScript type errors** — 463 pre-existing MUI7/React19 type mismatches need resolution (currently non-blocking in CI).
3. **Test suite reliability** — ~19% of tests fail due to timing sensitivity and Node 24 jsdom incompatibility.
4. **Manual testing** — Room creation/persistence, popup scrolling/accessibility, config import/export, E2E encryption flow, annotation sync.

---

# Active Decisions

- **E2E encryption is always-on** when `E2E_ENCRYPTION_ENABLED` is true. No user-facing toggle.
- **AnnotationLayer extended** (not WhiteboardManager) for advanced tools. WhiteboardManager kept as reference.
- **ParticipantManager** is the single source of truth for participant state. All subsystems read from it.
- **Protocol versioning** on all new message types (v1). Existing messages are implicitly v1.
- **Feature flags gate incomplete work:** `ADVANCED_ANNOTATIONS: true`, `E2E_ENCRYPTION_ENABLED: true`. Milestone 5 flags remain disabled.

---

# Active Constraints

- Firefox uses MV2 (`manifest-firefox.json`) while Chrome uses MV3 (`manifest-chrome.json`) — cross-browser testing must cover both manifest versions.
- `EXTENSION_CONFIG.local.json` must be set to `LOCAL_DEV_MODE: true` for local development.

---

# Known Risks

- **Placeholder asset generation:** `webpack.config.js` auto-creates placeholder assets if files are missing.
- **Config interface drift:** `ExtensionConfig` interface, defaults, and JSON file must stay in sync manually.
- **Pre-existing test failures:** ~19% of tests fail due to timing sensitivity and Node 24 jsdom incompatibility.

---

# Next Recommended Actions

1. Complete Milestone 5 — production readiness (Chrome Web Store, Firefox Add-ons, TURN server).
2. Manual testing of E2E encryption flow and annotation sync.
3. Resolve TypeScript type errors (MUI7/React19).
4. Improve test suite reliability.
