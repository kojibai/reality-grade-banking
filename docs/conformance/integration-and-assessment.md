# Implement and assess the open receiving standard

The Reality-Grade Banking receiving profile is a published technical contract.
A compatible implementation may use any language and supply its own user
interface, transport, verifier integration, authority and durable execution
adapter. No Bankeiz account, operator assistance, permission, purchase or badge
is required to implement the standard or independently assess it. Applicable
software licenses and admitted financial trust policies remain explicit.
[CONFORMANCE.md](../../CONFORMANCE.md) describes truthful claims and GPL rights.

The normative inputs are the [receiving standard](../../institution/receiving-standard.md),
[receiver profile](../../institution/receiver-profile.json), [Note continuity
laws](../note-continuity-standard.md), [connected Note contract](../connected-notes-v129.md),
[account-destination contract](../note-account-deposit-v129.md), and
[native assets/account proofs](../native-assets-and-account-proofs-v129.md).
The [coverage registry](../../src/conformance/coverage.json) connects all 16
receiving requirements and NOTE-01 through NOTE-14 to actual implementation
files, tests, applicable local checks, remediation and remaining evidence. It
is an audit index beneath those specifications; it does not redefine their laws.

## Three separate results

| Result | What actually runs | What a pass establishes |
| --- | --- | --- |
| Bankeiz implementation engineering evidence | The repository's actual Vitest tests, including their declared canonical-source, signing-root, financial-adapter and browser fixtures | The named assertions passed against the recorded exact sources. Fixture trust, simulated funding and test-only adapters stay explicit. |
| Public integration contract testbench | The selected adapter executes JSON requests; the independent harness compares raw values/state to recomputed expectations | The selected adapter passed those synthetic arithmetic, exact-intent, atomic-store, Note component, asset component and KaiSigil/KKS reference cases. |
| Production receiving-profile assessment | Original evidence is reopened with supported canonical verifiers; the full requirement matrix includes durable host, hardware and independent assessment evidence | Every applicable requirement must be independently established for the named implementation, capability, rail, build and environment. Missing proof fails the assessment. |

A local contract PASS is legitimate within its stated scope. It is not a
production financial or hardware PASS. The current automated production
checker cannot establish every receiving invariant from uploaded reports and
originals alone. [Verification availability](verification-availability.md)
identifies those exact boundaries. A report's `passed`, `verified`, HTTP status
or claimed conformance fields are never accepted as authority.

## Reproduce the reference without a Bankeiz service

Use Node.js 24 or later and the checked-in lockfile. The documented Node
commands use native TypeScript stripping and the public installed package
exports. Receiz SDK, MCP and AI Skills are third-party pinned release 129.0.0;
registry/ruleset and operation-matrix coordinates are in the receiving profile.

```sh
npm ci
npm ls @receiz/sdk @receiz/mcp-server @receiz/ai-skills
npm run release:check
node scripts/conformance-reference.mjs > reference-evidence.json
node scripts/conformance-contract.mjs --adapter node scripts/conformance-adapter.mjs > contract-evidence.json
node scripts/conformance-contract.mjs --verify contract-evidence.json > contract-replay.json
node scripts/conformance-baseline.mjs --snapshot /tmp/bankeiz-test-sources.json
npx vitest run --maxWorkers=4 --reporter=json --outputFile=/tmp/bankeiz-vitest.json
node scripts/conformance-baseline.mjs /tmp/bankeiz-vitest.json --sources /tmp/bankeiz-test-sources.json
```

The reference command checks the actual installed SDK/registry, exact native
verifier bytes, canonical 11-vector temporal suite and five nonfinancial
SDK/integration suites. It records actual vector observations, source hashes,
worktree identity and the full coverage registry. The SDK's canonical worker
threads are terminated only after awaited checks and stdout flushing finish.
No account, signing capability, real funding, claim, transfer or host write is
opened by the reference runner.

The baseline producer consumes a fresh Vitest JSON report. It publishes only
public test names, outcomes, durations and exact test/source hashes; it excludes
raw failure output, customer inputs and credentials. It records skipped tests
as skipped. The baseline's own output is excluded from its source digest to
avoid self-reference. Reproduce the recorded command at those exact hashes;
a copied JSON file is not an independent execution attestation. A dirty
worktree is identified by actual file hashes, not attributed solely to HEAD.
Capture the complete source/resource snapshot before the test run; the producer
compares exact hashes afterward. Deterministic verifier regeneration may touch
modification times during tests without changing bytes. A changed, added or
removed source still refuses the evidence record. Without a snapshot, the
producer applies the stricter modification-time guard.

## Active adapter testbench

Implement an executable that reads **one JSON request from stdin**, writes
**one JSON response to stdout**, then exits. Logs belong on stderr. The harness
starts a fresh process per case, supplies a new nonce, limits response size to
1 MiB, and times out each case after 10 seconds. It never interprets stdout as
code. Run your own program only in an isolated realm you authorize; the
provided reference adapter uses synthetic inputs and in-memory state.

```sh
node scripts/conformance-contract.mjs --adapter /absolute/path/to/your-adapter > your-contract-run.json
node scripts/conformance-contract.mjs --verify your-contract-run.json
```

For a Python adapter, for example, pass `--adapter python3 /absolute/path/adapter.py`.
No shell command string is evaluated. The command's executable and supplied
file arguments are hashed into the recorded implementation identity. Dependencies
or an external service used by your adapter must be documented and independently
identified by your own reproducible build manifest; this runner does not audit
all transitive external software.

The authoritative request generator and independent expected-output computation
are [contract.ts](../../src/conformance/contract.ts). The actual Bankeiz
[reference adapter](../../scripts/conformance-adapter.mjs) uses the installed
SDK's public functions and the existing Bankeiz Note/asset component readers.
The browser can download the complete generated cases as JSON. Implement the
following operations:

| `operation` | Input and required raw response |
| --- | --- |
| `quote` | Exact decimal integer `amount`/`rate`; return the half-up rounded integer cents string. Invalid unsigned-positive encodings return the exact refusal code. |
| `validate-intent` | Complete synthetic value `plan`; return `{valid, digest}` using the canonical exact intent, rail, amount and participant heads. Mutations must refuse. A valid plan does not supply funding. |
| `restore` | Canonical retained transaction `saved`; return its complete restored object, including opaque future namespace. Changed digest/bytes return the canonical refusal code. |
| `store-scenario` | `unit` plus `normal`, `limited` or `crash` mode; execute the actual isolated store scenario and return raw outcome codes, current aggregate and collection counts. Normal mode commits once, resolves identical retry and rejects changed-command reuse. The other modes leave no effects. |
| `note-funding` | `amount`, exact synthetic `quote` and optional historical single-rail constraint; return the exact Reserve-first allocation and signed component shape or refusal. All three Note types are exercised. No account debit occurs. |
| `asset-components` | Ordered `components` plus exact `totals`; return the inspected complete components or canonical refusal. Changed, duplicated, reordered and extra fields refuse. This is not funded supply/ownership qualification. |
| `temporal-vectors` | Execute the canonical public KaiSigil/KKS reference suite; return each `checkId`, `outcomeCode` and actual `evidenceDigest`. The checker independently recomputes expected outcome/digest bindings. |

Errors are JSON objects such as `{"error":"V122_PHI_DISPLAY_QUOTE_INVALID"}`.
Do not return a `passed:true` wrapper. The current complete contract contains
33 cases, including the canonical temporal suite's 11 underlying positive and
mutation vectors. Expected output does not come from the adapter. The harness
compares complete outputs and binds request/response SHA-256. Altered,
duplicated, absent or substituted cases fail independent transcript reopening.

A browser replay recomputes the transcript; it cannot attest that another
machine executed its declared binary. Reproduce the active CLI run against
that exact executable. A dishonest adapter could fabricate its own output,
just as any test runner could be forged; independent execution/source review
is still necessary for a claim about deployed behavior.

After a passing contract run, **Save evidence object** creates a passive visual
SVG containing the complete canonical report and its SHA-256. Its front names
the assessed contract, implementation/build, passing case count and evidence
digest. The save path replays every case again. This is a portable, scoped
technical evidence record; it does not assert production financial qualification.

Reopen the saved SVG in the same transcript picker or verify it locally:

```sh
node scripts/conformance-contract.mjs --verify bankeiz-conformance-evidence.svg
```

The reader verifies the embedded bytes and independently recomputes the full
transcript. It also regenerates and compares the exact passive drawing, so a
changed title, missing metadata, script, external resource or altered evidence
is refused. A screenshot or image conversion that drops the embedded evidence
cannot substitute for the original saved object. No uploaded SVG is executed.

## Assess your full receiving implementation

1. Choose every supported substantive capability and rail. Apply all receiving
   invariants to that scope; a checkbox cannot waive an applicable law.
2. Implement the linked contract. Preserve complete originals before execution,
   current ownership, explicit consent, exact participant heads, admitted
   KaiSigil/KKS coordinates, exclusive allocation and exact-intent recovery.
3. Exercise all applicable positive, mutation, replay, concurrent and crash
   cases from [conformance-protocol.json](../../institution/conformance-protocol.json)
   in your authorized actual environment. The protocol lists complete lifecycle
   and positive financial evidence separately from synthetic negative cases.
4. Copy [the report template](../../institution/conformance-report.template.json),
   replace the implementation identity, and name exact original files and hashes.
   Each case record binds `id`, `rail`, canonical `caseDigest`,
   `implementationBuildSha256`, raw `observed` output and `evidenceSha256` array.
   Case digests use SHA-256 over UTF-8 JSON with recursively sorted object keys,
   array order preserved and no whitespace, as defined by the protocol.
5. Open the report and originals in **Assess your implementation** at
   `/conformance/#assess`, or run:

```sh
node scripts/conformance-assess.mjs your-report.json original-note.png full-credit.receipt > assessment.json
```

This command performs local read-only inspection only. It does not execute an
adapter or financial command. Exit 0 means the complete supported assessed
scope passes, 1 means an invalid report/binding/source or reported case failure,
and 2 means required proof is missing. The current production automation has
manual/unsupported requirements and cannot yield a complete live profile pass
merely from this input format. The template deliberately fails validation until
replaced with actual identity/evidence; it is not sample financial authority.

The checker independently compares profile/release/registry/matrix identity,
capability/rail scope, unique file names, exact original SHA-256, case coverage,
case/build/evidence bindings and known expected outcomes. Supported original
Note sources are canonically opened under the pinned verifier. Unsupported
formats stay explicitly unverified or refused; the checker does not fetch or
execute verifier code named by the report. Complete independent production
assessment is required for the remaining invariants. Required rows fail when
proof is missing, with separate reason codes for absent evidence versus
reported failure/invalid binding and concrete implementation/retest links.

The [complete independent assessment procedure](independent-assessment-procedure.md) supplies the full institutional path: scope → control objective → positive/negative/concurrency/crash procedure → required evidence → observed result → reviewer finding → remediation → rerun. Its full report template and schema require every control and explicit reviewer acceptance. This manual/physical evidence path is distinct from the partial local gap review; no project permission is needed.

## Preserve the financial boundary

Reserve keeps its original fixed-dollar denomination and historical backing.
Settlement keeps exact Phi; its printed USD is descriptive at creation. A
Settlement Reserve Note conserves both signed positive funding components.
Apply those same parts through issue, handover, account opening, credit and
cancellation; a mixed Note does not promise a fixed-dollar Settlement payout.

The qualified offline profile must irreversibly retire the exact predecessor
using assessed protected custody. The connected-account profile may retain a
recipient-bound handover offline; exclusive consumption and credit occur at
the selected connected writer. Retained/received value remains distinct from
confirmed credit and permission to spend. Reconciliation precedes new account
execution. A synchronized passkey, PRF key, browser lock, counter alone, pulse,
PNG copy or JSON label cannot supply protected custody.

Funded assets/shares require actual admitted backing and a conserved supply,
exact unit ownership, collateralized offers and atomic partial fills. Redemption
burns whole supply and releases original components once. Public listing
prices, intrinsic valuation, file attachments and a bank name cannot supply
liquidity, physical title or release authority. Use the actual native financial
suite and independent live evidence; the component contract is only one layer.

This repository's current connected financial execution uses the selected
Receiz host writer, protected financial signing context, admitted sources and
native durable integration. It is not made host-independent by this guide or
by installing an SDK. An independent implementation supplies compatible
verification, authority, roots/policy, actual backing, durable atomic execution,
recovery and independently inspectable receipts in its own realm. The published standard defines the compatible integration contract.

## Source and receipt inspection

The original-proof inspector is local and read-only. It supports held Note
PNG originals, connected carried sources, account-destination terminals and
complete supported native credit/cancellation archives through the read-only
verifier's existing exports. The current UI/CLI bound is 8 MiB per file. The
narrow receipt reader may expose only verified kind, rail, Note and receiver
coordinates; it does not invent absent amounts. No source is uploaded.

The same-origin verifier fetch retains same-origin credentials so a protected
preview can deliver its protected resource. It still hashes immutable bytes
against the pinned native build manifest before importing them. Login HTML,
changed verifier bytes and missing/invalid interfaces fail closed. Deployment
protection and digest checks remain enabled.

Carried verification does not acquire current custody, establish current
spendability or apply account credit. Full account proof inspection is a
separate supported read-only reader. Keep private customer originals, openings,
keys, tokens and attestation responses in authorized protected custody; publish
only appropriately consented safe evidence and scope.

## Identity-bound credentials and institution workspace

The suite reuses the device-held Receiz identity by default, or accepts an
existing Identity Record through the same canonical custody gate. A missing
identity can be created without a signup form. Identity preparation begins
after initial paint; it cannot award an assessment result. Changing or removing
identity custody invalidates the displayed holder and open workspace.

A passing public integration transcript can be saved as a Receiz-sealed PNG.
Its complete original transcript, checker provenance and exact scope are
carried inside the signed original. The holder printed on the certificate is
the admitted Receiz ID, not a caller-selected institution name. Independent
opening verifies the native proof, ownership continuity, displayed holder,
regenerated artwork and every contract observation. A signed but misleading
front image is refused. The same pinned renderer and fonts reproduce the
image on every device; their hashes are verified before use.

The public certificate establishes the recorded test result for its exact
scope/build. Its public ownership proof does not contain the holder's private
login key and does not establish a legal institution name or a funded receiving
qualification. Keep the private Identity Record as the access credential for
that same ID; use the public original for sharing and independent verification.

In **Assess implementation → Institution workspace**, open the public original.
The portal additionally requires canonical private admission of its matching
device-held Identity Record. This proves control rather than possession of a
copied public certificate. The workspace exposes its exact results and raw
evidence, preserves the original download, and links to the next assessment.
It grants no financial, host-receiving or operational API authority. A new
assessment must run against the institution's own adapter; running Bankeiz's
reference adapter does not test another implementation.

Verify a saved credential offline without an account or Bankeiz service:

```sh
npm run conformance:contracts -- --verify credential.png
```

Bankeiz's published original is signed under its owner-designated governance
Receiz ID. The build checks that exact public original, complete embedded
evidence and holder before displaying it. Its assessed build stays explicit;
a historical passing result is not silently promoted to a new build.
