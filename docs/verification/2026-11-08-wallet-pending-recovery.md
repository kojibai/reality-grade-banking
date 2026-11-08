# Exact pending-payment recovery

The November 8 incident crossed two different boundaries. A witnessed-object observation dirtied a profile display manifest without changing Showcase membership. The Wallet reader then discarded the retained complete publication and fell back to legacy rows, where a creator-binding guard refused three older Originals. The original POST returned an error before its financial writer was called. A later lookup miss could not safely prove that a delayed writer would never execute, so Bankeiz correctly retained the unknown request but offered no terminal cancellation.

## Source correction and recovery

Receiz retains the existing admitted publication during a display refresh. Its existing financial writer still enforces current ownership, visibility and membership revision. Witnessed-object observations no longer dirty Showcase membership; genuine possession changes retain the notification. This repair adds no page-opening request or history replay.

Cancellation is an explicit operation on the retained request. Receiz and the installed Send writer acquire the same existing nonce lock. If Send already won, cancellation returns the actual recorded transfer. Otherwise Receiz retains an append-only exclusion and the writer refuses that nonce before financial effects. Bankeiz accepts cancellation only when sender UID, recipient UID, conversation, amount and nonce all match the saved request. An unavailable reply or an ordinary lookup miss cannot clear it. A later lookup can recover a lost cancellation response.

The UI offers one cancel action, retains unknown status on failure, and permits review of a new payment only after a bound terminal response. Reviewing again does not send. Recipient suggestions select their exact existing UID and username before input blur can remove the option.

## Local qualification

- Bankeiz focused Wallet and recipient suites: 69 passed; final focused regression run: 54 passed, including cancellation outage/retry.
- Full Bankeiz suite: 1,006 files passed; the remaining cooperative-preview file failed only because the sandbox denied its HTTP listener. Its two tests passed when rerun with local HTTP permission. That is composed local evidence, not a single all-green invocation.
- Bankeiz production CLI passed, including generated-preview, public-entry, source-archive, offline and conformance checks.
- Frozen account entry: 63 passed. Isolated and combined-main TypeScript checks passed.
- Receiz focused route/source tests: 63 passed. The actual dirty-profile reader returned its existing complete 613-Original projection without the refused raw scan.
- Receiz qualified both Send/cancel race winners, late-Send refusal and exact request conflicts at its existing writer boundary. Bankeiz consumes that result through the installed integration contract. No production payment, trade or cancellation was executed.

Browser access remained disabled in the tool host after the user enabled the setting. The new cancellation flow therefore has component and Receiz contract evidence, but no completed browser click-through. GitHub CI and live deployment are separate, unclaimed checks.

## Rollout boundary

Release Receiz before Bankeiz so the installed integration exposes the exact cancellation result. Until that capability is deployed, Bankeiz preserves the request as unknown. Publishing Bankeiz alone cannot close an existing production request. Receiz implementation and operational evidence belong in the Receiz repository.

Full funding-ancestry joins and the generated Receiz ID length mismatch are separate outstanding work. This change does not claim to complete either one.
