# Project Memory

> Long-term semantic memory. Preserves knowledge that must survive implementation changes and contributor turnover.

---

# Architectural Invariants

- **Three-layer architecture:** Background service worker ↔ Content script ↔ UI pages, connected by browser message passing. Background owns core managers; content script owns page-level features; UI communicates only through messages.
- **@core / @ui separation:** All business logic lives in `src/@core/`. All UI lives in `src/@ui/`. `@core` never imports from `@ui`; `@ui` imports from `@core` through its public index files.
- **Cross-browser via abstraction:** `src/@core/browser-bridge/` provides a `BrowserBridge` interface with Chrome and Firefox implementations. All storage, runtime, and tab API access goes through this bridge. Feature detection (`isChrome`/`isFirefox`) handles platform differences.
- **Feature flags control incomplete work:** Feature flags in `extension-config.json` gate features not yet ready for use. Code for flagged features exists but is conditionally activated.
- **Config layering:** Runtime overrides (`storage.local`) > local dev config (`extension-config.local.json`) > defaults (`extension-config.json`) > hardcoded fallbacks in `getHardcodedDefaults()`.

---

# Long-Term Assumptions

- **Target platforms:** Chrome 88+ (MV3), Firefox 91+ (MV2). The extension must work on both with full feature parity where possible.
- **Offline-first assets:** All icons, fonts, and visual assets are bundled locally. No CDN dependencies. SVG sprite fallbacks when icon fonts fail.
- **No external API keys in code:** API keys (e.g., OpenSubtitles) are user-managed through the Options page and stored in `browser.storage.local`. Hardcoded keys are a security violation.
- **WebRTC requires TURN:** STUN-only fails on restrictive NATs. TURN server configuration is required for reliable voice chat.
- **Signaling server:** WebSocket-based, handles room state, participant connections, sync messages. Local dev uses in-memory relay; production uses PostgreSQL + Redis.

---

# Repository Conventions

- **Module structure:** Each `@core` module has its own directory with `index.ts` (public API), `types.ts` (interfaces), implementation files, and `*.test.ts` files. This pattern is consistent across all ~20 modules.
- **Message types:** Both background and content script define their own message handler maps. Message type strings are shared via `src/@core/signaling/message-types.ts`.
- **React components:** UI uses React 19 with MUI 7 (`@mui/material`). Components use Emotion for styling. Tailwind CSS 4 is configured but MUI is the primary component library.
- **Testing:** Vitest with jsdom environment, `@testing-library/react` for component tests. Test files live alongside source files (`*.test.ts` / `*.test.tsx`).
- **Build variants:** `webpack --env browser=chrome|firefox` selects the manifest and output directory. Same codebase, different manifests.
- **Conventional commits:** `commitlint.config.js` enforces conventional commit messages. Husky + lint-staged run ESLint and Prettier on staged files.

---

# Recurring Lessons

- **Firefox quirks are first-class:** Firefox requires tuned WebSocket reconnection timing, `webextension-polyfill` for API compatibility, and MV2-specific manifest handling. Firefox paths are not secondary — they are parallel.
- **webpack asset validation masks failures:** The `validateAssets()` function in `webpack.config.js` creates placeholder assets for missing files rather than failing the build. This makes missing-asset bugs invisible until runtime.
- **Two spec generations:** The original spec (requirements 1–28) covers core features. The runtime-fix spec (requirements 29–46) layers bug fixes on top. Code comments reference both numbering schemes. Treat requirements 29–46 as a separate "runtime fix" layer.

---

# External Constraints

- **Chrome MV3 restrictions:** Service workers cannot use `window` global; background script must be self-contained. `chrome.runtime` APIs only available in extension context (not in regular web pages).
- **Cross-origin iframes:** Annotation overlay injection fails in cross-origin iframes. The extension displays "overlay unavailable" guidance instead.
- **Browser storage limits:** `chrome.storage.local` has size limits. Room state and API keys share this storage. Large data (playlists, chat history) should be mindful of quotas.
