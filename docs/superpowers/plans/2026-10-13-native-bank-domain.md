# Native bank domain completion

Continue the approved bank build inline from 8c8884e. Preserve the current console, navigation, Deposit, Send/Receive and first-paint behavior. No demo, direct Stripe integration, fabricated custody/value or external wallet handoff.

## Contract

Use SDK/MCP/AI Skills 129.0.0 and canonical registry 127.0.0, digest 8d0b5b839d02d9efbd4306cc99410595a183705c2670b76d2567eaaaade99065. Inspection recomputed that exact digest. The connected MCP blueprint reports the same digest and simulation-only/unconfigured command context; it does not authorize financial execution.

Custody: an authenticated Receiz custodian records actual receipt, authentication, quantity and redemption terms. The complete sealed source carries the evidence and issuer/owner bindings. Customer descriptions/photos/shipping requests cannot accept custody or create cash. Stocks/property require their title workflow rather than parcel receipt.

Ownership: transfer all or an exact eligible fraction, with seller ownership and locks derived from the current enclosing source. Physical custody stays with Receiz. Whole-asset redemption requires all outstanding ownership or its explicitly admitted collective terms. Stale/concurrent attempts make zero writes.

Sales: bank or user buyer funds the same atomic operation that transfers the agreed share. Seller credit and buyer delivery occur together. Public showcase data is discovery, never an executable funded offer. An unknown outcome retains the original intent and resolves its semantic idempotency coordinate; no replan/retry with a new key.

Currency: an owned currency source carries exact supply, holder balances, issuance/redemption terms and backing references. Creating supply does not create Reserve/Settlement. Eligible backing is committed through its explicit native rail and cannot also remain freely spendable. Redemption burns exact supply and releases its agreed backing atomically. No caller-provided balance, value head, permission flag or receipt JSON creates authority.

Use local time for display, admitted KKS/Kai for causality/expiry. Enclosing proof truth and authenticated heads remain above projections, SDK responses, rows and UI. Exact full sources remain private where required; public witnesses exclude identity secrets, addresses and inspection evidence.

## Actual integration requirements

Current production source code supports prepared native value/access/world-composite execution. Its `prepareExecution` rejects multiple operations and unregistered custom bank operations with UNSUPPORTED_ATOMICITY. A bank adapter must validate and atomically commit the complete source-bound operation; changing a UI boolean or inserting a custom payload does not supply that adapter.

The current public client permits shared reads/card checkout only. Minimum additional native scopes identified by the installed registered-runtime contract: receiz:subjects.read/write, receiz:domains.read/write, receiz:settlement.write, receiz:reserve.write. Native remote Record/Seal, where used for SDK-derived successors, requires receiz:record and receiz:seal. Preserve existing read/card scopes and callbacks at bank.receiz.com and local 4173/5173. Public registration change requires exact browser action-time approval; each customer's actual source/financial consent remains separate.

## Work

1. Compose the bank domain contract and deterministic conservation/eligibility rules beneath SDK source verification. Write RED tests for custody refusal, owner/share conservation, locks, funded atomic sale and backing/supply conservation.
2. Add exact SDK runtime qualification, source publication/session and operation/recovery composition. Keep SDK-issued admission and transition custody; no property-bag substitutes.
3. Implement the Receiz bank domain adapter and its atomic source/head commit contract. Prepare any required production integration as a reviewable patch; publish/deploy only after final approval. Do not introduce a shadow wallet.
4. Restore original asset transfer/sale/issuance screens with the native callbacks. Enable actions only when actual custody/source/funding/runtime conditions are satisfied.
5. Verify rejection/zero writes, concurrency, replay/reload and unknown-outcome recovery; run typecheck/build and meaningful UI checks. Obtain one fresh final review for this new subsystem and one fix pass. Do not repeat completed reviews of previous subsystems.

Live financial actions, credential creation and physical receipt attestations are human-operated. Tests and scaffold evidence do not qualify a deployed bank. Do not call the full goal complete until the current native runtime, custodian source and the end-to-end effects are actually observed.
