# Trade and public quote scheduling

Goal: remove independent waits without changing financial effects, ownership, approvals, checkpoints or funding.

Law: held proof and deterministic value precede external projections. Existing canonical writer, exact nonce, durable unknown checkpoint and original result admission remain unchanged.

Baseline: Bank c71c72b; Receiz 27ec60bd4. Complete exact HEAD qualification archives; other-agent files remain byte-protected.

Evidence: production full public snapshot and membership timed out; a bounded full snapshot later took 33.65 seconds with complete coverage for 1683 assets. Bank discards prediction output but the full route builds the whole desk, reads prediction books and auto-finalizes them. The selected holding read waits for independent context preparation. Send resolves its recipient before requesting an independently parameterized amount quote.

1. Add an asset-quotes projection option to the existing full public endpoint, reuse complete canonical membership, existing quote math and inventory; skip unrelated prediction reads and effects. Bank requests this projection; older hosts safely ignore the optional parameter. Preserve the existing full and paged modes.
2. Start authenticated selected-position read beside market review context, retaining context error precedence and live quote arithmetic. No writer changes.
3. Start recipient and Send amount quote together after existing custody checks and account binding. Retain recipient error precedence, exact review, funding delta and writer order.
4. RED/GREEN scheduling tests, existing money/recovery regression suites, strict types, production build, independent whole-change review, scoped main commits preserving all unrelated bytes.

Exact boundary: SDK local financial execution exists. Live activation remains unfinished: actual funded source preparation, exclusive handoff, incoming-credit succession, public/recipient evidence and existing-control wiring. These scheduling changes do not establish local financial execution and do not turn display price or a queued request into spend authority. No production SQL, deployment or real financial transaction is part of qualification.
