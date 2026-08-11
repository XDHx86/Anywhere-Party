# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Dependabot configuration** — `.github/dependabot.yml` enables automated
  dependency updates for the root npm package, the server npm package, and
  GitHub Actions. Updates are monthly (Mondays), grouped into logical sets
  (dev tooling, testing stack, TypeScript toolchain, React/MUI runtime, server
  deps, action patches) to minimize PR noise. Dependabot PRs run the same CI
  gates as normal PRs.

- **`ci-lint.yml` workflow** — static analysis on every PR and push:
  `actionlint` (validates all workflow YAML), `shellcheck` (lints shell
  scripts), `gitleaks` (secret scan of the working tree, with an allowlist in
  `.gitleaks.toml` for intentional dev/test credentials), and `docker compose
  config -q` validation for the dev compose file.

- **`ci-nightly.yml` workflow** — expensive checks moved out of the PR path:
  Stryker mutation testing, `npm audit` (root + server, fails on moderate+),
  full Docker image builds (all 4 Dockerfiles) + prod compose validation, and a
  full coverage snapshot. Runs nightly at 03:17 UTC, on push to `main`, and via
  `workflow_dispatch`.

- **`docker-publish.yml` workflow** — builds and pushes the signaling-server and
  feature-flags production images to GitHub Container Registry on `v*` version
  tags (with `latest` on the default branch). Uses Buildx multi-arch
  (linux/amd64 + linux/arm64) with GH Actions cache, and `packages: write`
  least-privilege permissions.

- **Coverage thresholds in CI** — `vitest.config.ts` now enforces aggregate
  coverage thresholds (statements ≥ 55%, branches ≥ 45%, functions ≥ 55%,
  lines ≥ 55%), so the `test` job fails on coverage regressions, not just on
  failing tests.

- **`test:mutation` alias** — `npm run test:mutation` is now an alias for
  `npm run stryker`, fixing the long-standing mismatch where the documented
  script name did not exist.

- **Root `package-lock.json` committed** — `npm ci` (used by every CI job and
  Dependabot) requires a lockfile; none existed at the repo root, so every CI
  job failed at dependency install. The lockfile is now committed for
  reproducible installs.

- **`docs/ci-cd.md`** — documents the four workflows, required vs. optional vs.
  nightly checks, Dependabot behavior, action-pinning policy, and local
  equivalents for every CI check.

### Fixed

- **CI ran `npm run test:mutation` which did not exist** — the mutation-test job
  invoked a script that was never defined in `package.json` (the real script is
  `stryker`). The missing `continue-on-error: true` silently masked the failure.
  The job now uses the new `test:mutation` alias and runs in the nightly
  workflow.

- **CI silently ignored typecheck/test/mutation failures** — `continue-on-error:
  true` on three jobs meant a red typecheck, failing tests, or a failing
  mutation run reported green. The codebase is now stabilized (all 1300+ tests
  and strict typecheck pass on Node 24), so every quality gate in `ci.yml` is
  blocking.

- **CI serialized independent jobs** — the six jobs were chained with `needs:`
  despite sharing no state, so each waited on the previous for no reason. All
  jobs now run in parallel with `npm ci` cached by `setup-node`.

- **Missing hardening controls** — added least-privilege `GITHUB_TOKEN`
  (`contents: read`), `concurrency` cancellation of obsolete runs, and
  `timeout-minutes` ceilings on every job; all Actions pinned to immutable
  commit SHAs (supply-chain hardening).

- **`docs/` and stale CI references in README/CLAUDE.md** — corrected the
  outdated claims that CI runs Node 18 and that typecheck/test are non-blocking
  (CI runs Node 24; all checks block), and fixed non-existent scripts listed in
  README (`dev`, `dev:server`, `test:e2e`).

- **`Dockerfile.prod` CMD referenced nonexistent `server.js`** — the production
  Dockerfile's entrypoint pointed to a file that does not exist in the server
  directory. The server entrypoint is `local-relay.js`. Changed CMD to
  `node local-relay.js`.

- **`Dockerfile.prod` shipped devDependencies in production image** — the
  multi-stage build copied the full builder context (including devDependencies)
  over the production stage, defeating the purpose of `npm ci --omit=dev`.
  Replaced with a single-stage production build that copies only runtime files.

- **All Dockerfiles used `npm ci` without a lockfile** — `npm ci` requires a
  `package-lock.json` to operate. No lockfile existed for the server package,
  causing every Docker build to fail. Generated and committed
  `server/package-lock.json`.

- **Feature flags Dockerfile referenced wrong environment variable** — compose
  set `PORT: 3002` but `feature-flags-server.js` reads `FEATURE_FLAGS_PORT`
  (defaulting to 8081). The service silently listened on the wrong port,
  causing the Docker healthcheck and nginx proxy to always fail. Fixed compose
  to set `FEATURE_FLAGS_PORT: 3002`.

- **Docker HEALTHCHECKs used `curl` against servers with no HTTP endpoints** —
  `local-relay.js` is a pure WebSocket server with no HTTP listener; the
  `curl -f http://localhost:3001/health` healthcheck always failed. Replaced
  all Docker and compose healthchecks with TCP liveness checks using
  `node -e "require('net').connect(...)"` — honest and functional. The
  Dockerfile healthchecks read the same env var the servers use
  (`PORT`, `FEATURE_FLAGS_PORT`) with the app's own default fallback, so an
  image stays healthy whether it is run with compose (env set to 3001/3002) or
  standalone.

- **Feature flags server had no `/health` endpoint** — the existing HTTP server
  in `feature-flags-server.js` had no health route, causing the Dockerfile
  HEALTHCHECK to always return unhealthy. Added a minimal `/health` GET route
  that returns `{"status":"ok"}`.

- **Dev compose exposed postgres and redis on all host interfaces** — both
  services were bound to `0.0.0.0` without authentication. Since they are only
  accessed container-to-container by the signaling server, removed host port
  bindings entirely to reduce attack surface.

- **Prod compose referenced missing files** — `docker-compose.prod.yml` mounted
  `server/config/redis.conf`, `monitoring/grafana/dashboards/`,
  `monitoring/grafana/datasources/`, and `ssl/`, none of which existed. Created
  all missing files with sensible defaults.

- **`setup.sh` and `setup.bat` referenced nonexistent npm scripts** — both
  setup scripts instructed users to run `npm run dev:server` and `npm run dev`,
  neither of which exist in `package.json`. Fixed to `npm run server:dev` and
  `npm run watch`.

- **Setup scripts used deprecated `docker-compose` v1 command** — Docker
  Compose v1 has been superseded by the `docker compose` v2 plugin. Updated
  both scripts to detect and prefer `docker compose`, falling back to
  `docker-compose`.

### Changed

- **Upgraded Docker base images from `node:18-alpine` to `node:22-alpine`** —
  Node.js 18 reached end-of-life in April 2025. Node.js 22 is the current LTS.
  The server package (`ws@8`, `uuid@9`) is compatible with Node 22.

- **Setup scripts now prefer `npm ci` when a lockfile exists** — falls back to
  `npm install` when no lockfile is present. This ensures reproducible
  dependency installation in environments where the lockfile is committed.

- **Removed unnecessary system packages from Docker images** — the dev and
  production Dockerfiles installed `curl`, `postgresql-client`, and `redis` via
  `apk`. The server does not use PostgreSQL or Redis system clients (it
  connects over the network), and healthchecks no longer use `curl`. All three
  packages were removed, reducing image size and attack surface.

- **Setup scripts now validate build output** — both `setup.sh` and
  `setup.bat` verify that `manifest.json` exists in both `dist/chrome/` and
  `dist/firefox/` after building, catching incomplete builds early.

- **Removed deprecated `version` field from compose files** — the `version`
  field is obsolete in Docker Compose v2 and generates a warning.

- **Setup scripts now warn about Node.js 18 EOL** — prints a non-fatal
  warning when Node < 20 is detected, recommending upgrade to current LTS.

### Added

- **`server/.dockerignore`** — prevents `node_modules/`, `.env` (secrets),
  test files, caches, and other unnecessary content from entering the Docker
  build context. Reduces build time and ensures no secrets are baked into
  images.

- **`server/Dockerfile.feature-flags.prod`** — production Dockerfile for the
  feature flags service, referenced by `docker-compose.prod.yml` but missing.
  Uses `dumb-init` for signal handling and sets `NODE_ENV=production`.

- **`server/config/redis.conf`** — minimal Redis configuration for production,
  matching the dev compose command-line flags (`appendonly`, `maxmemory`,
  `allkeys-lru`). Mounted by `docker-compose.prod.yml`.

- **`monitoring/grafana/datasources/prometheus.yml`** — Grafana datasource
  provisioning pointing to the Prometheus service. Prevents Grafana from
  failing on startup when the monitoring profile is active.

- **`monitoring/grafana/dashboards/dashboard.yml`** — Grafana dashboard
  provisioning configuration for file-based dashboards.

- **`ssl/README.md` and `ssl/.gitkeep`** — documents the expected certificate
  file placement (`fullchain.pem`, `privkey.pem`) for the nginx reverse proxy.
  The `.gitkeep` ensures the directory is tracked without committing secrets.

- **`server/package-lock.json`** — locks `ws@8` and `uuid@9` dependency trees
  for reproducible builds across Docker and development environments.

### Security

- **Upgraded `ws` to `8.21.3`** — the server's `ws@8.18.3` pinned by the new
  lockfile exposed two high-severity advisories (memory-exhaustion DoS and
  response-header memory disclosure). `npm audit fix` bumped the lockfile to
  `ws@8.21.3` (non-breaking, within the existing `^8.14.2` range). The remaining
  `uuid <11.1.1` moderate advisory only affects v3/v5/v6 UUIDs generated with a
  user-supplied buffer; the server uses only `v4()` and is unaffected, so no
  breaking major-version bump was applied.

## [1.0.0] - 2025-10-23

### Added

- Initial release of the Watch Party browser extension.
- Cross-browser support (Chrome MV3, Firefox MV2).
- Synchronized video playback, voice/text chat, reactions.
- Collaborative annotations, subtitles, avatars.
- Playlists and scheduling.
- Node.js WebSocket signaling server.
- Docker Compose development and production environments.
- Nginx reverse proxy with hardened TLS configuration.
- Prometheus and Loki monitoring stack.
- Vitest and Stryker mutation testing.
