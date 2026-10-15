# Release process

Record the Bank commit, exact lockfile, coordinated Receiz package versions, registry/operation digests and generated module hashes. Read the current capability matrix in the root README and `institution/receiver-profile.json`.

1. Run `npm ci`, `npm test`, `npm run typecheck`, `npm run receiver:check`, and `npm run build` from a clean checkout. Run `npm run vercel:check` when qualifying emitted Vercel build output; it requires that output and is not a substitute for native financial qualification.
2. Review the complete diff, including generated module provenance, public source maps, asset/font notices and package changes. Keep private credentials and account evidence out of artifacts. Changes to protected financial behavior require independent review and the exact source/refusal/recovery evidence.
3. Inspect the actual mobile/desktop UI, touch tooltips, keyboard/focus, reduced motion, note amount/rail presentation and original PNG export/import. Document what was actually exercised. Do not equate artwork or synthetic fixtures with an issued note.
4. Complete the capability-specific [receiver qualification](../institution/qualification.md) and existing [native note release gates](offline-notes-release.md) before enabling live financial behavior. Record unresolved services, migrations, signer contexts, hardware and authorization separately.
5. Review the definitive licensing and [third-party rights](../THIRD_PARTY_NOTICES.md) before publishing reuse claims or a release. Existing GPL-3.0 dependencies require specific combined-work compatibility and corresponding-source review. `LICENSE-PROPOSAL.md` remains a proposal and cannot be advertised as a completed source-available license grant. Copied notices and an embedded source map alone are not a completed distribution compliance assessment.
6. Have an authorized operator push/deploy the reviewed commit. Verify the exact deployed build and source hashes. Observe the complete route and independently verified result; a successful deployment or HTTP response alone does not qualify a financial operation.

Retain the prior release and exact pending-intent compatibility. A rollback must preserve possibly committed operations and their original recovery coordinates. Do not discard pending funding/redemption records or generate fresh intents to simplify rollback.
