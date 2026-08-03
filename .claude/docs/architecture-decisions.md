# Architectural Decisions

> Recorded decisions with rationale. When a design decision is in question, look here first; if the decision isn't recorded, add it. Last updated: 2026-08-04.

---

## ADR-001: Three-layer message-passing architecture

**Status:** Adopted (M1)
**Context:** Popup UI closes on blur; state held only in the popup would be lost.
**Decision:** UI pages → background service worker → content script, communicating over `runtime.sendMessage` and typed message unions.
**Consequences:** The worker is the state owner and survives popup close. Messages must be typed and handler maps kept in sync. See [project-memory.md](project-memory.md).

## ADR-002: BrowserBridge abstraction for cross-browser APIs

**Status:** Adopted
**Context:** Chrome MV3 and Firefox MV2 expose different APIs and behaviors.
**Decision:** All storage/runtime/tabs access goes through `src/@core/browser-bridge/`, which selects the right implementation per build.
**Consequences:** Feature code never touches `chrome.*`/`browser.*` directly, keeping MV3/MV2 differences localized. Any new browser API access must be routed through the bridge.

## ADR-003: Feature-flag gating for incomplete features

**Status:** Adopted
**Context:** Features ship incrementally; enabling incomplete work would break users.
**Decision:** Incomplete features are written behind flags in `extension-config.json` and read via `@core/config` / `@core/feature-flags`. Flags stay off until the feature is validated.
**Consequences:** `ADVANCED_ANNOTATIONS` shipped on; `E2E_ENCRYPTION` is written but off pending validation.

## ADR-004: Node.js WebSocket relay for signaling

**Status:** Adopted
**Context:** Need a lightweight signaling layer for sync/chat/voice coordination without a heavy backend.
**Decision:** A small `ws`-based relay (`server/local-relay.js`) plus a room manager and feature-flags server, deployable via Docker.
**Consequences:** Simple, auditable relay; room state lives in the server process (not persisted) — persistence is handled client-side via browser storage.

## ADR-005: Material Design 3 (MUI 7) for UI

**Status:** Adopted
**Context:** UI grew from HTML/CSS; needed a consistent, accessible, themeable system.
**Decision:** Migrate UI to React + MUI 7 following Material Design 3 (see `docs/material-design-3-*.md`).
**Consequences:** Improved consistency/accessibility; introduced the MUI7-vs-React19 type mismatch that causes 463 non-blocking typecheck errors.

## ADR-006: E2E encryption protocol (gated)

**Status:** Adopted, feature gated off
**Context:** Chat should be private even though it relays through the server.
**Decision:** Public-key broadcast + per-recipient encrypted chat messages (`PUBLIC_KEY_BROADCAST`, `ENCRYPTED_CHAT_MESSAGE` with `protocolVersion: 1`), implemented in `src/@core/encryption/e2e-encryption.ts`.
**Consequences:** Server is a dumb relay for encrypted traffic. Protocol versioning baked into message types. Flag off until validation completes.

## ADR-007: CI non-blocking typecheck/test (pre-existing debt)

**Status:** Adopted
**Context:** Pre-existing MUI7/React19 type errors and Node-24 jsdom test failures blocked green CI.
**Decision:** CI runs typecheck and tests with `continue-on-error: true`; Node 18 pinned for CI. `ts-loader` uses `transpileOnly` (types checked by the separate `typecheck` step).
**Consequences:** CI stays green; the debt is documented in [current-state.md](current-state.md) and must be resolved before Milestone 5.

## ADR-008: OpenSubtitles API for subtitles

**Status:** Adopted
**Context:** Need multi-language subtitle lookup with graceful failure when no API key is set.
**Decision:** Subtitle engine integrates OpenSubtitles; API keys are user-managed (never hardcoded), with graceful error handling when missing.
**Consequences:** Subtitle feature is opt-in and key-dependent; documented in `docs/api.md` and the Options page.

## ADR-009: Playlist persistence with 24h TTL

**Status:** Adopted
**Context:** Shared queue state must survive popup close but not persist forever.
**Decision:** Playlist state persisted via browser storage with a 24h TTL, mirroring the room-state persistence pattern.
**Consequences:** Consistent storage idiom across room-state/playlist; TTL bounds stale data.

## ADR-010: Dual manifests — Chrome MV3, Firefox MV2

**Status:** Adopted
**Context:** Chrome requires MV3; Firefox manifest was MV2.
**Decision:** Separate `manifest-chrome.json` (MV3) and `manifest-firefox.json` (MV2), built independently by webpack into `dist/chrome` and `dist/firefox`.
**Consequences:** Firefox features limited to MV2 capabilities. Track Firefox MV3 roadmap for a future migration.
