# Current Project State

> Snapshot of active work and repository health. **Update this file whenever state changes.** Last updated: 2026-08-04.

## Repository health

| Area | Status | Notes |
|---|---|---|
| Git | ✅ Healthy | `main`, remote `github.com/XDHx86/Anywhere-Party.git`, clean tree, PR-based history |
| CI (`ci.yml`) | ✅ Functional | lint, format, build, coverage, mutation pass; typecheck/test non-blocking |
| Typecheck | ⚠️ Non-blocking | 463 pre-existing MUI7/React19 type mismatches |
| Unit tests | ⚠️ ~19% fail locally | Timing-sensitive + Node 24 jsdom incompatibility; CI on Node 18 |
| CodeGraph | ✅ Indexed | `.codegraph/` daemon running, v1.5.0 |

## Feature flag state (`extension-config.json`)

| Flag | Value | Meaning |
|---|---|---|
| `VOICE_CHAT`, `ANNOTATIONS`, `SUBTITLES` | `true` | Core features enabled |
| `PLAYLISTS` | `true` | Milestone 2.1 completed |
| `SCHEDULING` | `true` | Milestone 2.3 completed (ICS + reminders; OAuth deferred) |
| `ADVANCED_ANNOTATIONS` | `true` | Milestone 4 completed — collaborative tools, layers, sync |
| `E2E_ENCRYPTION` | `false` | Milestone 4 code written (`@core/encryption`), **gated off** pending validation |
| `LOCAL_DEV_MODE` | `true` | Dev signaling server `ws://localhost:8080` |

## Milestone status (see [plan.md](../../plan.md))

| Milestone | Status |
|---|---|
| 1. Repository Infrastructure | ✅ Completed (git + CI) |
| 2. Feature Completion | ✅ Completed (playlists, scheduling) |
| 3. Documentation & Deployment | ✅ Completed (manual browser verification items pending) |
| 4. Advanced Features | 🔶 Partial — advanced annotations done; E2E encryption code done, flag off |
| 5. Production Readiness | ⏳ Future — store submission, TURN, monitoring, retention |

## Active work / next steps

1. **E2E encryption enablement** — validate `src/@core/encryption/e2e-encryption.ts` and relay handlers, then flip `E2E_ENCRYPTION: true`.
2. **Milestone 5 (Production Readiness)** — store publishing, production TURN, monitoring (Prometheus/Loki configs exist in `monitoring/`), data-retention enforcement, DB migration scripts.
3. **Manual verification backlog** (from docs/deployment-checklist.md): room persistence across sessions, popup scrolling/accessibility, config import/export.

## Known issues

- MUI 7 `StyledComponent` vs React 19 JSX type mismatch → 463 typecheck errors (pre-existing, non-blocking).
- Node 24 + jsdom 23: `clearInterval` not defined in sandbox → ~227 failing tests locally. CI pins Node 18.
- ESLint: 1330 warnings (mostly `no-explicit-any`), 0 errors.
- webpack `validateAssets()` creates placeholder assets instead of failing — verify missing-asset behavior in build output.
