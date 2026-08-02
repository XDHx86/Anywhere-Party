# Troubleshooting Guide

> Recurring operational issues, root causes, and proven resolutions.

---

## Problem: Extension fails to load in Chrome

**Root Cause:** Missing or malformed `manifest-chrome.json`, or built files missing from `dist/chrome/`.

**Resolution:**
1. Run `npm run build:chrome` (or `npm run build` for both)
2. Load `dist/chrome/` via `chrome://extensions/` → "Load unpacked" with Developer mode enabled
3. Check the extension's service worker console for errors

**Prevention:** Verify `dist/chrome/manifest.json` exists and contains correct `background.service_worker` path.

---

## Problem: Firefox extension fails to load

**Root Cause:** Incorrect manifest version or missing gecko ID.

**Resolution:**
1. Run `npm run build:firefox`
2. Load `dist/firefox/manifest.json` via `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on"
3. Check for MV2-specific issues (Firefox uses `browser_action` not `action`)

**Prevention:** Ensure `manifest-firefox.json` uses `manifest_version: 2` and includes `applications.gecko.id`.

---

## Problem: Icons fail to load

**Root Cause:** Font Awesome or SVG sprite files not bundled, or CSP blocks external resources.

**Resolution:**
1. Verify `assets/fonts/fontawesome/` and `assets/icons/sprite.svg` exist in `dist/`
2. Check browser console for CSP violations
3. The asset system auto-creates placeholders for missing files — check build output for warnings

**Prevention:** Run `npm run build` and check for asset validation warnings in webpack output. Do not rely on placeholder assets.

---

## Problem: Popup shows blank screen / React fails to load

**Root Cause:** React bundle failed to compile or load in the extension context.

**Resolution:**
1. Check `dist/chrome/popup-react.js` exists
2. The extension has fallback scripts (`popup-fallback.ts`) that render a minimal UI if React fails — verify `dist/chrome/popup-fallback.js` exists
3. Check the popup console for JavaScript errors

**Prevention:** Always run `npm run build:dev:chrome` before testing UI changes.

---

## Problem: Room state lost when popup closes

**Root Cause:** Room state was stored in popup memory instead of `browser.storage.local`.

**Resolution:** Room state must be persisted by the background service worker. When the popup reopens, it reads room state via `INTEGRATION_HANDSHAKE` / `POPUP_CONNECT` messages.

**Prevention:** Never store room state in popup component state. Always use background script storage.

---

## Problem: Video detection fails on a page

**Root Cause:** The video element is inside a cross-origin iframe, or video detection was not triggered (must click "Start Room" first).

**Resolution:**
1. Video detection is on-demand: click "Start Room" to activate it
2. If auto-detection fails, right-click the video area for manual detection
3. Right-click checks `element.children` for video tags, then traverses up 3 parent levels
4. Cross-origin iframes cannot be accessed — the extension displays "overlay unavailable" guidance

**Prevention:** Test on the target site. Note that cross-origin iframe restrictions are a browser security feature, not a bug.

---

## Problem: WebRTC voice chat fails

**Root Cause:** STUN-only configuration fails on restrictive NATs. TURN server is required.

**Resolution:**
1. Verify TURN server is configured in `extension-config.json` (`TURN_SERVERS`)
2. Check browser microphone permissions
3. The extension displays a clear degradation message when TURN is unavailable

**Prevention:** Always configure TURN servers for production deployments. Test on restrictive networks.

---

## Problem: Build fails with TypeScript errors

**Root Cause:** Test files included in the build, or `tsconfig.build.json` excludes are incorrect.

**Resolution:**
1. Test files (`*.test.ts`, `*.test.tsx`) should be excluded from webpack build via `tsconfig.build.json`
2. Check that `src/test-setup.ts` is not included in build
3. Run `npm run typecheck` to verify types without building

**Prevention:** Maintain separate `tsconfig.json` (full), `tsconfig.build.json` (excludes tests), and `tsconfig.test.json` (test-only).

---

## Problem: CI pipeline does not run

**Root Cause:** No git repository initialized. `.github/workflows/ci.yml` exists but requires a git remote.

**Resolution:**
1. Initialize git: `git init`
2. Commit current state
3. CI will run on push to `main` or `develop` branches

**Prevention:** Initialize git early. The CI pipeline covers: lint → typecheck → build → test → coverage → mutation testing.
