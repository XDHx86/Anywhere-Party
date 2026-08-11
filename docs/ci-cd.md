# CI/CD Architecture

This document describes the continuous integration pipeline for AnywhereParty,
the checks each workflow runs, and what is required vs. optional.

## Workflows

| Workflow | File | Trigger | Purpose |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | push + PR to `main`/`develop` | Fast, blocking quality gates |
| **CI (Lint)** | `.github/workflows/ci-lint.yml` | push + PR to `main`/`develop` | Static analysis of CI config, shell scripts, secrets, compose |
| **CI (Nightly)** | `.github/workflows/ci-nightly.yml` | nightly 03:17 UTC + push to `main` + manual | Expensive checks (mutation, audit, docker) |
| **Docker Publish** | `.github/workflows/docker-publish.yml` | tag `v*` + manual | Build + push server images to GHCR |

All workflows apply the **least-privilege `GITHUB_TOKEN`** (`contents: read`;
Docker Publish additionally needs `packages: write` to push to GHCR). All
workflows set `concurrency` groups so obsolete runs are cancelled, and every job
sets a `timeout-minutes` ceiling. All Actions are pinned to immutable commit
SHAs (supply-chain hardening).

Docs-only changes (`docs/**`, `*.md`, `.claude/**`) skip the CI and CI-Lint
pipelines to avoid burning runner minutes.

## Required checks (blocking) — `ci.yml`

Every PR and push to `main`/`develop` must pass all of these:

| Job | Runs | Notes |
|---|---|---|
| `lint` | ESLint (`npm run lint`) + Prettier (`npm run format:check`) | Both must be clean (`--max-warnings=0`) |
| `typecheck` | `npm run typecheck` | Strict TypeScript, no emit |
| `build` | `npm run build` + `scripts/validate-assets.js` | Chrome + Firefox production bundles; artifact retained 7 days |
| `test` | `npm run test:coverage` | All 1300+ Vitest tests **and** coverage thresholds enforced in `vitest.config.ts`; coverage report retained 7 days |
| `server-test` | `npm run test:all` | Node tests for the WebSocket relay + feature-flags server (runs on Node 22 to match the production container) |

All jobs run in **parallel** (there is no `needs:` chain — each job is
independent). Each does its own `npm ci`, cached by `setup-node`.

Codecov upload is **optional** (non-blocking) and runs only on pushes to `main`.

## Static analysis — `ci-lint.yml`

| Job | Tool | Checks |
|---|---|---|
| `workflow-lint` | [actionlint](https://github.com/rhysd/actionlint) `1.7.12` | Validates all workflow YAML: syntax, expressions, `uses:` refs, `needs:` targets |
| `shell-lint` | [shellcheck](https://github.com/koalaman/shellcheck) | Lints all `scripts/*.sh` (currently warning-level, non-blocking) |
| `secret-scan` | [gitleaks](https://github.com/gitleaks/gitleaks) `v8.30.1` | Scans the working tree for committed secrets (allowlist in `.gitleaks.toml`) |
| `compose-validate` | Docker Compose | `docker compose config -q` on the dev compose file |

## Expensive / scheduled checks — `ci-nightly.yml`

These are **non-blocking for PRs** but report failures on `main` and in the
nightly run. They run nightly at 03:17 UTC, on every push to `main`, and
on-demand via `workflow_dispatch`.

| Job | Runs | Notes |
|---|---|---|
| `mutation-test` | Stryker (`npm run test:mutation`) | Mutation score thresholds in `stryker.conf.json` (high 80 / low 60 / break 50); report retained 14 days |
| `dependency-audit` | `npm audit --audit-level=moderate` | Root and server lockfiles; fails on moderate+ vulnerabilities |
| `docker-build` | `docker build` × 4 images + compose validation | Ensures every Dockerfile and both compose files build/config cleanly |
| `coverage` | `npm run test:coverage` + Codecov upload | Full coverage snapshot, retained 30 days |

## Dependency updates — Dependabot

Configured in `.github/dependabot.yml`:

- **npm** (root `package.json`) and **npm** (`server/package.json`), plus
  **GitHub Actions**.
- **Monthly schedule** (Mondays), grouped to minimize PR noise:
  - Root dev tooling (ESLint, Prettier, webpack, PostCSS, Tailwind)
  - Testing stack (Vitest, Testing Library, Stryker, jsdom)
  - TypeScript toolchain (`typescript`, `@types/*`)
  - React + MUI runtime
  - Server runtime and server dev tooling
  - Actions patches (minor + patch grouped)
- Dependabot PRs flow through the **same CI gates** as normal PRs (they trigger
  the `pull_request` events for `ci.yml` and `ci-lint.yml`).
- Commit messages are prefixed `chore(deps)` / `chore(deps-dev)` /
  `chore(ci)`.

> **Note on action pinning:** all Actions are pinned to full commit SHAs.
> Dependabot will open PRs bumping the version — after a maintainer reviews the
> new release notes, the `uses:` line comment should be updated with the new
> version and the SHA replaced. Floating major tags are **not** used.

## Repository configuration

- `.github/CODEOWNERS` — `@XDHx86` owns all paths.
- `package-lock.json` (root) — committed so `npm ci` is reproducible; Dependabot
  keeps it in sync.

## Local equivalents

Every CI check has a local counterpart, so most can be run before pushing:

```bash
npm run lint && npm run format:check   # lint job
npm run typecheck                      # typecheck job
npm run build                          # build job
npm run test:coverage                  # test job
cd server && npm run test:all          # server-test job
npm run test:mutation                  # nightly mutation job (slow)
```
