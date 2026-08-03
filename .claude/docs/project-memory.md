# Project Memory

> Durable knowledge about how this repository works and why. This is the *why* behind the code — for *what* the code does, prefer CodeGraph over this file. Last updated: 2026-08-04.

## Design invariants

- **Three-layer message passing.** UI pages (popup/options) talk to the background service worker via `runtime.sendMessage`; the worker owns core managers and survives popup close/open; the content script owns everything page-scoped (video detection, overlays, subtitles, annotations, avatars). This split keeps state consistent when the popup closes.
- **One message-type source of truth.** Every client↔server and internal message is a typed interface in `src/@core/signaling/message-types.ts`. Both background and content script keep handler maps keyed by message `type`. Adding a message type means updating the union types and both handler maps — check for the `// ───` section separators in that file.
- **Cross-browser via `BrowserBridge`.** All storage, runtime, and tabs access goes through `src/@core/browser-bridge/` (`chrome-bridge.ts`, `firefox-bridge.ts`, `types.ts`). The browser-specific polyfill shim is selected by build. Never call `chrome.*`/`browser.*` directly in feature code.
- **Feature-flag gating.** Incomplete features are written behind flags in `extension-config.json` and read via `@core/feature-flags` / `@core/config`. Flags for incomplete work stay off — flipping them on is a release decision.
- **Firefox MV2 / Chrome MV3.** Dual manifests (`manifest-firefox.json` = MV2, `manifest-chrome.json` = MV3) and separate webpack builds produce `dist/firefox` and `dist/chrome`. Firefox is on MV2, so anything MV3-only (e.g. service-worker-only APIs) needs an MV2 path.

## Module map (highlights)

| Module (`src/@core/…`) | Responsibility |
|---|---|
| `sync-engine` | Playback synchronization, drift analysis |
| `signaling` | WebSocket client, message validation, reconnect, heartbeat |
| `webrtc-voice` | Voice chat over WebRTC, STUN/TURN |
| `video-detector` | Page video detection + right-click fallback |
| `subtitle-engine` | Multi-language subtitles (OpenSubtitles API) |
| `annotation-layer` | Collaborative annotations (drawing, layers, ephemeral overlay) |
| `playlist` | Shared queue, auto-advance, skip voting, 24h TTL persistence |
| `scheduling` | Scheduled sessions, ICS generation, reminders |
| `encryption` | E2E encryption protocol (Milestone 4, flag off) |
| `collaboration` | Shared collaboration state |
| `avatar-overlay` / `reaction-overlay` | Overlay systems |
| `room-creation` / `room-state` | Room lifecycle + persistence |
| `browser-bridge` | Cross-browser API abstraction |
| `privacy` / `monitoring` / `performance` | Cross-cutting concerns |

## Server knowledge

- `server/local-relay.js` — WebSocket relay with handler anchors; annotation/encryption handlers are placed at distinct anchors so they can be extended independently.
- `server/room-manager.js` — room lifecycle, participant tracking, host transfer, kick.
- `server/feature-flags-server.js` + `server/feature-flags.js` — remote feature-flag server.
- Production deployment uses Docker Compose (`docker-compose.yml`, `docker-compose.prod.yml`) with nginx and Prometheus/Loki monitoring (`monitoring/`).

## Historical context

- **Two spec generations.** Requirements 1–28 = core features; 29–46 = runtime fixes. Code comments reference both numbering schemes. Runtime fixes addressed: icon loading, room-state persistence, API key management, video detection fallback, subtitle error handling, popup scrolling.
- **Repo history.** Git initialized during Milestone 1 (first commit `2826ffc`). Milestone 4 work (advanced annotations, E2E encryption, security hardening) merged via PRs. Git history is the authoritative record of *what changed*; this file records *why*.
