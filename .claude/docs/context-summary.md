# Context Summary

> Start here. One page to re-establish what this repository is and how to work in it. Last updated: 2026-08-04.

## What is this?

**AnywhereParty** — a cross-browser (Chrome MV3, Firefox MV2) browser extension for synchronized video viewing with voice chat, text chat, reactions, collaborative annotations, subtitles, avatars, playlists, and scheduled watch parties. Ships with a Node.js WebSocket signaling server.

## Stack

- TypeScript **strict**, React 19, MUI 7 (Material Design 3), Webpack 5, Tailwind 4, Vitest, Stryker, ESLint, Prettier, husky/commitlint.
- Node.js `ws` relay + room manager in `server/`.

## Shape of the code

- `src/@core/` — 28 feature modules (sync, signaling, voice, chat, subtitles, annotations, avatars, playlists, scheduling, encryption, config, browser-bridge, …). Each: `index.ts` (public API), `types.ts`, implementation, `*.test.ts`.
- `src/background.ts` (~2,200 lines) — service worker, owns core managers, dispatches ~60 message types.
- `src/content-script.ts` (~1,200 lines) — video detection, overlays, subtitles, annotations, avatars.
- `src/@ui/` — React/MUI popup + options pages and components.
- `server/` — `local-relay.js` (WebSocket), `room-manager.js`, `feature-flags-server.js`.

## How work flows

1. Read [current-state.md](current-state.md) for what's happening now.
2. Query **CodeGraph** (`codegraph_explore`) before reading files manually.
3. Follow the message-passing convention: all messages typed in `src/@core/signaling/message-types.ts`.
4. Cross-browser access goes through `BrowserBridge` — never `chrome.*`/`browser.*` directly.
5. Feature flags in `extension-config.json` gate incomplete features.
6. Verify with `npm run test`, `npm run typecheck`, `npm run build:dev:chrome`.

## Current status (short)

- **Done:** Milestones 1–3; advanced annotations (M4) implemented and flag **enabled**; E2E encryption (M4) **code written but flag disabled**.
- **Known:** typecheck has 463 pre-existing MUI7/React19 errors (CI non-blocking); ~19% unit tests fail on Node 24 locally (CI runs Node 18).
- **Next:** Milestone 5 — production readiness (store submission, TURN, monitoring, retention).

See [current-state.md](current-state.md) for detail.
