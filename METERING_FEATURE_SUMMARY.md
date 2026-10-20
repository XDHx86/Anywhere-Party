# Metering Feature Implementation Summary

## Overview
Implemented authoritative server-side metering with client-side optimistic sync for the Anywhere Party extension. The system enforces rate limits on chat messages, reactions, annotations, room creation, and concurrent connections.

## Architecture

### Server (`server/metering-service.js`)
- **Sliding-window rate limiting** for `chatMessages`, `reactions`, `annotationsCreated`, `roomsCreated`
- **Gauge (concurrent)** for `connections` (windowMs: 0)
- **Per-user isolation** — limits apply independently per userId
- **Persistence** — JSON state file with atomic writes, corrupt-file recovery
- **Pruning** — Expired windows auto-cleared on interval
- **Configuration** — Normalized with defaults, validated via `validateMeteringConfig()`

### Client (`src/@core/metering/metering-client.ts`)
- **Optimistic local check** — immediate feedback, no round-trip latency
- **Server reconciliation** — `syncState()` merges authoritative server state
- **Connection lifecycle** — `acquireConnection()`, `releaseConnection()`, `reportConnectionReleased()`
- **Event callbacks** — `onLimitExceeded` for UI warnings/toasts

### Signaling Protocol (`src/@core/signaling/message-types.ts`)
New message types:
- `ClientMeteringReport` — client sends local usage
- `MeteringState` — server returns authoritative state
- `RateLimitMessage` — server notifies limit exceeded (reject/warn)

### Config Validation (`src/@core/config/config-validator.ts`)
- Full `METERING` section validation with detailed error reporting
- Normalization fills missing dimensions with defaults
- Validates: limits ≥0, windowMs ≥0, action ∈ {reject,warn}, sensible bounds

## Default Limits
| Dimension | Limit | Window | Action |
|-----------|-------|--------|--------|
| chatMessages | 30 | 60s | warn |
| reactions | 20 | 60s | warn |
| annotationsCreated | 15 | 60s | warn |
| roomsCreated | 5 | 1h | reject |
| connections | 5 | concurrent | reject |

## Testing

### Server (`server/test-metering.js`) — 23 tests
- Sliding window: below limit, at limit, above limit, no overcount, rollover, per-user isolation
- Gauge: acquire/release, reject over limit, idempotent release, acquire→release→re-acquire, per-user isolation
- Config: defaults, unknown dimensions, custom config
- Disabled mode: all checks pass
- State: authoritative reporting, disabled dimensions omitted
- Persistence: save/load, corrupt file recovery
- Prune: expired windows cleared

### Client Config (`src/@core/metering/metering-config.test.ts`) — 12 tests
- normalizeMeteringConfig: null/undefined, missing dimensions, explicit overrides, deep clones, disabled metering
- validateMeteringConfig: valid config, invalid types, negative limits, invalid actions, zero window, unknown dimensions accepted

### Client Behavior (`src/@core/metering/metering-client.test.ts`) — 10 tests
- Disabled mode, checkLocal/syncState flows, connection lifecycle, state reporting, edge cases

### ConfigValidator Integration (`src/@core/config/config-validator.metering.test.ts`) — 7 tests
- Valid/invalid/partial METERING sections, METERING optional

## Validation Commands
```bash
# Server tests
cd server && node test-metering.js

# Client tests (via PowerShell on Windows due to vitest 4.1.10 drive-case bug)
node node_modules/vitest/vitest.mjs --run src/@core/metering/ src/@core/config/config-validator.metering.test.ts

# TypeScript
npx tsc --noEmit

# Lint
npx eslint src/**/*.{ts,tsx} --max-warnings=0
```

All pass: **23 + 29 + 7 + 35 = 94 tests**, clean typecheck, clean lint.