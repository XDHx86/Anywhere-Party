# Implementation Plan

> Authoritative roadmap. Preserves existing progress. Based on repository evidence.

---

# Repository Vision

A fully-featured, production-ready cross-browser watch party extension with comprehensive sync, voice, chat, annotations, subtitles, avatars, playlists, and scheduling — published to Chrome Web Store and Firefox Add-ons.

---

# Milestones

## Milestone 1: Repository Infrastructure — Planned

**Objective:** Establish version control and CI/CD.

| Task | Status | Notes |
|---|---|---|
| Initialize git repository | Planned | No `.git` exists; `.gitignore`, `.husky/`, `.github/workflows/ci.yml` are ready |
| Initial commit of current state | Planned | Includes all source, assets, docs, configs |
| Verify CI pipeline runs | Planned | `.github/workflows/ci.yml`: lint → typecheck → build → test → coverage → mutation |
| Remove ephemeral root-level summary MDs | Planned | 6 fix-summary MDs absorbed into project memory |

**Validation:** `git log` shows clean history. CI passes on first push.

---

## Milestone 2: Feature Completion — Deferred

**Objective:** Complete remaining planned features behind feature flags.

### Task 9.1: Playlist Management
**Status:** Deferred (flag `PLAYLISTS: false`)

- Shared video queue with Material Design 3 interface
- Automatic advancement to next item when current ends
- Drag-and-drop reordering with animations
- Voting mechanism for skipping content
- Persistence via browser storage

**Dependencies:** Room state persistence (completed), sync engine (completed)
**Validation:** Unit tests for queue logic; integration tests for auto-advance; manual cross-browser testing

### Task 9.3: Scheduled Watch Parties
**Status:** Deferred (flag `SCHEDULING: false`)

- Schedule future sessions with Material date/time pickers
- ICS calendar invite generation
- Reminder notifications before sessions
- Recurring schedule support
- Google Calendar / Outlook integration

**Dependencies:** Room management (completed), notification APIs
**Validation:** Unit tests for scheduling logic; ICS file validation; manual calendar integration testing

---

## Milestone 3: Documentation & Deployment — In Progress

**Objective:** Complete documentation and deployment validation.

### Task 8.2: Documentation & Debugging Guides
**Status:** In Progress

- README debug steps for Chrome unpacked and Firefox about:debugging
- API key configuration guide
- Right-click video detection fallback documentation
- Troubleshooting guide for common runtime issues
- Updated API documentation with error handling

### Task 8.3: Deployment Validation Checklist
**Status:** Planned

- Verify all icon assets load in Chrome and Firefox
- Test room creation and state persistence across sessions
- Validate API key management and error handling
- Confirm popup scrolling and accessibility
- Test configuration import/export with preview modal

**Validation:** Deployment checklist completed and signed off; production build verified on both browsers.

---

## Milestone 4: Advanced Features — Future

**Objective:** Implement advanced annotation features and end-to-end encryption.

### ADVANCED_ANNOTATIONS
**Status:** Future (flag `ADVANCED_ANNOTATIONS: false`)

- Advanced drawing tools, layers, and collaborative editing
- Expand on existing annotation-layer module

### E2E_ENCRYPTION
**Status:** Future (flag `E2E_ENCRYPTION: false`)

- End-to-end encryption for chat communications
- Expand on existing encryption module (`src/@core/encryption/`)

**Validation:** Feature flag enabled; integration tests pass; cross-browser verified.

---

## Milestone 5: Production Readiness — Future

**Objective:** Extension store publishing and production infrastructure.

- Chrome Web Store submission
- Firefox Add-ons submission
- Production TURN server deployment
- Monitoring and alerting setup
- Data retention policy enforcement
- Production database migration scripts

---

# Dependencies

```
Milestone 1 (Infrastructure) → no blockers
Milestone 2 (Features) → independent, can run in parallel with Milestone 3
Milestone 3 (Docs/Deploy) → Milestone 1 recommended but not required
Milestone 4 (Advanced) → Milestone 2 features should be stable first
Milestone 5 (Production) → Milestones 1–3 complete
```

---

# Risks

| Risk | Severity | Mitigation |
|---|---|---|
| No git history | High | Initialize git immediately (Milestone 1) |
| Placeholder asset masking | Medium | Add build validation step that fails on missing assets |
| Config interface drift (3 locations) | Medium | Consider a single source of truth for ExtensionConfig |
| Large bundle from MUI + React | Low | Monitor with webpack bundle analyzer; optimize code splitting |
| Firefox MV2 deprecation | Low | Monitor Firefox roadmap; plan MV3 migration if needed |

---

# Technical Debt

- **Root-level summary MDs:** Six ephemeral fix-summary files should be removed after git initialization.
- **Dual spec generations:** Requirements 1–28 vs 29–46 may confuse future contributors. Consider consolidating into a single numbered sequence.
- **webpack validateAssets():** Creates placeholders instead of failing. Should be replaced with strict validation for production builds.
- **Config sync:** `ExtensionConfig` interface, defaults, and JSON file must stay in sync manually. Consider generating one from another.

---

# Progress Summary

| Milestone | Status | Tasks Remaining |
|---|---|---|
| 1. Repository Infrastructure | Planned | 4 |
| 2. Feature Completion | Deferred | 2 features |
| 3. Documentation & Deployment | In Progress | 2 |
| 4. Advanced Features | Future | 2 features |
| 5. Production Readiness | Future | Multiple |
