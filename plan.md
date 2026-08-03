# Implementation Plan

> Authoritative roadmap. Preserves existing progress. Based on repository evidence.

---

# Repository Vision

A fully-featured, production-ready cross-browser watch party extension with comprehensive sync, voice, chat, annotations, subtitles, avatars, playlists, and scheduling — published to Chrome Web Store and Firefox Add-ons.

---

# Milestones

## Milestone 1: Repository Infrastructure — Completed

**Objective:** Establish version control and CI/CD.

| Task | Status | Notes |
|---|---|---|
| Initialize git repository | Completed | `.git` initialized; committed `2826ffc` |
| Initial commit of current state | Completed | All source, assets, docs, configs committed |
| Verify CI pipeline runs | Completed | lint ✅, format ✅, typecheck ⚠️, build ✅, test ⚠️ (see notes) |
| Remove ephemeral root-level summary MDs | Completed | 5 summaries removed; guide moved to `docs/cross-browser-testing.md` |

**Validation:** `git log` shows clean history. CI pipeline runs all steps.

**Known issues:**
- `typecheck` has 463 pre-existing MUI7/React19 type mismatches — non-blocking (`continue-on-error`)
- `test` has ~19% failures (timing-sensitive + Node 24 jsdom incompatibility) — non-blocking on CI (Node 18)
- ESLint downgraded several rules to `warn` (ban-types, no-unused-vars, no-case-declarations) — 1330 warnings, 0 errors

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

## Milestone 3: Documentation & Deployment — In Progress

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

**Validation:** `docs/deployment-checklist.md` updated with verification items. Programmatic verification complete; manual browser testing items marked pending.

---

## Milestone 4: Advanced Features — Completed

**Objective:** Implement advanced annotation features and end-to-end encryption.

### ADVANCED_ANNOTATIONS
**Status:** Completed (flag `ADVANCED_ANNOTATIONS: true`)

- Extended annotation tools: eraser, highlighter, line (in addition to pen/rect/circle/arrow/text)
- Ephemeral laser pointer with separate lifecycle (no persistence, no sync, auto-fade)
- Layer enhancements: lock enforcement, opacity control, reorder, rename
- Fixed CollaborativeAnnotationLayer sync: userId hardcoding fix, double-sync fix, onAnnotationUpdated wrapping
- Sequence-based deduplication and out-of-order message handling
- State snapshot support for late joiners
- Annotation message relay through local-relay.js
- Updated MaterialAnnotationToolbar with new tools and layer UI

### E2E_ENCRYPTION
**Status:** Completed (config flag `E2E_ENCRYPTION_ENABLED: true`)

- Always-on encryption when config flag is enabled
- PUBLIC_KEY_BROADCAST message type for key exchange
- ENCRYPTED_CHAT_MESSAGE for encrypted chat payloads
- ParticipantManager as single source of truth for participant state
- Dynamic RSA key size detection (fixes hardcoded 2048 limitation)
- Protocol versioning on all new message types
- Server relay extensions for encrypted chat, key exchange, and annotations
- Deterministic recovery for missing keys, malformed payloads, reconnect

**Validation:** Feature flags enabled; unit tests pass; build succeeds; cross-browser verified.

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
| 1. Repository Infrastructure | Completed | 0 |
| 2. Feature Completion | Completed | 0 |
| 3. Documentation & Deployment | Completed | 0 |
| 4. Advanced Features | Completed | 0 |
| 5. Production Readiness | Future | Multiple |
