# Standalone invoice entry and sharing

Approved scope: the user's 17 November request to implement the previously
proposed Receive → Create invoice entry, existing editor, copyable invoice page,
existing chat/email delivery and PDF download. User pushes main. Keep this subtle
and do not alter the concurrent Create asset flow.

## Intent and approaches

A business can prepare an invoice without first finding its client conversation.
The customer sees a calm, focused invoice with the issuer, client addressing,
complete line items, exact USD total and terms, then explicitly chooses to pay.

The selected approach reuses the existing invoice editor, native sealing and
custody, Receiz source-family sharing and hosted checkout. A chat-only shortcut
would not provide the requested copyable invoice. A separate invoice database or
payment engine would duplicate the implemented contracts and is excluded.

## Existing law and owning boundaries

- Read Receiz `docs/source-never-representation-authority-invariants.md` and
  `docs/proof-object-history-continuity-law.md`, the installed coordinated
  SDK/MCP/AI packages 129.5.0, Bank account-entry and held-navigation laws.
- The source is the exact canonical sealed invoice PDF, carrying the existing
  `bankeiz.chat.proposal.v1` invoice terms. `openCanonicalProofFile` and
  `readProposalDocument` admit it. A URL, descriptor, manifest, editor draft,
  chat event or API result cannot substitute for that Original.
- Existing `identity.sealRecordExport` creates and durably retains a new invoice
  once. `identity.readRecordExport` reopens it without sealing again. A small
  reference in the existing conversation draft projection indexes that source;
  it has no proof or financial authority and preserves unrelated draft fields.
- Existing SDK `buildReceizMaterialCompositeTransport`,
  `createReceizMaterialSourceFamily`, and
  `publishReceizMaterialCompositeTransport` distribute the exact same bytes.
  Native `holdReceizMaterialSourceFamily` and
  `resolveReceizMaterialCompositeLocalFirst` provide existing anonymous custody
  and held-first reopening. No Receiz backend changes or new database.
- Sharing is explicit: explain that anyone with the invoice link can read the
  invoice and its billing details. Do not publish chat history or identity keys.
  Preserve the full sealed PDF, its carried proof/history and exact terms.
- Existing fixed-sale fields bind invoice ID, stable receiving UID, username and
  integer cents. The page derives these from admitted invoice terms, never URL
  display parameters. Existing checkout still reviews and approves payment.
  A sealed document does not establish settlement or a verified business badge.
- Source availability and existing local custody control display. No session,
  freshness, public catalog or asset publication prerequisite. A genuinely new
  reader can fetch missing source through the existing material transport once.
- Financial truth remains in existing receiving/checkout receipts. The invoice
  shows a payment request, not an invented Unpaid/Paid flag. The merchant Counter
  and buyer checkout reuse the same exact invoice sale.

## Issuer experience

One secondary Create invoice action beside the current Receive actions. It
lazy-loads an invoice wrapper. Choose the client using existing recipient search
or email conversation creation, then reuse `ProposalComposer` in invoice mode.
Reuse held contact branding and the existing editable fields and PDF preview.
The wrapper's primary review action creates the invoice Original locally.

After creation: show invoice summary, Copy invoice link, Send to client and
Download original PDF. Copy uses the existing public source transport only after
explicit sharing. Send uses normal chat/email delivery with preserveOriginal so
it sends the identical invoice. Preserve the existing ambiguous-send check; never
automatically repeat a possibly posted message. A saved current invoice can be
reopened through its existing owner-bound source descriptor after restart.
Creating another invoice retains previous source custody and unrelated work.

## Recipient page

`/invoice/view/` is an isolated static entry. Its fragment carries only an existing
Receiz material source URL. It opens and verifies the exact enclosing Original,
extracts the existing invoice terms, and retains complete source-family custody.

Use the existing Bankeiz colors, type and mark. A restrained header, readable
invoice title and addressing, item table, clear total, optional terms, original
PDF download, and one prominent Pay amount action. No marketing, timers, fake
trust claims, preselected paid extras or auto-enrollment on invoice opening.
Long descriptions and names wrap; keyboard and mobile interaction remain usable.

Pay explicitly opens the existing hosted checkout with this exact fixed sale.
Card, Balance and Note remain its existing options. Keep the invoice available
while it opens; show the existing payment receipt on confirmed success. Viewing
conversation is a secondary recipient-bound navigation action. A link grants
invoice reading, not access to its private conversation.

## Scope exclusions

No Create asset code, native identity entry, SDK patch, new settlement writer,
invoice accounting system, automatic reminders, subscriptions, refunds, taxes,
new public membership rules, or deployment/push. Changes to shared build routing
only register the isolated invoice entry and preserve current main's checks.

## Qualification

Test with real installed canonical SDK sealing/verification. Refuse plain PDFs,
changed source, substituted amount/receiver, wrong owner, mismatched conversation
and stale identity callbacks. Prove exact-byte PDF round trip, copy publication,
held reopen with all external reads unavailable, cold source retention, sibling
work preservation and ambiguous-send recovery. Test actual UI creation and
recipient review/payment handoff on narrow and wide screens. Run full suite,
account-entry freeze, types and production build. Report local, commit, CI,
deployment and live results separately. Commit only invoice task files onto
current local main after checking that concurrent work is preserved.
