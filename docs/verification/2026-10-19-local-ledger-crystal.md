# Local public Ledger Crystal — 19 October 2026

## Result

The public `/ledger/` Memory Crystal now seals the data already held by that
Ledger. It does not request another Ledger source, reload rows, wait for Crystal
hosting, or substitute the visible list window for the complete local capture.
The signed-in Ledger has its prior controls. Deposit says **An asset** in both
the live and demonstration flows.

Every locally held public record is carried with its existing public inspection
fields, hashes, proof fields, valuation operands and source coverage. Filtering
the visible page does not narrow the saved capture. Empty, duplicate, private or
over-capacity inputs fail rather than returning a silently shortened archive.
Displayed event values, current quotes and supported calculation context are
captured separately from the immutable record fields, so reopening preserves
the prices seen at capture without adopting newer market inputs.

The existing institutional PNG artwork carries the compressed local data. The
installed v129 `createReceizOfflineSealer` seals the exact image; the pinned
canonical reader reopens the final bytes and checks all embedded data before
download. The existing public device signer/resources are reused. Its first
enrollment remains the SDK's one-time device operation, not a Ledger data read.
No account identity, custody, note state or antirollback rule is changed.

A locally sealed capture authenticates the image and its carried observations.
It does not claim the independent root signature or native source continuity of
the separate `receiz.public-action-ledger.v1` domain. Those existing checks remain
unchanged. Local archives cannot be published through that native source route
or replace its retained head.

## Reopening

Open the downloaded PNG with **Open proof**. After canonical verification, its
review offers the exact sealed image, all carried history as JSON, local
retention and **Open captured Ledger**. The captured view uses the existing
search, filters, receipts and inspectors. It has its captured source coverage
and no background source reads. Returning to the live Ledger resumes its
existing public readers. No imported archive is installed as financial history.

The gzip expansion is bounded to its declared byte length and at most 64 MiB;
compressed data, PNG carrier and final image also retain explicit limits.
Record count and SHA-256 must agree after decompression. Canonical image
verification precedes decompression or domain admission.

## Actual saved artifact

Browser save, with search showing only three matching rows:

- Saved records: **47,302**.
- File: `bankeiz-ledger-dcb1a3b48615b8d0.png`.
- Bytes: **17,412,734**.
- Artifact SHA-256:
  `e471bb496e2806367bb670732833e3797dc65ef8bda57aa8cf5c524cef7258e1`.
- Embedded history SHA-256:
  `dcb1a3b48615b8d07dd8b611cdc86a3b2ce67987409076705d0c9ef2033436a9`.
- Carried seal coordinate: **14,724,972**.
- Installed SDK `verifyReceizOfflineSealedFile`: `ok: true`, integrity true,
  no errors, PNG, Poseidon and Groth16 present.
- Independent verification with `fetch` replaced by a throwing function:
  **zero network calls**.
- Fresh-page file reopening: **Ledger Crystal verified**, 47,302 records.
- Captured view reopened and found the individual card's two $33.52 transfer
  rows from their carried operands, without another valuation/source read.

No payment, account creation, public publication, source-host deployment or
production configuration change was performed for this verification.

A second real save includes the captured displayed prices:

- File: `bankeiz-ledger-438a4dd0a5dba9a0.png`.
- Records: **47,307**; carried display-value contexts: **3,184**.
- Bytes: **17,655,779**; expanded history: **59,777,384** bytes.
- Artifact SHA-256:
  `6131bb91b77f7c0b32ad8c9871bafb856b68dd850f80ba614ab4a9a88d3d0ff2`.
- Embedded history SHA-256:
  `438a4dd0a5dba9a08f0e4a39998c31922595044431b7cd502f1811d4408c0b0b`.
- Carried seal coordinate: **14,725,127**.
- Independent production SDK verification: integrity true, no errors,
  Poseidon/Groth16 present, **zero network calls**.
- The Guerrero transfer remains **$33.52** at pulse 12,109,879 and separately
  carries **$126.26** at the captured current pulse 14,725,126.

Archive preparation skips valuation for action rows without monetary operands
or asset references and reuses the event value in its calculation-context pass.
This removes duplicate valuation work without omitting any record.

## Automated coverage

Tests cover complete production-seed field equality, more than 60 carried rows,
source coverage, zero Ledger fetches on save, private/duplicate/empty refusal,
expansion/count/digest checks, unsigned and modified image refusal, exact image
round trip, archive controls, and unchanged native source continuity. Synthetic
reader tests describe application composition; the actual artifact verification
above independently exercises production pinned roots and the real SDK.
