# TODO

> **Security-first invariant:** Security is a requirement for every task below, not a separate task. Any implementation, optimization, refactor, automation, test, configuration, dependency, asset, Docker, Nginx, or documentation change must preserve or improve the existing security posture. Never weaken an existing security control merely to make development, testing, setup, performance, or compatibility easier. Treat new functionality and newly exposed attack surfaces as security-sensitive by default.

## Completed

### 8. ~~Upgrade and optimize `setup.sh` / `setup.bat`~~

* [x] Audit both setup scripts against the current repository structure.
* [x] Ensure both setup scripts install/prepare all required dependencies.
* [x] Ensure dependencies come from trusted, expected sources.
* [x] Avoid silently downloading or executing arbitrary remote scripts.
* [x] Pin or constrain critical tooling/dependency versions where reproducibility and supply-chain safety require it.
* [x] Ensure both setup scripts configure the required environment correctly.
* [x] Ensure both setup scripts build all required artifacts.
* [x] Ensure both setup scripts perform required validation.
* [x] Verify generated artifacts originate from the expected source tree.
* [x] Remove obsolete commands and references.
* [x] Handle missing prerequisites clearly.
* [x] Handle existing installations/idempotent reruns.
* [x] Avoid unnecessary user interaction.
* [x] Ensure the scripts do not require manual intervention until the extension is ready to load.
* [x] Ensure the final state leaves the user with the extension ready for manual loading into Brave/Chrome/Firefox.
* [x] Verify paths, environment variables, generated files, and configuration.
* [x] Do not expose secrets through command-line arguments, logs, generated files, or environment dumps.
* [x] Do not hardcode credentials, tokens, private keys, or machine-specific secrets.
* [x] Ensure development/test credentials cannot accidentally become production credentials.
* [x] Ensure Windows-specific behavior works correctly in `setup.bat`.
* [x] Ensure Unix/WSL/Linux behavior works correctly in `setup.sh`.
* [x] Verify exit codes correctly reflect success/failure.
* [x] Ensure failures stop the setup process instead of silently continuing.
* [x] Ensure rerunning the scripts does not corrupt or duplicate configuration.
* [x] Document any unavoidable prerequisites or manual steps.
* [x] Minimize the privileges required to execute setup operations.
* [x] Do not disable security tooling, browser protections, certificate validation, or OS protections merely to make setup succeed.

### 12. ~~Optimize Docker images and Docker Compose~~

* [x] Audit all Dockerfiles.
* [x] Audit Docker Compose configuration.
* [x] Reduce unnecessary image contents.
* [x] Remove unnecessary runtime dependencies.
* [x] Separate build-time and runtime dependencies.
* [x] Use multi-stage builds where beneficial.
* [x] Improve `.dockerignore`.
* [x] Optimize Docker layer ordering and cache usage.
* [x] Minimize unnecessary build invalidation.
* [x] Verify lockfiles are used correctly for reproducible dependency installation.
* [x] Prefer minimal trusted base images appropriate for the workload.
* [x] Review base-image provenance and update strategy.
* [x] Review container users and privileges.
* [x] Avoid running services as root unless explicitly required.
* [x] Review exposed ports.
* [x] Review health checks.
* [x] Review startup and shutdown behavior.
* [x] Verify containers terminate cleanly.
* [x] Optimize Compose service dependencies.
* [x] Review Compose networking.
* [x] Avoid unnecessarily exposing services to the host or external network.
* [x] Review environment/configuration propagation.
* [x] Review volume usage and unnecessary persistent state.
* [x] Review restart policies.
* [x] Verify no development-only files or secrets enter runtime images.
* [x] Verify `.env` files, credentials, certificates, keys, and local configuration are excluded where appropriate.
* [x] Review container capabilities and filesystem permissions.
* [x] Avoid unnecessary package managers, shells, compilers, and debugging tools in runtime images.
* [x] Preserve Nginx and extension security controls.
* [x] Do not sacrifice isolation or least privilege for performance or convenience.

### 1. ~~Fix Vitest — 6 remaining errors~~

* [x] Resolve all 6 remaining Vitest errors.
* [x] Verify the full Vitest suite passes.
* [x] Confirm all discovered tests pass with zero test errors.
* [x] Preserve the passing test state during subsequent work.
* [x] Do not weaken security-sensitive assertions or remove security-related test coverage merely to make tests pass.

### 4. ~~Clean the codebase~~

* [x] Remove dead and unused code.
* [x] Remove obsolete files and repository clutter.
* [x] Remove redundant implementations and stale code.
* [x] Clean unnecessary configuration and scripts.
* [x] Verify cleanup did not introduce regressions.
* [x] Preserve security controls, validation, sanitization, CSP, permissions, and defensive code during cleanup.

### 10. ~~Harden and optimize Nginx~~

* [x] Audit Nginx configuration.
* [x] Harden proxy and request handling.
* [x] Review security headers and information exposure.
* [x] Review timeouts, buffering, connection handling, and upstream configuration.
* [x] Remove unnecessary or unsafe configuration.
* [x] Optimize relevant Nginx configuration without breaking the local-server architecture.
* [x] Verify compatibility with the extension and local server.
* [x] Ensure optimization did not trade security for performance or convenience.

### 11. ~~Harden extension security~~

* [x] Audit extension permissions and manifest configuration.
* [x] Review extension messaging and trust boundaries.
* [x] Audit unsafe DOM/script execution paths.
* [x] Review network requests and response handling.
* [x] Audit storage and sensitive configuration.
* [x] Review CSP and web-accessible resources.
* [x] Reduce unnecessary extension attack surface.
* [x] Preserve required functionality and browser compatibility.
* [x] Treat all external input, network data, extension messages, storage values, and DOM content as untrusted unless explicitly validated.

---

## Pending

### 2. **Manually test the extension**

* [ ] Build the extension using the intended production/development build process.
* [ ] Verify the production build is not accidentally using development/debug configuration.
* [ ] Inspect the generated extension artifact before loading it.
* [ ] Verify the generated manifest contains only the required permissions, scripts, resources, and configuration.
* [ ] Load the extension into Brave.
* [ ] Load the extension into Chrome.
* [ ] Load the extension into Firefox.
* [ ] Verify extension startup and initialization.
* [ ] Test the primary user workflows end-to-end.
* [ ] Test configuration and settings.
* [ ] Test metered configuration once implemented.
* [ ] Test extension reload behavior.
* [ ] Test browser restart/reload behavior.
* [ ] Test persisted state and configuration.
* [ ] Test extension ↔ local-server communication.
* [ ] Test extension ↔ Nginx ↔ local-server communication.
* [ ] Test behavior when the local server is unavailable.
* [ ] Test behavior when Nginx is unavailable or misconfigured.
* [ ] Test recovery after connection/server failures.
* [ ] Test malformed, unexpected, oversized, or invalid server responses.
* [ ] Test relevant timeout and retry behavior.
* [ ] Verify untrusted server/network data cannot cause unsafe DOM or script execution.
* [ ] Verify extension messages reject unexpected senders, payloads, and message types.
* [ ] Verify sensitive state is not unnecessarily exposed through logs, URLs, DOM, storage, or error messages.
* [ ] Verify browser permissions are no broader than required.
* [ ] Verify no debug endpoints, development controls, or test-only bypasses are exposed unintentionally.
* [ ] Record browser-specific issues and unexpected behavior.
* [ ] Verify the extension behaves correctly outside the automated test environment.
* [ ] Verify there are no unexpected console errors or runtime warnings during normal use.
* [ ] Treat every unexpected behavior as a potential security issue until ruled out.

### 3. **Audit missing/incomplete features**

* [ ] Build a feature inventory from the source code, manifest, configuration, tests, and documentation.
* [ ] Identify implemented features that are inaccessible.
* [ ] Identify implemented features that are broken.
* [ ] Identify partially implemented features.
* [ ] Identify referenced but missing functionality.
* [ ] Identify documented functionality that is not implemented.
* [ ] Identify stale or obsolete references.
* [ ] Identify UI/features that exist in code but are not reachable through the normal user flow.
* [ ] Identify configuration options that exist but have no functional effect.
* [ ] Identify functionality that exists but has no meaningful error handling.
* [ ] Identify functionality that accepts external or user-controlled input without sufficient validation.
* [ ] Identify unnecessary permissions, APIs, network endpoints, or trust relationships introduced by existing features.
* [ ] Distinguish actual missing features from dead/stale code.
* [ ] Prioritize feature gaps by importance and security impact.
* [ ] Separate bugs, missing features, UX issues, technical debt, security issues, and documentation gaps.
* [ ] Treat undocumented behavior and implicit trust assumptions as audit targets.
* [ ] Produce a concrete follow-up list for anything requiring implementation.
* [ ] Do not implement newly discovered functionality by bypassing existing security boundaries.

### 5. **Resolve missing asset files and references**

* [ ] Audit all assets referenced by the extension manifest.
* [ ] Audit asset imports throughout the source code.
* [ ] Audit runtime asset URLs and resource references.
* [ ] Identify missing icons.
* [ ] Identify missing images.
* [ ] Identify missing fonts/static resources.
* [ ] Identify assets referenced by build configuration but absent from the repository.
* [ ] Identify assets present in the repository but never used.
* [ ] Determine whether each missing asset should be restored, generated, or removed from its references.
* [ ] Verify asset sources and provenance before adding third-party assets.
* [ ] Do not introduce untrusted remote assets where bundled/local assets are appropriate.
* [ ] Ensure assets cannot unexpectedly expand the extension's web-accessible attack surface.
* [ ] Verify required assets are included in the extension build.
* [ ] Verify assets are packaged only where required.
* [ ] Verify assets load correctly in supported browsers.
* [ ] Verify asset paths work from the built extension rather than only the source tree.
* [ ] Remove stale asset references that are no longer required.
* [ ] Review new web-accessible resources and keep exposure to the minimum required.

### 6. **Expand and enhance Stryker tests**

* [ ] Review the current Stryker configuration and mutation coverage.
* [ ] Identify important surviving mutations.
* [ ] Identify weak or superficial tests.
* [ ] Identify mutations that expose missing behavioral assertions.
* [ ] Strengthen assertions where mutations reveal inadequate tests.
* [ ] Add meaningful edge-case tests.
* [ ] Improve coverage of important business logic.
* [ ] Add mutation coverage for validation, authorization/trust boundaries, input handling, error handling, and security-sensitive logic where applicable.
* [ ] Verify tests fail when security controls are weakened or bypassed.
* [ ] Verify tests cover malicious/invalid input where the underlying logic handles external input.
* [ ] Verify tests fail when unsafe assumptions are introduced.
* [ ] Keep mutation testing focused on logic that Vitest can effectively validate.
* [ ] Avoid duplicating browser-level Playwright coverage.
* [ ] Avoid optimizing for an arbitrary 100% mutation score.
* [ ] Review mutation-test runtime and worker/resource behavior.
* [ ] Run Stryker after changes and evaluate the resulting mutation quality.
* [ ] Verify Stryker changes do not degrade the normal Vitest suite.

### 7. **Add comprehensive Playwright tests**

* [ ] Configure Playwright for the extension's supported browser environments.
* [ ] Establish a reliable extension-loading test harness.
* [ ] Test extension initialization.
* [ ] Test critical user-facing workflows.
* [ ] Test important configuration/state flows.
* [ ] Test extension ↔ local-server integration.
* [ ] Test extension ↔ Nginx ↔ local-server integration where appropriate.
* [ ] Test important failure and recovery paths.
* [ ] Test relevant browser-specific behavior.
* [ ] Test extension reload/reinitialization behavior.
* [ ] Test persisted state where it matters.
* [ ] Test permission-sensitive and security-sensitive workflows.
* [ ] Test CSP-relevant behavior.
* [ ] Test extension messaging and trust-boundary behavior.
* [ ] Test rejection of invalid or malicious inputs where applicable.
* [ ] Test that untrusted network responses cannot trigger unsafe browser behavior.
* [ ] Verify real browser behavior rather than mocking it.
* [ ] Verify the built extension artifact rather than only development/source behavior where practical.
* [ ] Capture useful diagnostics for failures without leaking sensitive information.
* [ ] Avoid duplicating existing Vitest/Stryker coverage.
* [ ] Keep Playwright focused on integration, browser APIs, UI behavior, security boundaries, and workflows that unit tests cannot adequately cover.
* [ ] Do not add test-only security bypasses that can leak into production configuration.

### 9. **Add metered configuration/code**

* [ ] Audit the existing configuration and communication architecture.
* [ ] Determine the correct boundary for metering.
* [ ] Determine exactly what is being metered and why.
* [ ] Implement centralized metered configuration.
* [ ] Keep metering configuration typed and validated.
* [ ] Avoid scattering metering logic across unrelated modules.
* [ ] Integrate metering with the existing extension/server communication flow.
* [ ] Define trust boundaries and authoritative sources for metering state.
* [ ] Never treat client-controlled metering values as authoritative where they affect enforcement or accounting.
* [ ] Handle missing configuration.
* [ ] Handle invalid configuration.
* [ ] Handle metering limits and boundary conditions.
* [ ] Handle malformed/unavailable metering state.
* [ ] Handle relevant restart and persistence scenarios.
* [ ] Handle relevant concurrent-request scenarios.
* [ ] Prevent trivial client-side bypasses of metering logic where enforcement is required.
* [ ] Ensure configuration propagates correctly through the required environment.
* [ ] Verify environment-specific configuration does not leak into source code.
* [ ] Verify no credentials, tokens, or secrets are accidentally committed.
* [ ] Avoid logging sensitive metering data unnecessarily.
* [ ] Add appropriate tests for metering behavior.
* [ ] Add tests for invalid, manipulated, and boundary values.
* [ ] Preserve existing Nginx hardening.
* [ ] Preserve existing extension security hardening.
* [ ] Verify metering works through the actual extension → Nginx → local-server path where applicable.

### 13. **Update all documentation**

* [ ] Audit all existing documentation against the actual implementation.
* [ ] Update installation instructions.
* [ ] Update setup instructions.
* [ ] Update extension loading instructions.
* [ ] Update supported-browser documentation.
* [ ] Update architecture documentation.
* [ ] Update configuration documentation.
* [ ] Update local-server documentation.
* [ ] Update Nginx documentation.
* [ ] Update Docker/Compose documentation.
* [ ] Update testing documentation.
* [ ] Update Stryker documentation.
* [ ] Update Playwright documentation.
* [ ] Update metering/configuration documentation.
* [ ] Update troubleshooting documentation.
* [ ] Document security-relevant configuration and trust boundaries where useful.
* [ ] Document required environment variables without exposing secrets.
* [ ] Document safe setup and deployment assumptions.
* [ ] Remove obsolete documentation.
* [ ] Correct inaccurate examples and commands.
* [ ] Ensure documentation matches the final repository state.
* [ ] Ensure documented commands actually work.
* [ ] Ensure setup instructions match the final setup scripts.
* [ ] Ensure documentation does not describe removed functionality.
* [ ] Do not document insecure workarounds as normal operating procedures.
* [ ] Do not include real credentials, secrets, private endpoints, or sensitive environment data in documentation.

### 14. **Final full-system validation**

* [ ] Run formatting checks.
* [ ] Run ESLint.
* [ ] Run TypeScript/typecheck.
* [ ] Run the complete Vitest suite.
* [ ] Run Stryker.
* [ ] Run Playwright.
* [ ] Build the extension.
* [ ] Verify the production extension artifact.
* [ ] Load-test the extension in supported browsers.
* [ ] Validate `setup.sh`.
* [ ] Validate `setup.bat`.
* [ ] Validate Docker builds.
* [ ] Validate Docker Compose configuration.
* [ ] Validate Docker Compose startup and service connectivity.
* [ ] Validate Nginx configuration.
* [ ] Validate extension ↔ Nginx ↔ local-server communication.
* [ ] Validate metered configuration.
* [ ] Verify extension security hardening remains intact.
* [ ] Verify Nginx hardening remains intact.
* [ ] Verify all required assets exist and are packaged.
* [ ] Verify no development/debug configuration leaks into the final artifact.
* [ ] Verify no secrets, credentials, private keys, tokens, or sensitive configuration are present in source or build artifacts.
* [ ] Verify extension permissions remain minimal.
* [ ] Verify CSP and security headers remain effective.
* [ ] Verify external input remains validated at relevant trust boundaries.
* [ ] Verify extension messaging remains restricted and validated.
* [ ] Verify network communication does not introduce unintended trust or exposure.
* [ ] Verify Docker containers maintain least privilege and expected isolation.
* [ ] Verify setup scripts do not bypass security controls.
* [ ] Check for dead code and unnecessary files.
* [ ] Check for generated artifacts or repository clutter.
* [ ] Check `git status` and review the final diff.
* [ ] Verify no unrelated files or changes were introduced.
* [ ] Verify no completed task was regressed by later work.
* [ ] Verify all tests and checks pass.
* [ ] Review the final dependency tree for unnecessary or suspicious additions.
* [ ] Review exposed ports, permissions, endpoints, and resources one final time.
* [ ] Update `CHANGELOG.md`.
* [ ] Update `todo.md`.
* [ ] Perform a final manual smoke test.
* [ ] Confirm the repository is clean, reproducible, secure, and operational.

### 15. **Update, enhance, and expand observability, logging, debugging, and telemetry**

* [ ] Audit the existing logging, debugging, observability, and telemetry implementation.
* [ ] Identify missing visibility across the extension, local server, Nginx, Docker, setup scripts, and test environments.
* [ ] Establish consistent log levels and structured logging where appropriate.
* [ ] Improve actionable error messages without exposing sensitive information.
* [ ] Add useful diagnostic context to failures, warnings, and important lifecycle events.
* [ ] Improve debugging of extension startup, background/service-worker lifecycle, messaging, storage, network requests, and browser integration.
* [ ] Improve debugging of extension ↔ Nginx ↔ local-server communication.
* [ ] Improve Nginx request/error visibility without logging unnecessary request data.
* [ ] Improve Docker/container startup, health, dependency, and runtime diagnostics.
* [ ] Improve setup-script diagnostics and failure reporting.
* [ ] Add correlation/request identifiers where they materially improve tracing across components.
* [ ] Ensure logs can distinguish requests, sessions, services, and relevant execution contexts without exposing sensitive identifiers.
* [ ] Add telemetry for meaningful application events where required.
* [ ] Define what telemetry is collected, why it is collected, and where it is sent.
* [ ] Keep telemetry minimal and proportional to its debugging/operational value.
* [ ] Ensure telemetry cannot become an unnecessary privacy or security liability.
* [ ] Never log passwords, tokens, API keys, private keys, credentials, secrets, or sensitive configuration.
* [ ] Avoid logging full authentication headers, cookies, authorization data, or sensitive request/response bodies.
* [ ] Sanitize URLs, query parameters, headers, errors, and externally supplied values before logging where necessary.
* [ ] Prevent user-controlled input from being interpreted as log structure or control data.
* [ ] Prevent excessive logging from becoming a performance or resource-exhaustion issue.
* [ ] Ensure debug logging can be enabled/disabled without modifying source code where practical.
* [ ] Ensure verbose/debug telemetry is disabled by default in production builds where appropriate.
* [ ] Ensure development/test diagnostics cannot accidentally leak into production artifacts.
* [ ] Add appropriate tests for security-sensitive logging and telemetry behavior.
* [ ] Verify observability changes do not alter application behavior or security boundaries.
* [ ] Verify telemetry and logging remain functional when components fail or become unavailable.
* [ ] Document logging levels, diagnostic procedures, telemetry behavior, and relevant troubleshooting workflows.
* [ ] Validate observability across the supported browsers and runtime environments.
