# Receiving and adoption verification

## Product boundary

The normal payment remains Receiz ID or email, review, then explicit approval.
The collapsed **More receiving options** disclosure matches Wallet access. Its
**Help someone receive** action opens a secondary sheet. Expanding the disclosure
performs no read. Private
invitations and institutional preparation stay inside that optional experience.
The invitation leads with the money and the recipient's next payment.

`/receiving/` is a static public guide, with a bounded local fragment reader.
Invitation text, sender name, optional reviewed amount/purpose and an institution
selection are presentation data. They authorize no money, ownership, identity,
conformance result or recipient route. The funded `/receive/` handoff is unchanged.

## Existing systems reused

- Installed SDK, MCP and AI Skills **129.0.0**, inherited ruleset **127.0.0**.
- Existing Wallet send review, exact recipient binding, approval and recovery.
- Existing encrypted identity-bound local storage with compare-and-swap.
- Existing held contacts; no organizer/directory service opened for this flow.
- Existing static guide generation, navigation, metadata and offline closure.
- Existing receiving kit, capability requirements, assessment and Registry.

No new financial API, account, balance, ledger, standard, Registry or dependency.
No source history is rewritten, sealed again or copied into private invitation work.
The two storage wrappers only introduce the nonfinancial `receiving-work-v1` family.

## Evidence

- Component and real-controller regressions cover default privacy, opt-in payment
  context, stable recipient UID, review-only payment handoff, share cancellation,
  copy failure, pending-action edits, stale completion, encrypted reopen and CAS.
- Mobile **390 × 844** and desktop **1440 × 1000** use the actual Send and sheet,
  a controlled private-draft store and a payment port that refuses execution.
  Across help opening, review, copying, closing and return: **one** initial Wallet
  connection/status read, **zero** additional reads, **zero** API/external requests,
  and **zero** payment preparation/execution. The mocked port does not establish
  financial qualification; the existing production executor is unchanged.
- The actual static guide and bundled invitation runtime pass mobile **390 × 844**
  and desktop **1440 × 1100** checks: local parsing, URL/history scrub, keyboard
  response, institution context, no overflow and **zero** API/external requests.
- Public invitation content never enters prepared HTML, SEO metadata or router
  history state. Conformance continuation carries only the institution selection.
- Visual polish covers the private invitation editor/review, public receiving forms,
  institutional preparation and Registry continuation at mobile and desktop widths.
  Links, disclosure controls, action widths and keyboard focus remain consistent.
- Review fixes retain an active assessment's scope and make each institutional
  Registry record directly addressable by its existing selected identifier.

## Initial suite qualification (`3f4b2a0f`)

- `npm run build`: **passed**, including typecheck, frozen account-entry guard,
  complete offline closure, public navigation, accepted cold-paint projections,
  licensing and source-archive checks.
- `npm test`: **976 test files passed; 6,162 tests passed; 11 preexisting skips**
  (6,173 total), with no test errors. No skip was added by this work.
- Actual component browser checks: mobile and desktop private Send/disclosure,
  invitation editor/review/copy/return, public receiving reply/institution path,
  preparation workspace and Registry continuation all passed.

The first sandboxed full run could not open loopback for two existing HTTP
streaming tests. The final complete run used local loopback access and passed
those tests without changing their implementation or timeout. Guide completeness
checks also caught the new entry’s missing sections/vector metadata; the entry
now satisfies the existing contracts without exemptions.
Verification uses an isolated copy of HEAD plus this change, preserving unrelated
working-tree changes. Its dependency tree matches the unchanged lockfile; the
desktop workspace's preexisting React 19.3.1 installation differs from the locked
React 19.3.0 and is not substituted into release evidence.

The shared public presentation measures **15,055 gzip bytes**, versus **14,996**
before the route-scoped invitation-history privacy filter. Its bounded ceiling is
15,100 bytes. The 5,941-byte gzip invitation reader and receiving styles remain
page-only; no receiving request or freshness gate enters ordinary page opening.

## External boundaries

Draft, copied link and sharing initiated are local observations. Recipient replies
entered by the holder remain explicitly reported progress. Native sharing does
not establish delivery. There is no background polling or invitation-triggered
payment. Institutional implementation and its independently assessed operational
receiving evidence are the institution's next work, using the existing published
requirements. A public-integration-contract PASS retains its actual scope.

No real invitation, external message, funds movement or production evidence was
sent during QA. No deployment is performed by this work.

## Personal invitation refinement · November 7

Send now leads with **Move money. Send it anywhere.** The existing ID/email
payment remains primary. **More receiving options** stays collapsed beside Wallet
access and explains receiving through another application or institution. The
secondary invitation is useful when the recipient needs that receiving arrangement.

New reviewed links open the dedicated static **`/invitation/`** page, addressed to
the recipient with the already-held sender name and canonical public profile link.
The sender explicitly chooses whether to include an amount and payment context.
The page presents the independent receiving path, exact SDK acceptance sequence,
receiving kit, current Note continuity contract and scoped institutional evidence.
`/receiving/` remains the general public guide; previously shared links still work.

The invitation page has generic noindex metadata and artwork. Personal details
remain only in the reviewed fragment and page-local memory; the address and router
history are scrubbed. No profile, account or Source lookup supplies personalization.
Automatically carried contact names are excluded when they contain private email
or match the immutable recipient ID, including older saved drafts. An explicit
human-addressed name remains reviewable. Payment identity is never inferred from it.

Existing Copy invitation and native Share stay intact. A small, labeled copy icon
beside the URL copies only that link. The recipient page has the same URL-only
copy action using the already-held invitation after address scrubbing. Clipboard
failure exposes a selectable link; sharing or copying never starts a payment.

The reproduced scroll freeze came from the nested ReceivingHelp sheet not receiving
the existing Bank active state. Both sheets now release their own document locks
on public navigation and return without remounting Send. A real browser also
exposed React's child-first modal restoration promoting the parent over its child;
Sheet restores existing child dialogs above their parent and preserves focus.
No global router/cache logic, new request, timer or financial operation was added.

Browser checks at **390 × 844** and **1440 × 1000** prove actual pointer and keyboard
copy/share, URL-only copying, close focus, a **900 px** wheel scroll on the public
guide, browser Back and native Bank return to the same held root and edited draft.
Each viewport keeps **one** initial Wallet connection/status read and **one** private
draft load; navigation adds **zero** document/module/API/Source requests and
**zero** financial preparation or execution. The public invitation also passes at
**390 × 844** and **1440 × 1100**, with the exact local URL reconstructed after
scrubbing, visible invalid-link feedback, correct close focus and no overflow.

The complete follow-up suite passed: **977 files; 6,190 tests passed and the same
11 preexisting skips** (6,201 total), in 248.74 seconds. The final visual check
additionally caught the general guide image above the personal brief; the
invitation descriptor now excludes that decoration. Its addressed content leads
first paint. The new public paths also retain matching profile aliases at
`/u/receiving/` and `/u/invitation/`. Focused route, profile, imagery and guide
checks cover those final boundaries.
