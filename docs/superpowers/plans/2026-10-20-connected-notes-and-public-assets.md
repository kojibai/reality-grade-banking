# Connected Notes and public asset publication

Approved scope: complete online Note creation without attested device custody,
and publish every explicitly created public asset through the existing Receiz
Showcase and Market pipeline. Commit on main; the user pushes. Qualification
precedes product 1.0.0 publication.

## Contract

Connected issuance is an explicit application profile over Receiz v129's
existing signed source, bound identity and shared native wallet writer. It
cannot impersonate qualified custody or relax its counters, attestation,
exclusive consumption or rollback checks. Online creation reserves the exact
value once. A separate Note authority key stays in encrypted device custody;
it is absent from the public image and host request. A signed offline handover
binds the complete funded original to the recipient's signed request. The
recipient retains that source offline, with exclusive consumption and account
credit admitted together on connection before spending. A retained offline
handover is not already-confirmed irreversible consumption.

Public asset creation seals once, retains the exact original and normalized
intent, then uses Receiz's existing canonical Showcase source/vault/publication
pipeline. The public profile and Market receive the accepted addition. A local
holding, upload or database row cannot stand in for public completion. Lost
responses reuse the same source and request; they never reseal or post again as
a new asset. Existing known account and public first paint stay unchanged.

## Work

1. Add an explicit Receiz connected Note protocol and atomic native-writer
   effects, financial attestation and bounded issue/claim/recovery routes.
   Refuse altered recipient/source/rail/amount, stale heads, missing current key
   authority, cross-profile substitutions and duplicate funding/credit. Retain
   unknown operations; cancellation needs a native tombstone, not an HTTP guess.
2. Compose the Bank connected Note runtime in the existing encrypted vault.
   Persist private Note key and exact signed request before submission. Receive
   through the existing retained-deposit queue. Persist prepared claims before
   any request, recover the original outcome, and update balances from verified
   account openings. Reuse the Note UI and existing account access.
3. Export a narrow Receiz Showcase browser bridge and delegated connector that
   reuse canonical admission, append, source custody and publication. Connect
   Bank creation with durable exact-original recovery and explicit public copy.
4. Include complete corresponding sources and rebuild the lazy native modules.
   Extend only the exact allowlisted routes/scopes required by these operations.
5. Run meaningful orchestration, actual cryptographic source and native writer
   race/replay/reopen/refusal tests; review the financial patch independently;
   run application suites, type/build/native/source/license checks and mobile UI
   checks. Commit verified work on main without push, live money or release.

## Review focus

- A restored nonconforming sender cannot cause two confirmed credits.
- A lost response cannot create a second debit, claim or public original.
- Submission/cancellation races preserve the exact funded amount and source.
- Signed source, native allocation and returned private opening agree exactly.
- The private Note key never enters a public source, image, logs or host request.
- Public asset completion includes canonical profile and Market publication.
- Existing qualified custody refuses every previous rollback/attestation case.
- Encrypted pending sources and keys cannot be removed by identity replacement.
- No new polling, blocking first-paint work or duplicate backend is introduced.

Physical/deployed qualification, real funded acceptance and version 1.0.0
publication are subsequent explicit gates, not claims established by code tests.
