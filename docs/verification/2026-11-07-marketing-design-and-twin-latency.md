# Marketing design and public Twin latency — November 7, 2026

Vaults now uses the shared public page font, ink, paper, cobalt and border colors, heading scale and shell width. Its existing Vault artwork is composed into the hero once. Protection, offline recovery and private source copy retain their original contracts.

The In Action hero previously applied `.twin-hero-art svg { width: 100%; height: auto }` to every native example icon, including screens opened from the example. The rule now targets only the authored illustration's root SVG. The interactive example has larger step targets, an explicit anchor and instructions, and a mobile layout that introduces the example before displaying it.

## Public Twin timing

Production measurements before this change, using one synthetic guest conversation on November 7:

- Guest bootstrap: 3.517 seconds before the first message could be submitted.
- Message response headers/start: 4.115 seconds after submission.
- First real text delta: 13.516 seconds after submission.
- Accepted final response: 18.072 seconds after submission.

The Bankeiz bootstrap fetched the native profile only to establish a browser guest cookie. `/api/cooperatives?continuity=1` now establishes that same cookie without an upstream request. The actual message stream retains native owner, availability, operation, source and final receipt checks. Existing guest coordinates, accepted-operation pointers, retries, partial text, drafts, memory and calendar confirmations are preserved. No artificial answer, typing cadence or model substitution is introduced.

The remaining upstream wait was not changed in this checkout. Source inspection of Receiz's public stream route shows a complete public profile context load before `reply_start`, followed by another context load in `streamWorldProfileAgentReply`. That context includes the visible showcase, proof brain, calendar, memory and guest continuity. Measurements do not separately attribute the remaining time between those reads and model generation.

## Verification

- Related public page, walkthrough, chat, relay, native stream and real HTTP preview tests passed.
- Account entry freeze: all 63 tests passed using the real installed SDK.
- Chromium checks covered 320, 390, 440 and 1280 pixel widths; Contacts, Calendar, Paid and Account destinations retained normal icon sizes without horizontal page overflow.
- Local screenshots are under `output/playwright/`.

These are local changes. The production timings above are a baseline, not a claim that the website has deployed or that the remaining native latency is fixed.

## Twin portrait and native latency follow-up

The marketing conversation now reuses the existing public BJ Twin portrait in a small circular image beside each response, beginning with the pending reply. The same image node remains through streaming, acceptance and history projection. Image loading is asynchronous and does not gate sending or text streaming. The conversation header carries the same portrait.

The native Receiz follow-up removes duplicate work without sharing state across requests:

- The public route precheck and streaming reply reuse the same complete context, keyed by the actual Request, owner username, visitor, thread and private owner identity.
- The immutable owner ID is read from that same context instead of querying the profile head again.
- The complete 32-message conversation window already read by the context is reused for reasoning; the public view retains its established eight-message shape.
- Conversation memory, Twin promotion status and guest continuity run in parallel.
- Final public-view alignment and guest-touch persistence run in parallel, after native accepted-reply settlement. Both still complete before the final accepted result is sent.

No provider/model change, invented response, cross-request cache, permission bypass or booking shortcut was added. Text remains provisional until its native accepted receipt; complete memory, source proof, exact retry operations and calendar confirmations are preserved.

Follow-up checks: 48 native route/booking/contact/cognition/isolation tests and 58 Bankeiz page/chat/relay tests passed. Receiz TypeScript passed with an 8 GiB heap after the default process exceeded its heap limit. The Bankeiz production build passed. Browser checks at 320, 390, 440 and 1280 pixels confirmed the 26–28 px reply portraits, loaded images and no horizontal overflow. The visual fixture used synthetic response text and the actual public Twin portrait, not a live performance measurement.

The native fix is committed as `35bfb3bb1` on the isolated `kojib/public-twin-stream-latency` branch in `/private/tmp/receiz-public-twin-stream-latency`, keeping the unrelated Receiz work separate. No production deployment or updated live latency measurement was performed; the 13.516-second baseline remains the only live first-token measurement.
