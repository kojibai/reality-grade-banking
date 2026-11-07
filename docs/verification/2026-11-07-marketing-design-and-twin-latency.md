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
