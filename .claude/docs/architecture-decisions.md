# Architectural Decisions

> Preserves the reasoning behind significant architectural decisions. Explains **why** the repository is designed the way it is.

---

## Decision 1: Three-Layer Message-Passing Architecture

**Problem:** A browser extension needs to coordinate state between a background process, injected page scripts, and popup/options UIs — each with different lifecycles and APIs.

**Decision:** Three-layer architecture with `chrome.runtime.onMessage` as the communication backbone. Background service worker owns all core managers; content script owns page-level features; UI pages communicate only through messages.

**Rationale:** This matches the browser extension's natural process boundaries. Background scripts survive popup close/open. Content scripts can access the DOM. UI pages are ephemeral. Message passing is the only reliable cross-boundary communication in both Chrome MV3 and Firefox MV2.

**Trade-offs:**
- (+) Natural process isolation; popup close doesn't kill active features
- (+) Clean separation of concerns
- (-) Message serialization overhead
- (-) Message handler maps must be maintained in sync across background and content script

**Reconsider when:** WebExtension APIs change significantly, or a migration to a framework like WXT that abstracts these boundaries becomes worthwhile.

---

## Decision 2: Cross-Browser Bridge Abstraction

**Problem:** Chrome MV3 and Firefox MV2 have different APIs for storage, runtime messaging, tabs, and permissions. Maintaining separate code paths would double maintenance.

**Decision:** `BrowserBridge` interface in `src/@core/browser-bridge/types.ts` with `chrome-bridge.ts` (Chrome callback → Promise wrapping) and `firefox-bridge.ts` (`webextension-polyfill`). Factory function `createBrowserBridge()` selects implementation via UA detection.

**Rationale:** Single codebase for both browsers. Platform differences are isolated to the bridge layer. Tests use `mock-browser-bridge.ts`.

**Trade-offs:**
- (+) Single source of truth for feature code
- (+) Platform differences contained and testable
- (-) Bridge abstraction must stay current with both browsers' API evolution
- (-) Some Chrome-only features need explicit capability checks

**Reconsider when:** Only one browser needs to be supported, or the extension migrates to a framework that abstracts this natively.

---

## Decision 3: Local Asset Bundling (No CDN)

**Problem:** Browser extensions using external CDNs for icons and fonts can fail offline, violate Content Security Policy, and expose users to third-party risks.

**Decision:** All icons (SVG sprites, Font Awesome), fonts, and visual assets are bundled locally under `assets/`. SVG sprite fallbacks load when icon fonts fail.

**Rationale:** Extensions must work offline. CSP enforcement in Chrome MV3 blocks remote fonts. Local assets guarantee availability.

**Trade-offs:**
- (+) Offline reliability, CSP compliance, no third-party dependency
- (+) Faster loading (no network requests)
- (-) Larger extension bundle size
- (-) Manual asset management required

**Reconsider when:** Asset bundle size becomes a measurable UX problem, or a browser-native asset optimization system becomes available.

---

## Decision 4: Feature Flags for Incomplete Work

**Problem:** Multiple features are in various stages of completion. Shipping unfinished features or requiring constant code toggling is error-prone.

**Decision:** Feature flags defined in `extension-config.json` gate incomplete features (currently: `PLAYLISTS`, `SCHEDULING`, `ADVANCED_ANNOTATIONS`, `E2E_ENCRYPTION`). Server-side flags are also supported via `feature-flags.js`.

**Rationale:** Enables incremental delivery without risk. Features can be developed behind flags and enabled independently. Server-side flags allow runtime toggling without extension updates.

**Trade-offs:**
- (+) Safe incremental development
- (+) A/B testing capability
- (-) Flag complexity grows with number of features
- (-) Flag cleanup is required after features are stable

**Reconsider when:** All flags are resolved and removed, or a more sophisticated feature management system is needed.

---

## Decision 5: Layered Configuration System

**Problem:** Different environments (local dev, staging, production) need different configuration. Users should be able to override defaults without code changes.

**Decision:** Four-layer configuration precedence: runtime overrides (`storage.local`) > local dev config (`extension-config.local.json`) > defaults (`extension-config.json`) > hardcoded fallbacks. Options page provides full UI for all settings. Import/export supports JSON, ENV, and INI formats.

**Rationale:** Covers all use cases from developer to end-user. Local dev config stays out of version control. Hardcoded fallbacks ensure the extension works with zero configuration.

**Trade-offs:**
- (+) Flexible configuration for all environments
- (+) User-friendly Options page for non-developers
- (-) Four layers creates complexity in determining effective config
- (-) `ExtensionConfig` interface must be kept in sync across three locations

**Reconsider when:** Configuration complexity exceeds what the Options page can cleanly present.

---

## Decision 6: React + MUI for Extension UI

**Problem:** The extension needs a modern, accessible, consistent UI across popup, options, and overlay interfaces.

**Decision:** React 19 for component model. MUI 7 (Material Design 3) for component library. Emotion for CSS-in-JS styling. Tailwind CSS 4 configured for utility classes. Each UI page (popup, options) has both a React entry point and a plain-JS fallback for environments where React fails to load.

**Rationale:** MUI provides production-ready Material Design 3 components with built-in accessibility. React's component model scales well for complex UIs. Fallback scripts handle extension loading failures gracefully.

**Trade-offs:**
- (+) Professional, accessible UI out of the box
- (+) Component reuse across popup, options, and overlays
- (-) Larger bundle due to MUI + React dependencies
- (-) Code splitting needed to keep popup fast
- (-) MUI + Tailwind dual styling system requires discipline

**Reconsider when:** Bundle size budgets are exceeded, or a lighter UI framework becomes preferable.
