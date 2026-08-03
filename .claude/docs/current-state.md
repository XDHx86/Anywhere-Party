# Current Project State

> Working memory for the repository. Represents today, not history. Rewrite rather than append.

---

# Current Development

The extension is in a pre-distribution state. Milestones 1–3 of the implementation plan are complete (repo infrastructure, feature completion, documentation). Remaining work: Milestone 4 (advanced features — annotations, encryption) and Milestone 5 (production readiness — store publishing, deployment).

---

# Immediate Priorities

1. **Advanced annotations** — Feature flag `ADVANCED_ANNOTATIONS` is `false`. Milestone 4.
2. **E2E encryption** — Feature flag `E2E_ENCRYPTION` is `false`. Milestone 4.
3. **TypeScript type errors** — 463 pre-existing MUI7/React19 type mismatches need resolution (currently non-blocking in CI).
4. **Test suite reliability** — ~19% of tests fail due to timing sensitivity and Node 24 jsdom incompatibility.
5. **Production deployment** — Chrome Web Store submission, Firefox Add-ons, TURN server, monitoring.

---

# Active Decisions

- **Feature flags gate incomplete work:** `PLAYLISTS`, `SCHEDULING`, `ADVANCED_ANNOTATIONS`, and `E2E_ENCRYPTION` are disabled. Work on these features should not begin until explicitly prioritized.
- **Dist is buildable but not committed:** The `dist/` directory contains working Chrome and Firefox builds, but has no version history. Loading from `dist/chrome` works without building for immediate testing.
- **No production database configured:** Docker Compose defines Postgres/Redis services, but local development uses an in-memory WebSocket relay only.

---

# Active Constraints

- No version control (git not initialized) — blocks CI, collaboration, and deployment workflows.
- `EXTENSION_CONFIG.local.json` must be set to `LOCAL_DEV_MODE: true` for local development.
- Firefox uses MV2 (`manifest-firefox.json`) while Chrome uses MV3 (`manifest-chrome.json`) — cross-browser testing must cover both manifest versions.

---

# Known Risks

- **Placeholder asset generation:** `webpack.config.js` auto-creates placeholder assets if files are missing (`validateAssets()`), which can mask missing-asset bugs in production builds.
- **Config interface drift:** `ExtensionConfig` interface in `src/@core/browser-bridge/types.ts`, defaults in `config-manager.ts`, and `extension-config.json` must stay in sync manually.
- **No git:** CI configuration exists but cannot run. All fix history lives in markdown summaries rather than commits.

---

# Next Recommended Actions

1. Initialize git and commit the current state.
2. Verify CI pipeline runs successfully.
3. Implement playlist management (task 9.1).
4. Clean up root-level summary MDs — consolidate into project memory.
5. Complete documentation tasks (8.2, 8.3).
