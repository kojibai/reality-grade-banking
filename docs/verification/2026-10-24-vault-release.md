# Vault release verification

The expanded Vault plan is implemented in Bank over the corresponding Receiz
custody contracts. Identity exposes lazy Vault entry and optional passkey
connection. The existing entrance fingerprint opens the existing PBI ceremony;
ordinary Enter and Identity Record entry keep their established behavior.

## Implemented scope

- Multiple private Vault originals, optional passkey protection, exact prepared
  original saving/reopening before a financial action, encrypted local journal
  retention and current-owner admission.
- Actual connected balance/card funding, in-kind native asset and Market
  investment custody, original-account returns and direct sending under the
  existing native financial/ownership contracts.
- Exact accepted-operation recovery, retained original sources, capacity before
  mutation, unchanged-custody successor admission and no replacement execution
  after an unknown result.
- Separate selected public proof, QR locator and dedicated public reader. Public
  evidence grants no login, unlock or spending authority. Publishing a record is
  explicit; a locator cannot retrieve an unpublished record.
- Standalone credential-free browser/CLI inspection with complete corresponding
  sources, canonical artifact verification, pinned issuer material and allowlisted
  machine-readable output. A protected unopened file is reported as unopened.
- Plain-language public Vault page and independent-reader instructions in
  `docs/vaults.md`.

No Vault source inspection, custody opening or native Vault runtime load is
added to ordinary account startup, Ledger, Market or public asset first paint.
The public route has its own entry; the independent reader kit is excluded from
ordinary offline precaching.

## Verification

- Full Bank suite: **2,892 tests in 465 files passed, zero skipped**.
- Bank TypeScript: zero diagnostics. Full production build passed, including
  native runtime reproduction, source archive, licenses, canonical metadata,
  offline-shell checks and entry/chunk isolation gates.
- The imported native Vault runtime contains 190 exact source/license files and
  rebuilds as a self-contained browser module from 178 code inputs.
- The standalone reader bundles 253 inputs; native production trust roots reject
  the ephemeral test issuer. A separate fixed-fixture reader admits authentic
  private/public Originals offline with no external requests; adversarial and
  substituted sources are refused.
- Mobile/desktop browser checks cover actual Vault UI with synthetic controllers,
  public entry, public copy, independent reader, ordinary navigation and installed
  offline shell. Synthetic credentials are not real Face ID or provider recovery.
- Independent review's two Important findings and one UI follow-up were corrected
  and rechecked. Actual native/controller fixtures exercise lost responses,
  historical asset source recovery, exact original-account returns and in-kind
  ownership conservation.
- Receiz full TypeScript passed with an 8 GiB heap; account-entry freeze passed
  57/57; primitive-binding, source-authority and repository-boundary gates passed.
  The scoped Market contracts passed; eight previously recorded wider Market
  baseline failures remain outside this change. No whole Receiz test-suite pass
  or real financial/provider qualification is claimed.

## Production preservation

The user approved the Vault custody migration, applied as
`20261024220648_vault_market_share_custody` in production. Existing counts,
complete row fingerprints and column layouts matched before/after for 343
wallets, 83 positions, 1,635 Ledger entries and 501 trades. All 13 existing
Ledger/funding function definitions remained byte-for-byte identical. The new
custody tables are empty; the new quote view matches existing quantities exactly.
No deletion, historical rebuild or financial execution was performed.

A rejected first migration attempt rolled back transactionally because pgcrypto
is installed in the production `extensions` schema. Receiz follow-up
`967f26759` uses the equivalent built-in SHA-256 at two metadata-hash sites and
qualifies the real extension layout. The actual PostgreSQL fixture passed,
including concurrency and once-only return checks. This correction is SQL
portability; it changes no financial equation or ordinary Ledger reader.

## Remaining qualification boundaries

Opening and inspecting saved contents works offline. Funding, moving, sending
and returning value use the connected contracts in this release. Fully offline
financial execution remains a separate integration task. Real-device passkey
support and replacement-provider recovery require supported-device qualification.
No real funds, production checkout or device credential enrollment was used for
these tests. Application deployment and pushing remain with the user.
