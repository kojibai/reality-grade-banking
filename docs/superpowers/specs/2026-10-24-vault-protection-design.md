# Vault protection solution page

The owner requests a sales page explaining how reality-grade banking Vaults protect money and identity from cyber threats. Continue the approved logo-only header, quiet Bankeiz footer, navy/cobalt/paper palette, transparent coded moving visuals, mobile clarity and immediate retained navigation. The existing Business and cooperative suites remain unchanged.

## Decision and authorization

Build a separate problem-led page at `/learn/protect-your-value/`, linked from the shared footer. Reusing the Learn namespace avoids new profile/account-entry routing. Replacing the existing Vault guide would overwrite another agent's work and mix operating instructions with this selling story. A generic list of security claims would not explain the implemented boundaries. Use the existing public renderer; no new framework, external scripts, runtime account read or security mechanism.

The owner's direct request and established visual/implementation instructions authorize this continuation. No additional design approval cycle is required by the session. This is a small extension of an accepted system. Coded SVG/CSS is intentional, following the owner's explicit preference over generated raster images.

## Story and interaction

Hero: “Prove it’s yours. Keep it yours.” Explain sharing evidence without sharing authority, and optional passkey protection. Three native radio scenarios: public proof, copied protected private file, changed original. Each changes the actual visible explanation and a transparent animated illustration. Native inputs and CSS supply interaction without adding shared JavaScript or private first-paint work. Keyboard, reduced motion and offscreen behavior reuse existing public conventions. No sticky scene on phones.

Show public proof / private original / protected private original plainly. The default private original is a bearer credential; optional passkey protection encrypts its authority. This distinction is visible before the final CTA. Explain separate Vault custody, exact action review, original-proof verification, saved-source continuity and locking when hidden. Provide concrete next steps into the existing Vault guide and Identity, with rollout/device qualification stated accurately. No $149 security upsell is invented.

## Primitive preflight

- Primitive affected: presentation of Vault custody, identity, public proof, access and Settlement. No primitive behavior changes.
- Source of truth: actual admitted sources, separate custody key, canonical enclosing artifact, native financial contracts and verified WebAuthn PRF assertion.
- Stronger/weaker truth risk: `language-drift-risk` if illustration or copy implies a guarantee beyond those contracts. Illustrations never admit holdings or claim an actual attack was blocked.
- First-paint risk: static page content and inline styles enter the existing carried public catalog. No account/passkey/storage/network work at page entry.
- External convention: none defines product truth. No outside security claim or certification.
- Contracts: static claim boundaries, accessible native scenarios, known public route/offline shell, canonical metadata/social image, existing Business/cooperative and retained-call tests.
- Exact uncertainty: real-device/provider qualification and production Vault rollout are outside this marketing change; no real funds or device protection ceremony is exercised.

## Claim evidence

| Claim | Implemented boundary |
|---|---|
| Shared proof grants no access | `public-record.ts`, `export.ts`, `public-reader.ts`; public witness tests |
| A protected file alone cannot unlock | `encryption.ts`, `presence.ts`, `context.ts`; actual AES-GCM and verified original-credential PRF |
| Unprotected original is bearer authority | `carrier.ts`, default `manager.ts:create` protection=image; current `docs/vaults.md` |
| Ordinary account key stays separate | `custody.ts` and custody tests; private original carries child authority, not parent key |
| Changed originals are refused | enclosing seal in `export.ts:openVaultImage`, then native source admission in `admit.ts`/`source.ts` |
| Review binds the actual action | `manager.ts:review`, `context.ts:authorize`; exact-request/once-only native controllers |
| Lock ends unlocked access | `context.ts:lock`, `manager.ts` visibility/pagehide/dispose; custody late-grant tests |

No universal “funds/identity cannot be stolen” claim. A compromised device/browser, stolen unprotected original, lost required recovery material or harmful action the owner approves is not made safe by this page. Historical verification does not establish current unspentness. Public evidence does not carry private keys or authorize a payment.
