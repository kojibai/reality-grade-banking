# Your Twin and See It in Action

User-approved scope: create /your-twin/ and /in-action/, preserving the existing Together, cooperative, Business and fit pages. Use their established white, cobalt, navy and glass visual language. Show the visitor and owner sides of one connected conversation: questions, chosen contact details, retained context and an explicitly confirmed calendar appointment. Both pages sell the existing $149/month Business subscription through the exact existing Get Business destination.

## Decisions

Use two distinct static sales documents with custom inline animated SVGs, shared page-only CSS, unique raster social previews and the existing native bjklock conversation. This directly reuses the carried public catalog and consented Twin. Rebuilding the account or using a separate lead/booking service would contradict the approved continuity. No changes to the account entry, billing authority, private account, Contacts or calendar implementation.

/your-twin/ explains the result: be present for client questions while doing your work, then pick up with the relationship and next step connected. /in-action/ walks through the visitor's question, shared details, reviewed booking and owner handoff, and offers the actual live conversation. Illustrations are explicitly illustrative, never fake customer testimonials or completed native events. Get Business is primary; Talk to BJ is the live example, with an AI Twin disclosure at the conversation.

## Existing authority

Receiz app/api/world/profile/[username]/route.ts composes native Twin reply and bookWorldProfileAgentAppointment. app/lib/world/guestProfile.ts carries visitor/thread continuity and supplied contact hints; app/lib/contacts/server.ts merges guest continuity, historical Twin and calendar events for the owner. Anonymous visitors are not declared verified identities. Bookings require the actual native calendar event. The public page never reads BJ's private Contacts or calendar.

Business billing remains src/content/business-offer.mjs checkoutHref /#account/messages/business and its existing assistant payment review. Same account/restore/create/upgrade logic, user review and payment action remain intact.

## Constraints and acceptance

- Logo at top; subtle Bankeiz identity in footer. Outcomes first, ordinary buyer language.
- No prices on social images; no usage credits in headline value framing.
- Two distinct custom live visual stories; no external image, video, canvas, WebGL or animation dependencies.
- Visible motion uses inexpensive transforms, opacity and short flow paths; respect existing reduced-motion handling. No pause controls.
- Responsive 320–1200px, no cropped illustrations or header overlap. Repeat Talk to BJ clicks retain conversation and drafts.
- Public metadata, sitemap, guide directory, relevant links and footer discovery, omitting the current footer destination.
- Full static first paint and carried navigation; unchanged shared CSS/JS gzip budget below 15,000 bytes. New styles belong only to these pages.
- No cold Twin request, real message, booking, payment or account creation in browser QA.

Baseline: 7558c7b supplies the approved Talk to BJ invitations and explicit repeat-anchor behavior. Account entry remains frozen under Receiz law. New route names contain hyphens and cannot consume a public username route.
