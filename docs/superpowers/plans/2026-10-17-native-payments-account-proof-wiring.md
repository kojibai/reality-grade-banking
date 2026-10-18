# Native payments and account-proof wiring

Continue inline on Bankeiz main and the isolated Receiz main checkout. The user
authorized implementation, tests and local commits in both repositories; the
user pushes. Keep both user working branches untouched. No SQL, live financial
transactions, new signing roots or SDK/MCP/AI package changes.

## Sources and compatibility

Use the existing v129 canonical Record/Seal verifier, device identity consent,
native account/key history, shared action-ledger financial writer and public
account-statement/sharing source. Retain the current Bankeiz review, confirmation,
recovery, account-proof image, verification reader and sharing controls.

The previous generic prepared-operation contract is a proposed application
interface, not financial authority. Reuse the actual native financial source and
its accepted effect. Never manufacture an SDK-issued committed execution from a
generic append or an echoed request. Record any required transport adaptation
in the execution ledger and contract.

## Task 1 — account-proof transport and startup

- Reproduce the native v2 client transport refusal before implementation.
- Make v2 availability use its existing pinned financial-root verification;
  keep the distinct legacy writer allowlist and refuse user-sealed declarations.
- Select the existing native producer/sharing runtime from trusted startup
  configuration, with consistent account/wallet directories and application.
- Preserve authenticated current identity, complete source coverage, explicit
  publication consent, revocation and immutable snapshots. Missing or unsupported
  source scope refuses; it must not become a zero account.
- Test actual source production, publication, anonymous snapshot/live reads,
  revocation, restart, configuration conflict and client verification.

## Task 2 — native payment preparation, execution and recovery

- Compose the existing native transfer planner and the same locked financial
  writer with the current v129 authenticated caller and exact device consent.
- Preparation performs no debit. Bind the exact application, account, recipient,
  rail, amount, price basis, both source heads, nonce and expiry.
- Do not expose the recipient's balances or private account sources. Any public
  financial projection must derive from the accepted native financial source and
  carry its existing financial-root attestation beneath canonical Record/Seal.
- Preserve original intents across response loss and restart. Recovery is
  read-only, exact and once-only; it never submits another payment.
- Connect Bankeiz's existing review and recovery surfaces without replacing the
  generic SDK recovery type with a fabricated successful object.
- Test genuine source debit/credit, independent proof reopening, conservation,
  exact retry, stale heads, overdraw, recipient/app/consent substitution, expiry,
  revocation races, privacy and zero-write refusal.

## Task 3 — final verification and local commits

- Run relevant native source/financial/account-proof regressions, source and
  package reproducibility checks, Bankeiz tests, types and production build.
- Obtain one fresh whole-change review; resolve material findings with observed
  failing/passing regressions and preserve evidence in the ignored ledger.
- Commit only reviewed files on both mains. State implemented scope and any
  actual deployed/device/source qualification still absent. Do not call an
  unavailable financial source operational from transport or fixture success.
