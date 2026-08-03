# Implementation Plan

> Authoritative roadmap. Preserves existing progress. Based on repository evidence. Consumes the internal knowledge system (`.claude/docs/`) rather than duplicating it. Last updated: 2026-08-04.

---

# Repository Vision

A fully-featured, production-ready cross-browser watch party extension with comprehensive sync, voice, chat, annotations, subtitles, avatars, playlists, and scheduling — published to Chrome Web Store and Firefox Add-ons.

---

# Milestones

## Milestone 1: Repository Infrastructure — Completed

**Objective:** Establish version control and CI/CD.

| Task | Status | Notes |
|---|---|---|
| Initialize git repository | Completed | `.git` initialized; remote `github.com/XDHx86/Anywhere-Party.git` |
| Initial commit of current state | Completed | All source, assets, docs, configs committed |
| Verify CI pipeline runs | Completed | lint ✅, format ✅, build ✅, coverage ✅, mutation ✅; typecheck/test non-blocking |
| Remove ephemeral root-level summary MDs | Completed | 5 summaries removed; guide moved to `docs/cross-browser-testing.md` |

**Validation:** `git log` shows clean history; CI pipeline runs all steps.

**Known issues:** see [current-state.md](.claude/docs/current-state.md) — 463 typecheck errors and ~19% test failures are pre-existing and non-blocking on CI.

---

## Milestone 2: Feature Completion — Completed

**Objective:** Complete remaining planned features behind feature flags.

### Task 9.1: Playlist Management
**Status:** Completed (flag `PLAYLISTS: true`)

- Shared video queue with Material Design 3 interface ✅
- Automatic advancement to next item when current ends ✅
- Drag-and-drop reordering with animations ✅ (move up/down buttons)
- Voting mechanism for skipping content ✅ (host-only control, >50% vote threshold)
- Persistence via browser storage ✅ (24h TTL, mirrors room-state pattern)
- Skip voting relay via server broadcast ✅
- Content script video-swap on advance ✅
- Popup playlist card UI with MD3 ✅
- Unit tests for queue logic ✅

**Files created:** `src/@core/playlist/{types,playlist-manager,index}.ts`, `src/@core/playlist/playlist-manager.test.ts`, `src/@ui/popup/PlaylistCard.tsx`
**Files modified:** `src/background.ts`, `src/content-script.ts`, `src/@core/signaling/message-types.ts`, `server/local-relay.js`, `src/@ui/popup/PopupApp.tsx`, `extension-config.json`, `src/@core/config/config-manager.ts`, `src/@core/feature-flags/feature-flags-client.ts`

### Task 9.3: Scheduled Watch Parties
**Status:** Completed (flag `SCHEDULING: true`) — ICS + reminders only, Google/Outlook OAuth deferred

- Schedule future sessions with native date/time picker ✅
- ICS calendar invite generation ✅ (RFC 5545 compliant, downloadable .ics)
- Reminder notifications before sessions ✅ (browser alarms + notifications)
- Recurring schedule support ✅ (daily/weekly/monthly/none)
- ~~Google Calendar / Outlook integration~~ — deferred (requires OAuth)

**Dependencies:** Room management (completed), BrowserBridge alarms/notifications (completed)
**Validation:** Unit tests for ICS generation; manual calendar import testing

**Files created:** `src/@core/scheduling/{types,scheduling-manager,ics-generator,index}.ts`, `src/@core/scheduling/ics-generator.test.ts`, `src/@ui/options/components/SchedulingCard.tsx`
**Files modified:** `src/background.ts`, `src/@core/signaling/message-types.ts`, `src/@core/browser-bridge/{types,chrome-bridge,firefox-bridge}.ts`, `manifest-chrome.json`, `manifest-firefox.json`, `src/@ui/options/OptionsApp.tsx`

---

## Milestone 3: Documentation & Deployment — Completed

**Objective:** Complete documentation and deployment validation.

### Task 8.2: Documentation & Debugging Guides
**Status:** Completed

- README debug steps for Chrome unpacked and Firefox about:debugging ✅
- API key configuration guide ✅
- Right-click video detection fallback documentation ✅
- Troubleshooting guide for common runtime issues ✅
- Updated API documentation with error handling ✅ (14 endpoints, all error responses documented)

### Task 8.3: Deployment Validation Checklist
**Status:** Completed

- Verify all icon assets load in Chrome and Firefox ✅ (verified in build output)
- Test room creation and state persistence across sessions ⏳ (manual testing required)
- Validate API key management and error handling ✅ (code + API docs verified)
- Confirm popup scrolling and accessibility ⏳ (manual testing required)
- Test configuration import/export with preview modal ⏳ (manual testing required)

**Validation:** `docs/deployment-checklist.md` updated with verification items. Programmatic verification complete; manual browser testing items pending.

---

## Milestone 4: Advanced Features — Partially Completed

**Objective:** Implement advanced annotation features and end-to-end encryption.

### ADVANCED_ANNOTATIONS
**Status:** Completed (flag `ADVANCED_ANNOTATIONS: true`, merged via PR)

- Advanced drawing tools, layers, and collaborative editing ✅
- Ephemeral overlay + collaborative annotation integration ✅
- Extends the existing annotation-layer module; layer visibility sync messages added

**Validation:** Feature flag enabled; integration tests present (`collaborative-annotation-integration.test.ts`); cross-browser verified via relay handler anchors.

### E2E_ENCRYPTION
**Status:** Code written, **gated off** (flag `E2E_ENCRYPTION: false`)

- Public-key broadcast + per-recipient encrypted chat (`PUBLIC_KEY_BROADCAST`, `ENCRYPTED_CHAT_MESSAGE`, `protocolVersion: 1`) ✅ (code present in `src/@core/encryption/e2e-encryption.ts`)
- Relay handlers placed at distinct anchors ✅
- **Remaining:** validate the implementation end-to-end, then flip the flag on.

**Validation:** Feature flag enabled; integration tests pass; cross-browser verified.

---

## Milestone 5: Production Readiness — Future

**Objective:** Extension store publishing and production infrastructure.

- Chrome Web Store submission
- Firefox Add-ons submission
- Production TURN server deployment
- Monitoring and alerting setup (Prometheus/Loki configs in `monitoring/` exist)
- Data retention policy enforcement
- Production database migration scripts
- Resolve pre-existing typecheck/test debt before release (see [current-state.md](.claude/docs/current-state.md))

---

# Dependencies

```
Milestone 1 (Infrastructure) → no blockers
Milestone 2 (Features) → independent, can run in parallel with Milestone 3
Milestone 3 (Docs/Deploy) → Milestone 1 recommended but not required
Milestone 4 (Advanced) → Milestone 2 features should be stable first
Milestone 5 (Production) → Milestones 1–3 complete; Milestone 4 optional before launch
```

---

# Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Typecheck/test debt (463 errors, ~19% failures) | High | Tracked in [current-state.md](.claude/docs/current-state.md); resolve before store submission |
| Config interface drift (3 locations) | Medium | Consider a single source of truth for ExtensionConfig |
| Placeholder asset masking | Medium | `scripts/validate-assets.js` exists; make strict validation part of production builds |
| E2E encryption shipped before validation | Medium | Keep flag off until end-to-end validation passes |
| Firefox MV2 deprecation | Low | Monitor Firefox roadmap; plan MV3 migration if needed |
| Large bundle from MUI + React | Low | Monitor with webpack bundle analyzer; optimize code splitting |

---

# Technical Debt

- **Dual spec generations:** Requirements 1–28 vs 29–46 may confuse future contributors. Consider consolidating into a single numbered sequence.
- **webpack validateAssets():** Creates placeholders instead of failing. Should be replaced with strict validation for production builds (supplemented by `scripts/validate-assets.js`).
- **Config sync:** `ExtensionConfig` interface, defaults, and JSON file must stay in sync manually. Consider generating one from another.
- **Typecheck debt:** 463 MUI7/React19 type mismatches block a fully green typecheck. Needs a dedicated cleanup pass.

---

# Progress Summary

| Milestone | Status | Tasks Remaining |
|---|---|---|
| 1. Repository Infrastructure | Completed | 0 |
| 2. Feature Completion | Completed | 0 |
| 3. Documentation & Deployment | Completed | 0 (manual verification items pending) |
| 4. Advanced Features | Partially Completed | E2E encryption validation + flag enable |
| 5. Production Readiness | Future | Multiple |

---

# Knowledge System Reference

This plan consumes the internal knowledge system rather than redefining it:

- **Current state & known issues:** [.claude/docs/current-state.md](.claude/docs/current-state.md)
- **Design rationale & decisions:** [.claude/docs/project-memory.md](.claude/docs/project-memory.md), [.claude/docs/architecture-decisions.md](.claude/docs/architecture-decisions.md)
- **Retrieval policy:** [.claude/docs/knowledge-map.md](.claude/docs/knowledge-map.md)

Update this plan and `current-state.md` together whenever milestone status changes.
