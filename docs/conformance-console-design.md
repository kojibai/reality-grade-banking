# Conformance Console design ledger

The user selected the precision console: a public `/conformance/` frontend over the existing receiving reference, matching Receiz Bank and preserving its screens. Purpose: run actual reference checks, inspect original Reserve Note PNG sources, examine qualification requirements and export local evidence. This frontend grants no custody, credit or institution certification.

## Visual references

Codex generated concepts, all in the task's generated-image library:

- Reference checks: `exec-28f23d66-4775-4a76-918c-630e23c3d802.png`.
- Proof inspector: `exec-ca253261-a183-4af4-ad77-14a62ad9306e.png`.
- Qualification: `exec-2fbcf273-033c-4a29-a88a-605c2d73c047.png`.

Exact above-fold copy: receiz bank / Conformance; Bank, Learn, Developer kit; Conformance.; Verification. Ownership. History.; Run reference checks; Export evidence; Reference checks, Proof inspector, Qualification. No hero eyebrow or fictional activity/volume statistics.

Tokens: true white #fff; navy #172e44; cobalt #254bd8; slate #78879b; line #e0e6ef. Sans-serif system typography, 60–68px desktop heading, 28px panel title, 16px table, 14px utility; 44px minimum touch controls. Hairline table rules, nearly square 3px panels, 4–6px buttons, no decorative card grid. Header 68px; desktop gutters ~44–60px; broad work area and navy right rail. On mobile the actions and rail stack, tabs remain directly selectable and tables wrap without horizontal overflow.

Components: common header/hero/tabs/footer; ReferenceChecks table with expandable actual evidence; ProofInspector file input and verified/refused states; QualificationMatrix from the published profile; shared EvidenceRail; local runners/export helpers. Subtle dashed continuity-line motion and real run-state transitions, paused for reduced motion and hidden documents.

## Functional and fidelity boundaries

Seven browser cases use the actual pinned SDK/native verifier: release/registry, module integrity, complete note source, opaque handles, transport bounds, canonical temporal vectors and sender/receiver inspection. No fake delay or synthetic success. MCP runs are the recorded v129 local baseline, never presented as a new browser MCP invocation. Evidence exports keep `institutionConformance: not-assessed` and `creditAuthorized: false`.

The inspector verifies only the supported original Reserve Note PNG and its carried chain, not current spendability or receiving custody. It uploads nothing. Native financial integration and Settlement Note extension remain separately required.

Intentional correctness-driven changes from generated filler: qualification rows use the actual normative profile rather than generic regulatory assertions; initial export is disabled in every tab until evidence exists. Common header/hero spacing is consistent across states. Source and report digests are inspectable, not authority badges. Reuse rights remain subject to the disclosed license compatibility review.

Implementation uses a separate Vite HTML/React entry. Bank entry imports no console code, private account APIs are untouched, and console-only chunks are excluded from Bank shell precaching. The emitted build guard verifies these boundaries.

The owner subsequently selected **Bankeiz** to replace the Receiz Bank product name, preserving every color, layout and interaction. The approved concepts retain their earlier wordmark as design history; the implemented header uses the requested Bankeiz name. See the [verification record](verification/2026-10-15-conformance-console.md) and [domain rollout](bankeiz-brand-rollout.md).
