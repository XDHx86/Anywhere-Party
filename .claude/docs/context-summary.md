# Context Summary

> Entry point into the repository's knowledge system. Restore high-level context here first; expand only as required.

---

# Repository Overview

**AnywhereParty** (`watch-party-extension`) is a cross-browser browser extension that enables synchronized video viewing with friends — "watch parties." Users create rooms, control shared playback, chat, share reactions, annotate together, and optionally talk via WebRTC voice. It runs on **Chrome (Manifest V3)** and **Firefox (WebExtensions / MV2)** from a single TypeScript codebase, with a Node.js WebSocket signaling server for development and production.

**Intended users:** Consumers who want shared video experiences; developers building and maintaining the extension.

**Maturity:** Functional prototype with comprehensive feature coverage. Core sync, chat, voice, annotations, subtitles, avatars, and a Material Design 3 UI are implemented and tested. Not yet published to any extension store. No git repository is initialized.

---

# Current Status

All runtime bug fixes (requirements 29–46) are complete and passing. Material Design 3 UI integration is complete and passing. WebRTC voice, collaborative annotations, and subtitle error handling are implemented.

**Remaining planned work:**
- Playlist management (feature flag `PLAYLISTS: false`)
- Scheduled watch parties (feature flag `SCHEDULING: false`)
- Deployment validation checklist
- Documentation and debugging guide updates

---

# Architecture Snapshot

Three-layer message architecture:

1. **Background service worker** (`background.ts`, ~2,200 lines) — orchestration hub. Owns all core managers. Dispatches ~60 message types via `chrome.runtime.onMessage`.
2. **Content script** (`content-script.ts`, ~1,200 lines) — injected into every page. Owns video detection, overlays, subtitles, annotations, avatars. Communicates with background via message passing.
3. **UI pages** — React apps for popup and options. Communicate with background via `runtime.sendMessage`. Each has a plain-JS fallback.

Core modules live under `src/@core/` (~20 modules). UI components under `src/@ui/`. Server under `server/`. Webpack builds per-browser to `dist/chrome` and `dist/firefox`.

**Primary technologies:** TypeScript (strict), React 19, MUI 7, Tailwind CSS 4, Emotion, webpack 5, Vitest, Node.js (`ws`).

---

# Knowledge Overview

| Document | Purpose |
|---|---|
| **Context Summary** | This file — repository orientation |
| **Current Project State** | Active development, blockers, next steps |
| **Project Memory** | Long-term architectural knowledge, conventions, lessons |
| **Architectural Decisions** | Why significant technical decisions were made |
| **Implementation Plan** | Roadmap for remaining work |
| **Troubleshooting Guide** | Recurring operational issues and resolutions |
| **Knowledge Map** | Retrieval policy — what to load and when |
| **Repository Profile** | Stable identity metadata |
| **Governance** | How the documentation system is maintained |
| **Compression Policy** | How knowledge is refined over time |

All internal documents live at `.claude/docs/`. Contributor-facing documentation lives at `docs/`.

---

# Active Priorities

1. Enable playlist management (`PLAYLISTS` feature flag)
2. Implement scheduled watch parties
3. Complete deployment validation
4. Initialize git and establish version control

---

# Repository Health

- **Implementation maturity:** Core features implemented and tested; 262 source files, 61 test files.
- **Testing maturity:** Vitest unit + integration tests, Stryker mutation testing, cross-browser manual runbook. CI pipeline defined (`.github/workflows/ci.yml`) but not yet operational (no git).
- **Documentation maturity:** Comprehensive specs in `.kiro/specs/`; good public docs in `docs/`. Root-level summary MDs are ephemeral and contain stale fix-history; these should be cleaned up.
- **Architectural stability:** Stable three-layer architecture with clean separation between `@core`, `@ui`, and `server/`.

---

# Context Expansion

If additional understanding is required, continue in this order:

1. [Current Project State](current-state.md)
2. [Project Memory](project-memory.md)
3. [Architectural Decisions](architecture-decisions.md)
4. [Implementation Plan](../../plan.md)
5. [Troubleshooting Guide](troubleshooting.md)
6. Additional documentation as required

Only expand context when necessary.
