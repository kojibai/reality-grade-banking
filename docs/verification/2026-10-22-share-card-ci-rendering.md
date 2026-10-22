# Share-card native rendering — CI follow-up

October 22, 2026 · Product 3.0.0 · Receiz packages 129.0.0.

## Observed failure

[Actions run 166](https://github.com/kojibai/reality-grade-banking/actions/runs/39872298636)
passed 2,430 tests and timed out one share-cover integration case. That case
renders three full-size 1,730 × 909 PNGs and compares their exact bytes for a
missing cover and an untrusted URL. It took 5,167 ms on the shared Linux runner,
exceeding Vitest's default 5,000 ms allowance. The log reports a timeout, not
an incorrect image assertion. Another three-render case took 4,863 ms.

The mocked failed fetch rejects immediately. Its delay is not a real network
request. The same suite completes locally; shared-runner native rasterization
needs a budget appropriate to its actual work.

## Correction and scope

Only `tests/asset-share-cover.test.ts` receives a 15,000 ms per-case budget
through its enclosing suite. All 17 cases, exact PNG/pixel comparisons,
single-request/coalescing checks, untrusted-URL refusal, format/size rejection,
stream cancellation and stalled-request assertions remain active. There are no
retries or skipped cases. Other tests keep their existing deadlines.

The application renderer and its 3,000 ms artwork-download abort are unchanged.
This correction adds no production calls, delay, cache, payment or UI change.

## Verification

Run the affected rendering files and TypeScript first, then reproduce the full
suite and publish its source-bound engineering record. The complete build and
clean source-archive rebuild verify the distribution after that record changes.

```sh
npm test -- --maxWorkers=4 tests/asset-share-cover.test.ts tests/asset-share-art.test.ts
npm run typecheck
node scripts/conformance-baseline.mjs --snapshot /tmp/bankeiz-ci-test-sources.json
npm test -- --maxWorkers=4 --reporter=default --reporter=json --outputFile=/tmp/bankeiz-ci-vitest.json
node scripts/conformance-baseline.mjs /tmp/bankeiz-ci-vitest.json --sources /tmp/bankeiz-ci-test-sources.json
npm run release:check
npm run receiver:check
npm run native:check
npm run native:rebuild -- --sdk
npm run build
npm run source:verify -- --rebuild
```

The committed engineering record contains the actual test results and source
hashes. A local pass does not substitute for the new pushed commit's Actions
result; the failed older runs retain their original history.
