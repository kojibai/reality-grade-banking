# Note continuity preparation — October 20, 2026

## Scope

The agreed product model has one Note experience. Qualified custody performs
exclusive consumption locally; other custody performs it through a connected
Receiz operation for the exact next transfer. An independently admitted
completed incoming transfer may be held offline; a candidate without final
consumption evidence remains pending. Neither UI nor a connection event grants
spend authority.

This change publishes that contract, all fourteen application requirements,
integration responsibilities, future accessory status and release gates. It
adds closed, static Note guidance and a technical Conformance section. It does
**not** implement the connected consumption profile or qualify any financial
path. Product 1.0.0 publication is held.

## Source audit

- `native/receiz/packages/receiz-sdk/src/httpOperationSupport.ts` explicitly
  classifies `connect.mintNote` as a disabled legacy mint and `connect.claimNote`
  as a legacy token claim. Presence in the SDK is not the required new path.
- `native/receiz/app/lib/wallet/kairosNoteLocalTransition.ts` supports an
  identity-bound packet and a local in-memory accepted-head store. Its signature
  and local head comparison do not supply shared exclusion after restoration.
- `native/receiz/packages/receiz-sdk/src/globalReconciliation.ts` and
  `remoteArtifactTransitionStore.ts` provide generic verification and named-domain
  machinery. They are not an already qualified connected Note funding domain.
- The current upstream checkout's `app/api/wallet/notes/mint/commit/route.ts`
  returns `offline_note_local_proof_commit_required` with HTTP 409. Its
  `mint/prepare` sibling also refuses connected issuance. Re-enabling unreachable
  legacy mint code would not implement this contract.
- The retained Bank native extension must be reconciled with the current host:
  this audit did not find its `app/api/connect/offline-notes` directory in that
  upstream checkout. Source presence elsewhere is not deployed-route evidence.

Required Receiz capability: an admitted connected Note custody/consumption
profile, complete accepted proof return, atomic funding/head/redemption rules,
exact-intent resolution and exclusive migration to/from local qualified
custody. It must preserve existing v129 qualified checks. The actual compatible
schema/API determines whether a host addition suffices or coordinated package
publication is needed. Bankeiz does not manufacture that authority.

## Checks performed

- Seven focused files: 59 tests passed, including the actual v129 strict-counter
  and rollback composition tests with a synthetic physical provider.
- Final full suite: 274 files / 1,662 tests passed with two workers. Guidance
  checks cover all fourteen requirements, opt-in navigation and unavailable
  execution/accessory states. A Happy DOM `snarkjs.min.js` script-loading
  diagnostic was emitted during that run; Vitest reported no failed tests.
- Typecheck passed. Production build passed, including separate Conformance
  graph, public metadata, exact offline resources, source archive and licensing.
- Guidance opens without any network request, device capability ceremony or
  added execution controls. The existing Note inventory/action behavior remains.
- The 390-pixel Conformance and Note fixtures had no horizontal overflow or
  relevant console errors. The device-evidence link opened the correct section;
  its test button remained disabled without user consent. No diagnostic passkey
  was created. The Note fixture was explicitly disconnected from money.
- The built public guide was also checked through the production preview at
  `127.0.0.1:5432`: the offline section, standard link, all fourteen requirements
  and guide → Conformance navigation rendered at 390 pixels with no horizontal
  overflow or relevant browser warnings/errors. The ordinary Note fixture was
  inspected at both desktop and mobile width. The preview needed an authorized
  local server bind; an earlier connection-refused attempt was corrected after
  that server started.

These are documentation, UI and regression checks. They do not establish
ordinary-browser connected consumption, real-device financial qualification,
current-head admission on a production host or a live Note transfer.

## MCP parity boundary

The connected `receiz_conformance_run` returned 15 passing sandbox checks,
zero network/database calls and SDK **128.0.0**. Its context reported ruleset
127.0.0, registry digest
`8d0b5b839d02d9efbd4306cc99410595a183705c2670b76d2567eaaaade99065`,
simulation-only authority, an unconfigured state machine and no allowed
commands. Its evidence digest was
`49b3d6ca475c0fe43b92d5c5d4d3ab4463aed4c41eb1e70febc6f478d4867bcd`.

This workspace's package, lockfile, installed SDK/MCP/AI Skills and native source
pin **129.0.0** and pass the build's version-alignment check. The connected
MCP result is therefore not matching v129 release qualification or financial
evidence. An attempted direct `runReceizConformance` import also established
that this helper is not exported by the installed SDK's public entry point;
it was not replaced by a fabricated successful result.

`npm run receiver:check` subsequently exercised the **installed v129 MCP**
through its existing runtime. All nine reference checks passed; both
`receiz_conformance_run` and `receiz_release_verify` returned 15 passing sandbox
checks, zero network/database calls and evidence digest
`8a695e2c386c9224c5586627ed5340e07cb197d5480b634d7424f28317f2ca96`.
The eleven real KaiSigil temporal-authority vector checks also passed, with
report digest
`71c5e815002de46fff91c497c2fd50a39b29db8d74c74b646edac5630c6ec976`.
The report explicitly grants no production access or credit and leaves the
institution unassessed. This supplies matching local reference evidence;
it does not fill the connected Note or real-device financial evidence gaps.

No financial capability was enabled, custody record reset, real-device test
run, production schema changed, release tag created or deployment published.
