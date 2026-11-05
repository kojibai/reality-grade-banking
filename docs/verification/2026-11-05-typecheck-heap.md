# TypeScript compiler heap — 2026-11-05

The reported `npm run typecheck` failure is a V8 heap exhaustion during the strict compiler pass. The process aborts near its 2GiB old-space ceiling, before a successful typecheck result. This is distinct from an application memory measurement or a TypeScript diagnostic.

Reproduced against clean Bankeiz commit `3cffd8d56ad4368d0022b640480931e0da602b35` with locked dependencies:

- `node --max-old-space-size=2048 ./node_modules/typescript/bin/tsc -b --pretty false --extendedDiagnostics` aborts with the same heap-limit failure.
- The identical compiler and project with `--max-old-space-size=4096` exits0. Diagnostics report2,203,902K memory and26.4s build time in this local run.
- Corrected `npm run typecheck -- --extendedDiagnostics` under a parent `NODE_OPTIONS=--max-old-space-size=2048` exits0; the compiler-specific CLI budget takes precedence. Diagnostics report2,351,989K and23.13s. Timing/GC totals are observations, not performance guarantees.

The compiler loads the app/server/tests together and resolves the existing large public JSON datasets. Those datasets, tsconfig, strict checks and dependencies were unchanged by3cffd8d. Local verification had a larger default Node heap, explaining why it passed locally while the supplied lower-limit process aborted. Read-only GitHub inspection also showed3cffd8d typecheck/build steps passing on its runner.

Only two package scripts change: typecheck launches the installed compiler with an explicit4GiB heap ceiling; the existing build compiler step invokes that same typecheck script once. No global NODE_OPTIONS, dependency, tsconfig exclusion, proof/financial guard, browser resource, account entry or runtime implementation changes. This controls a compiler limit, not a hosted machine’s physical RAM allocation.

Local reproduction and diagnostics: `output/typecheck-memory-20261105/`. The correction still requires push/remote-run verification; no deployment or remote runner configuration is performed by this task.
