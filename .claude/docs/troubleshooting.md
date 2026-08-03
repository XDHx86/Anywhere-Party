# Troubleshooting Guide

> Operational issues and their fixes. Add entries only when a fix is non-obvious or recurs. Last updated: 2026-08-04.

## Build

**webpack creates placeholder assets instead of failing.**
`webpack.config.js` `validateAssets()` emits warnings + placeholders for missing assets, not errors. Check build output carefully; production releases should verify real assets exist (see `scripts/validate-assets.js`).

**Build fails on type errors.**
`ts-loader` uses `transpileOnly: true` — types are checked separately by `npm run typecheck`. A typecheck failure should not block a build; investigate it via `npm run typecheck`.

## Typecheck (known, pre-existing)

**463 errors, mostly `StyledComponent` vs React 19 JSX.** MUI 7 `StyledComponent` typing conflicts with React 19 JSX types. Pre-existing, non-blocking in CI (`continue-on-error`). Do not introduce new errors; do not treat this as a green signal.

## Unit tests

**~227/1170 tests fail on Node 24 locally** with jsdom errors like `clearInterval is not defined`. Cause: Node 24 + jsdom 23 incompatibility in the sandbox. CI pins Node 18 where jsdom works. To reproduce CI behavior: run tests under Node 18.

**Timing-sensitive failures.** A portion of failures are timing-related (sync, heartbeat, animations). Re-run the specific test; if it passes in isolation it is flaky, not broken.

## CodeGraph

**CodeGraph index stale after big edits.** The `.codegraph/` daemon watches the workspace; writes lag ~1s. If exploration returns outdated source, re-run the query — it re-reads from disk. If the daemon is down, `codegraph init` restarts it. `.codegraph/` is gitignored.

## Server

**Server tests** (`npm run server:test`) run `node test-relay.js` (and `test-feature-flags.js` for flags). If the relay port is in use, tests may fail — stop a running dev server first.

**Feature-flag server** runs separately (`server/feature-flags-server.js`); `dev:all`/`start:all` run both concurrently.

## Git / CI

**CI: typecheck/test steps show ❌ but pipeline green.** Expected — both are `continue-on-error: true`. Watch lint, format, build, coverage instead.

**ESLint 1330 warnings, 0 errors.** Several rules downgraded to `warn` to unblock CI (`ban-types`, `no-unused-vars`, `no-case-declarations`, `ban-ts-comment`, `no-var-requires`). Keep new code warning-free where practical.

## Feature flags

**New feature not appearing.** Confirm the flag is `true` in `extension-config.json` *and* read through `@core/config`/`@core/feature-flags` (there are several config locations — see plan.md risk "Config interface drift"). Never enable a flag for incomplete work.
