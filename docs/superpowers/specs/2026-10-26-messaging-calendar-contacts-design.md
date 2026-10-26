# Messages, people and calendar

Approved by the user on 2026-10-26 in the interactive [screen preview](../mockups/2026-10-26-messages-people-calendar.html). The preview is the visual reference; its sample data and simulated actions are not production services.

## Experience

Keep the existing Messages sheet. Add subtle Calendar and Contacts icons beside the existing compose control. Conversation, person, schedule and booking controls occupy the same sheet, with one clear back action. Preserve conversation drafts, scroll and active calls when moving among them. Use the current Bankeiz typography, colors, spacing, icons and copy-check animation.

Contacts show the existing Receiz ID's contacts, search, add/import, person details and folded history. A linked account opens its existing conversation; email and phone contacts use their supported contact methods. Scheduling from a person or conversation carries that person into the appointment. Never invent a linked account from a name or email.

Calendar provides agenda/week and date navigation, appointment details and creation, availability, booking questions, a default booking link, custom link settings and embed copy. Expose supported editing/cancellation only through the existing account record operations. Public booking uses the same availability, overlap checks, booking and confirmation records as Receiz, presented at a Bankeiz URL. Public guests never see private organizer controls or owner data.

## Data and access

Use the existing Receiz contacts/calendar/booking records and primitives. No separate calendar, account, address book or financial authority. Bankeiz contains the integration and presentation; provider implementation belongs upstream. Use scoped access under the admitted account, never a handle or contact supplied by the browser as owner authority. A present invalid bearer cannot fall back to another cookie account.

Organizer access is lazy and reuses the already-open ID. Opening ordinary messages and signing in add zero organizer requests. Use only the existing app-state read/write permissions for the person’s intentional use of these tools; no second login, account picker or new permission popover. Retain the last admitted account-scoped display in the existing encrypted identity storage. Known content paints immediately; background updates cannot erase it or change the active view. A failed/incomplete/signed-out response is not an empty calendar or contacts list.

## Performance and correctness

One shared organizer controller per open identity; concurrent identical reads share one request. Reuse admitted records across person, calendar and conversation views. Category taps and searching retained data make no requests. Fetch calendar pages only for ranges not already held; merge writes from their existing operation result. Do not add polling, reread loops, animations that force GPU layers, full-account scans, or unrequested preloads.

Keep drafts after failure; do not retry writes automatically. Display uncertain outcomes honestly. Use actual timezone-aware instants and the provider's available slots. Custom booking links carry overrides without changing default availability. Do not put private contacts or appointment notes in public URLs. Test with synthetic accounts and records; do not send real messages, invitations or bookings during qualification.

## Acceptance

All 14 approved screens have real supported actions; no preview-only buttons ship. The same ID sees the same records through Receiz and Bankeiz. Switching identity closes the prior tools and prevents late responses or writes from leaking across accounts. Existing message, payment, call and login tests continue passing. Record request-count and rendered mobile evidence, then commit the owned integration on main; the user pushes.

## Agent connection (user addition)

The owner’s Twin must use these same contact, appointment, availability and booking-link operations through chat. Expose useful existing SDK operations through the existing owner-tool proposal/result loop, rather than a second agent or data store. Load/read only what a requested task needs. Native results update the shared organizer controller, so switching from chat shows the same records without rereading them. Contact and appointment writes require an actual owner request; ambiguous or externally consequential actions retain the existing review/confirmation boundary. Existing financial approvals, source ownership, metering and other agents’ policies remain unchanged.

Other people’s agents need the existing native contact intake and reviewed-booking tools in their permitted replies, including the direct-message relay. Owner-private contact/calendar management is never exposed to a visitor. Shared names, source messages, availability and accepted booking reviews must stay bound to their actual participant/thread and native operation.

## Full Receiz Twin capabilities (user addition)

Make the full installed Receiz SDK, MCP and AI-skill catalog available to the owner’s Twin, not a hard-coded contact/calendar assistant. Reuse the shipped exact tool schemas, applicable skills, native adapters, source/custody requirements, scoped access and per-operation confirmations. Discover relevant tools on demand rather than sending hundreds of schemas with every message. Preserve the existing money/business conversations and execution result loop. Expose useful combinations such as person → appointment → conversation and booking link, without a second account or another data authority.

The catalog is not execution evidence. A discovered SDK function is not a generic invocation permission, and a model cannot turn a JSON object into an SDK-issued authority. Browser keys and admitted runtime objects stay in their current custody. Where a tool needs user-selected files, device-held material, backing, a provider grant or final confirmation, use that existing native path. Do not execute tools in Codex against the user’s real account while building this integration, or silently grant every scope at login. No arbitrary filesystem, URL, shell or server credential bridge. A missing host/device composition must be identified and built against the existing seam, not hidden behind a simulated success or blanket tool advertisement.
