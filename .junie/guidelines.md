Project development guidelines (r3-utils)

This document captures project-specific build, testing, and development practices verified on November 22, 2025.

1) Build / configuration

- Tooling and engines
    - Node: >= 20 (enforced by package.json engines). Tested with Vitest 4 and TypeScript 5.8.
    - Package manager: pnpm (repo pins pnpm@10.14.0 via package.json packageManager).
    - Compiler/bundler: tsdown (see tsdown.config.ts) with ESM output, DTS generation and source maps.
- Install
    - pnpm install
- Build
    - pnpm build (runs tsdown across multiple entry points under src/*/index.ts and writes to dist/).
    - pnpm dev runs tsdown in watch mode.
- Module layout and exports
    - Subpath exports are defined in package.json (e.g., r3-utils/access-control, r3-utils/http-client, etc.) and must
      correspond to dist/<area>/index.{js,d.ts} produced by tsdown.
- TypeScript configuration
    - TS path alias ~/* -> ./src/* (tsconfig.json + vite-tsconfig-paths plugin). Tests and source can import like
      import {...} from "~/utils/...".
    - Strict TS settings (noUnusedLocals/Parameters, isolatedModules, etc.).
- tsdown specifics
    - unbundle: true (keeps external imports; do not rely on bundling side-effects).
    - dts: sourcemap enabled; sourcemaps enabled for JS as well.
    - external: ["node:process"]. If you reference other Node built-ins, add them here.

2) Testing

- Runner: Vitest with two projects configured in vitest.config.ts
    - browser project
        - Enabled via @vitest/browser-playwright provider with headless Chromium.
        - Includes only files matching **/*.browser.{test,spec}.(t|tsx|js|jsx|mjs|cjs|mts|cts).
        - Use vitest-browser-react to render components; imports like import { render } from "vitest-browser-react" are
          supported (see src/access-control/__tests__/*.browser.test.tsx).
    - node project
        - environment: node
        - Excludes browser tests (pattern above) and includes the rest: **/*.{test,spec}.(t|tsx|js|jsx|mjs|cjs|mts|cts).
    - Both projects have typecheck.enabled = true, so tests are type-checked.

- Commands (verified)
    - Run the full suite with type-checking and a pre-build step:
        - pnpm test (runs pretest: tsdown build first, then both Vitest projects)
    - Run a specific Node test without triggering the pretest build (faster dev loop):
        - pnpm exec vitest run path/to/my.test.ts
    - Run only browser tests (match pattern used by the browser project):
        - pnpm exec vitest run "src/**/*.browser.test.tsx"
    - Watch mode while developing (no pretest):
        - pnpm exec vitest
    - Coverage (v8):
        - pnpm exec vitest run --coverage

- Creating and running a simple test (demonstrated locally)
    1. Create a file, e.g., src/__tests__/junie-smoke.test.ts with:
       import { describe, expect, it } from "vitest";
       describe("junie setup smoke test", () => {
       it("adds numbers correctly", () => {
       expect(1 + 1).toBe(2);
       });
       });
    2. Execute only that test (bypasses the pretest build):
       pnpm exec vitest run src/__tests__/junie-smoke.test.ts
       Expected: 1 passed (verified on Nov 22, 2025).
    3. Remove the file when done (we keep the repo clean):
       rm src/__tests__/junie-smoke.test.ts

- Adding new tests
    - Node vs browser choice is by filename:
        - Use .browser.test.tsx for DOM/component tests that need a real browser environment and vitest-browser-react.
        - Use .test.ts or .test.tsx for pure logic, Node, or JSDOM-free tests.
    - Organize tests either colocated next to source files or under __tests__/ or tests/ folders. Current repo uses
      both; Vitest include patterns already cover them.
    - Import via the ~ alias to avoid deep relative paths in tests.
    - HTTP client tests use axios-mock-adapter (see src/http-client/tests/*); prefer mocking at the HTTP boundary rather
      than stubbing internal utilities.
    - Access control component tests demonstrate how to render providers via a helper (
      src/access-control/access-control-test-utils.tsx). Reuse this pattern for component tests that depend on context.

- Known quirks / tips
    - The package.json script test:browser references vitest.browser.config.ts, which does not exist. Prefer using the
      primary config with a pattern filter:
        - pnpm exec vitest run "src/**/*.browser.test.tsx"
    - pnpm test will first run tsdown (pretest). During tight TDD loops, prefer pnpm exec vitest ... to bypass the
      pre-build and iterate faster.
    - Browser tests run headless Chromium via the @vitest/browser-playwright provider; ports are auto-selected if one is
      in use.

3) Additional development information

- Linting and formatting
    - Lint: pnpm lint (oxlint)
    - Format: pnpm format (Prettier + organize-imports + Prettier OXC plugin)
    - Pre-commit: husky + lint-staged run oxlint and prettier on staged files.

- Type checking
    - pnpm typecheck (tsc) or rely on Vitest’s project-level typecheck on every test run.

- Release and versioning
    - Build is required before publish (prepublishOnly runs build).
    - Release helpers: release:* scripts bump version and publish with the appropriate tag (alpha/beta support
      included).

- Libraries and peer dependencies
    - React 18/19, react-dom 19, react-router 7 are peer deps; ensure consuming apps provide compatible versions.
    - Path alias ~ is part of public imports inside the repo; do not export it to consumers. Keep it internal.

- Debugging tips
    - When a test unexpectedly runs in the wrong environment, check the filename pattern; .browser.test.* is the switch.
    - If tsdown build output seems stale, clean dist/ and rebuild: pnpm run build or remove dist/ manually.
    - Because tsdown uses unbundle: true, runtime resolution of peer deps happens in the consumer app. Verify peer
      versions in consuming projects when debugging import errors.

Housekeeping for this note

- The example test described above was created, executed successfully, and then removed to keep the repo clean. No
  changes were made outside this .junie/guidelines.md file.
- use tryCatch utility instead of try/catch blocks in tests and other code.
