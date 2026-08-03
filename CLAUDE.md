# CLAUDE.md — Repository Operating Manual

> Entry point for AI-assisted development. Describes how to work within this repository, where knowledge lives, and how to restore context.

---

# Repository Overview

**AnywhereParty** (package name `watch-party-extension`) is a cross-browser (Chrome MV3 + Firefox MV2) browser extension for synchronized video viewing with voice chat, text chat, reactions, collaborative annotations, subtitles, avatars, playlists, and scheduling. It includes a Node.js WebSocket signaling server (`server/`) for development and production.

**Stack:** TypeScript strict, React 19, MUI 7 (Material Design 3), Webpack 5, Tailwind CSS 4, PostCSS, Vitest, Stryker, ESLint, Prettier, husky + commitlint. Remote: `https://github.com/XDHx86/Anywhere-Party.git` (branch `main`).

---

# Commands

All commands run from the repository root (`d:\Projos\AnywhereParty`).

## Build

```bash
npm run build              # Build for Chrome + Firefox (production)
npm run build:chrome       # Build Chrome only
npm run build:firefox      # Build Firefox only
npm run build:dev          # Build dev mode for both browsers
npm run build:dev:chrome   # Build dev mode, Chrome only
npm run build:dev:firefox  # Build dev mode, Firefox only
```

## Development

```bash
npm run watch              # Watch mode for Chrome (development)
npm run watch:firefox      # Watch mode for Firefox (development)
npm run dev:full           # Start server + watch (Chrome) concurrently
npm run dev:setup          # Install all dependencies
```

## Testing

```bash
npm run test               # Run all Vitest unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with V8 coverage report
npm run test:mutation      # Run Stryker mutation tests
npm run test:runtime-fixes # Validate runtime fix implementations
```

## Linting & Formatting

```bash
npm run lint               # ESLint on src/**/*.ts
npm run lint:fix           # ESLint with auto-fix
npm run format             # Prettier write
npm run format:check       # Prettier check
npm run typecheck          # TypeScript type checking (no emit)
```

## Server

```bash
npm run server:install     # Install server dependencies
npm run server:dev         # Start dev server (nodemon)
npm run server:start       # Start production server
npm run server:test        # Run server tests
```

---

# Architecture

Three-layer message-passing architecture:

```
┌─────────────────────────────────────┐
│  UI Pages (popup, options)          │  React + MUI 7
│  Communicate via runtime.sendMessage│  Entry: popup-react.tsx, options-react.tsx
├─────────────────────────────────────┤
│  Background Service Worker          │  background.ts (~2,200 lines)
│  Owns: all core managers            │  Dispatches ~60 message types
│  Survives popup close/open          │
├─────────────────────────────────────┤
│  Content Script                     │  content-script.ts (~1,200 lines)
│  Owns: video detection, overlays,   │  Injected into every page
│  subtitles, annotations, avatars    │
└─────────────────────────────────────┘
```

**Core modules** (`src/@core/`, 28 modules): sync-engine, signaling, video-detector, webrtc-voice, chat, subtitle-engine, annotation-layer, collaboration, avatar-overlay, reaction-overlay, room-creation, room-state, playlist, scheduling, browser-bridge, config, api-keys, api-error-handling, auth, encryption, privacy, feature-flags, participant-manager, logging, monitoring, performance, accessibility, cross-browser.

**UI layer** (`src/@ui/`): popup, options, components (cards, chat, overlays, annotation, voice, enhanced-ux, transitions), theme, assets, animations, hooks, styles, services, utils, monitoring, optimization, integration, accessibility.

**Server** (`server/`): WebSocket relay (`local-relay.js`), room manager (`room-manager.js`), feature flags server (`feature-flags-server.js`), Docker Compose for production, Prometheus/Loki monitoring, nginx.

---

# CodeGraph

CodeGraph is initialized and indexed (`.codegraph/`, daemon running). Use `codegraph_explore` as the **primary** tool for:
- Symbol lookup and exploration
- Architecture discovery
- Dependency analysis
- Impact analysis

Query with `projectPath: "D:/Projos/AnywhereParty"`. Manual Grep/Glob/Read is fallback only.

---

# Documentation System

| Location | Purpose | Audience |
|---|---|---|
| `.claude/docs/` | AI project memory (internal knowledge system) | AI sessions |
| `docs/` | Contributor/user documentation | Developers |
| `plan.md` | Implementation roadmap | Developers, AI |

**Internal knowledge system** (`.claude/docs/`) — load progressively:
1. [Context Summary](.claude/docs/context-summary.md) — start here
2. [Current Project State](.claude/docs/current-state.md) — active work
3. [Project Memory](.claude/docs/project-memory.md) — long-term knowledge
4. [Architectural Decisions](.claude/docs/architecture-decisions.md) — reasoning
5. [Implementation Plan](plan.md) — future work
6. [Troubleshooting Guide](.claude/docs/troubleshooting.md) — operational issues

See [Knowledge Map](.claude/docs/knowledge-map.md) for the full retrieval policy, [Governance](.claude/docs/governance.md) for how to maintain the knowledge system, and [Context Compression](.claude/docs/context-compression.md) for context management.

---

# Repository Conventions

- **TypeScript strict mode** — always. No `any` without documented justification.
- **Module structure** — each `@core` module: `index.ts` (public API), `types.ts`, implementation, `*.test.ts`.
- **Message types** — shared via `src/@core/signaling/message-types.ts`. Both background and content script maintain handler maps.
- **Cross-browser** — all storage/runtime/tabs access goes through `BrowserBridge`. Never use `chrome.*` or `browser.*` directly.
- **Feature flags** — incomplete features are gated by flags in `extension-config.json`. Do not enable flags for incomplete work. Currently: all flags `true` except `E2E_ENCRYPTION` (code written, gated off).
- **No hardcoded API keys** — all external keys are user-managed through the Options page.
- **Conventional commits** — enforced by commitlint and husky.

---

# Context Restoration

After context loss, restore in this order:

1. Read this `CLAUDE.md`
2. Read `.claude/docs/context-summary.md`
3. Read `.claude/docs/current-state.md`
4. Read `.claude/docs/project-memory.md` if architectural understanding is needed
5. Use CodeGraph for code exploration
6. Load additional documentation only when required

---

# Development Workflow

1. Read `.claude/docs/current-state.md` to understand active work
2. Use CodeGraph to explore affected code
3. Implement changes following repository conventions
4. Run `npm run test` to verify unit tests pass
5. Run `npm run typecheck` to verify types
6. Run `npm run build:dev:chrome` to verify build
7. Load extension in Chrome/Firefox for manual testing
8. Update the knowledge system (`.claude/docs/current-state.md`, project-memory, plan.md) if architectural or state changes occurred

---

# Critical Notes

- **Git is initialized** — branch `main`, remote `github.com/XDHx86/Anywhere-Party`. CI (`ci.yml`) runs lint, format, typecheck, build, test, coverage, mutation.
- **CI typecheck/test are non-blocking** — 463 pre-existing MUI7/React19 type mismatches; ~19% unit-test failures are timing-sensitive / Node 24 jsdom incompatibility. CI runs Node 18.
- **webpack auto-creates placeholder assets** — missing assets produce warnings, not errors. Check build output carefully.
- **Firefox uses MV2** — `manifest-firefox.json` uses `manifest_version: 2`. Chrome uses MV3.
- **Two spec generations** — requirements 1–28 are core features; 29–46 are runtime fixes. Code comments reference both numbering schemes.
