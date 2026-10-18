# Crystal Ledger bridge verification — 18 October 2026

## Changed

Receiz main commit: `e57a07f2f` (`feat(ledger): bridge public sources to Crystal custody`).

Receiz's existing public Ledger API now selects configured Crystal URL/key custody.
The host extension mounts the same native source reader and public original
publication store under authenticated `/v1/ledger/proof`. Exact source-head
approval remains on the durable host. Bankeiz's reader, artwork, review, consent,
API contract and UI are unchanged.

The Crystal service launcher is not present on current Receiz main. Its narrow
mounting patch is committed with the bridge and was checked against the existing
infrastructure source. That patch was applied only to a temporary executable
copy for integration checks. The user's source working branch was not edited.

## Primitive preserved

The original runtime-admitted Action Ledger supplies public native history.
No public row array, API flag, image, URL, cached count or empty directory becomes
proof authority. Exact originals, real carried Kai, full declared continuity,
fixed native roots, explicit original publication consent and private-source
refusal keep their existing canonical v129 checks. Financial admission stays false.

## Risk boundary

A selected unavailable Crystal host refuses rather than falling back. The
transport key never reaches a browser; cookies, private account selectors,
provider redirects and arbitrary target URLs are not forwarded. The mounting
patch retains Crystal's authenticated request pool and public-origin guard.

One Important review finding was reproduced: raw source writes bypassed Crystal
capacity. The fix injects the existing metered source storage path, reserving
public package bytes/inodes before temporary custody and committing through the
streaming canonical install hook. A valid original was then refused with status
503 under a 12-byte quota and was absent from exact-digest public reads (404).

## Checks run

- Native original/carrier/source/publication/API/Crystal suite: 12 passed.
- Bankeiz's unchanged relay contract: 2 passed.
- Real Node HTTP with canonical native fixture: exact original, consent,
  duplicate retry, fresh-host discovery, current disclosure approval and refusal.
- Actual existing Crystal HTTP handler from an isolated patched copy: health,
  auth, native current, exact original, discovery and repeated publication.
- Actual host shared-quota refusal and continued outer origin enforcement.
- Scoped native TypeScript and ESLint: passed.
- Next production compiler for the changed Ledger route: passed in 63 seconds.
- Compiled route selected the fixed Crystal path with synthetic transport config.
- The mounting patch passes `git apply --check` against the infrastructure source.

Fixtures use ephemeral test issuer roots only in isolated processes. No real
funds, private customer originals, production signing keys or production public
publication were used. No full-host typecheck or financial qualification is claimed.

## Visual evidence

No frontend component, style, font, layout, artwork or navigation changed.
The live Bankeiz Ledger returned 200. Previous browser qualification remains
recorded in the public Ledger release report; no new UI pass is inferred from
these server tests.

## Production activation still required

The pushed Receiz deployment aafcb5458 is READY and its Ledger API exists. Both
its source/discovery operation and Bankeiz's relay currently return 503
`PUBLIC_LEDGER_SOURCE_UNAVAILABLE`. The production Receiz project has no Crystal
URL/key or source-directory/disclosure settings. The running Crystal service
URL/workspace was not supplied during this check.

Apply the mounting patch on isolated main containing the merged Crystal service,
deploy it against existing admitted durable custody, configure the existing
server-only Crystal URL/key and allowed Bankeiz origin, then approve the exact
native disclosure head. Finally qualify a production saved/reopened Memory
Crystal and consented synthetic publication. Software integration does not
substitute for those deployment and disclosure steps.

## No downgrade

SDK/MCP/AI Skills remain v129. The Bankeiz experience is unchanged. No SQL,
working-branch edit, production credential write, source initialization,
financial transaction, push or deployment was performed by this continuation.
