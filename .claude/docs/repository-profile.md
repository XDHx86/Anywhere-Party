# Repository Profile

> Stable, foundational identity. Changes only when the repository's fundamental nature changes.

---

# Repository Identity

- **Name:** AnywhereParty (npm: `watch-party-extension`)
- **Type:** Cross-browser browser extension with backend services
- **Purpose:** Enable synchronized video viewing experiences with friends across any website
- **Users:** Consumers wanting shared video playback; developers building and maintaining the extension
- **Scope:** Browser extension (Chrome + Firefox), WebSocket signaling server, documentation

---

# Technology Profile

| Category | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| UI Framework | React 19, MUI 7 (`@mui/material`), Emotion, Tailwind CSS 4 |
| Build System | webpack 5, ts-loader, copy-webpack-plugin |
| Testing | Vitest (jsdom), @testing-library/react, Stryker (mutation) |
| Linting | ESLint, Prettier, commitlint (conventional commits) |
| Server | Node.js, `ws` (WebSocket), `uuid` |
| Package Manager | npm |
| Runtime Targets | Chrome 88+ (MV3), Firefox 91+ (MV2) |
| CI/CD | GitHub Actions (lint → typecheck → build → test → coverage → mutation) |

---

# Architectural Profile

- **Architecture style:** Three-layer message-passing architecture
- **Organization:** Monorepo with `@core` (business logic), `@ui` (interface), and `server/` (backend)
- **Major subsystems:** Sync engine, signaling client, video detector, WebRTC voice, chat, subtitles, annotations, avatars, config, monitoring
- **Deployment model:** Browser extension sideloaded (Chrome unpacked / Firefox temporary add-on); server via Docker Compose

---

# Development Profile

- **Methodology:** Specification-driven (`.kiro/specs/`), feature-flag gated
- **Testing philosophy:** Unit tests alongside source, integration test suite, mutation testing on main, cross-browser manual validation
- **Documentation philosophy:** Specs define requirements; `docs/` provides contributor guides; `.claude/docs/` holds AI project memory
- **Release strategy:** Not yet published to extension stores; distribution via manual sideloading

---

# External Dependencies

- **WebRTC:** Peer-to-peer audio via STUN/TURN servers
- **OpenSubtitles API:** Optional subtitle lookup (user-managed API key)
- **Docker:** Development and production server environment (PostgreSQL, Redis)

---

# Repository Boundaries

**Owns:**
- Browser extension code (popup, options, background, content script)
- Core business logic modules
- Material Design 3 UI components
- WebSocket signaling client
- Configuration management
- Testing and validation scripts

**Does not own:**
- Production infrastructure (PostgreSQL, Redis, TURN servers) — configured externally
- Extension store publishing — not yet set up
- Content/script injection into web pages beyond the extension's own scope
