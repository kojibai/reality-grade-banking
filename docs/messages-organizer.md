# Messages, Contacts and Calendar

Messages keeps conversations, people and appointments in the same sheet. Calendar and Contacts use the Receiz ID already open in Bankeiz. They show that ID’s existing records and write back to those same records.

## Moving through the experience

- Use the Calendar or Contacts icon in Messages. Return to the conversation without losing its draft, position or active call.
- Open a person to message, call, view their profile or prepare an appointment. Import existing CSV, vCard or JSON contacts, or use the device contact picker where supported.
- Calendar offers Agenda, Week and Month, appointment creation, editing and cancellation. Tap a month cell to open that day's Agenda; use the arrows for nearby months or the month/year heading's date picker for a direct jump. Cancellation retains the record and its continuity.
- The small link icon beside Return to conversation opens booking controls. The existing booking link remains at the bottom of Calendar.
- Your booking link opens a Bankeiz guest page. Configure availability, questions and custom links inside Calendar. Guests choose an offered instant in their timezone, keep their details when changing slots and receive the same appointment held in the host’s Calendar.
- Past conversations appears only with Agent access and actual conversation history. A draft by itself does not make the icon appear.

## Reuse and continuity

The organizer is loaded after intent. Login and ordinary Messages opening perform no organizer reads. One controller shares the same admitted contact collection and calendar ranges across the interface and the owner’s agent. Retained display paints first. Search, category changes and known-range navigation reuse those records. Missing reads share their in-flight request. A successful write merges its actual result without reloading the collection.

A partial contact write never claims a complete collection. Calendar ranges become complete only after admitted owner pages and valid pagination. Closing or changing identity stops old-account operations and discards late responses. An uncertain write preserves the draft and never retries automatically.

Loaded calendar coverage is retained with its records, rather than discarded after twelve ranges. Returning to it makes no service read. The controller reuses the last unchanged event slice instead of filtering it twice on return. An appointment saved during an initial read merges with the incoming collection; it does not discard that collection and force another read.

Day and week intervals begin at local midnight, including Monday morning and overnight appointments. Repeated event IDs show the latest held revision once; distinct appointments at the same time remain distinct. System sign-in events remain in held history but are omitted from Calendar views and day counts. This is a display filter, not cancellation or deletion.

Contacts failures retain the friendly message and add collapsed protocol code/HTTP-status details. No response body, account record or credential is displayed. The reported persistent new-account failure still requires its specific code/status; a successful existing-account read does not establish its cause.

## Agent actions

The owner’s agent uses these same organizer operations and receives their actual results. The native tool connection can discover the installed Receiz tool catalog and AI skills. Read-only tools use their native access checks; other actions show the exact retained request for human review. Checking a pending result inspects the same attempt rather than submitting another action.

Native full-tool execution requires the application’s registered `mcp:execute` scope and the same owner’s configured native runtime. Catalog discovery does not grant custody, provision a host or replace a tool’s own consent requirements. Ordinary messaging and financial approvals retain their existing behavior.

An agent replying to another person uses the existing conversation booking tools. It can remember facts the visitor actually supplied, present available times and prepare a visible appointment review. Booking requires that exact prior receipt-bound review and the visitor’s subsequent confirmation. It does not expose private owner management.

Add credits appears only after the existing agent response reports exhausted usage, or an admitted saved task is paused for credits. Ordinary messaging does not request a credit balance to decide whether to show this control. A confirmed top-up or successful agent response clears it; funding never automatically sends the retained draft.

## Qualification

Local tests use synthetic records and disposable Sources; they do not send real invitations, messages or bookings. Public and owner Calendar tests cover shared availability, duplicate recovery, competing visitors, confirmation records and cold replay. Unit tests cover account isolation, collection completeness, request reuse, guest draft retention and the conditional history icon. Production service deployment and physical-device qualification are separate from these local results.

## Current owner, first entry and retained records

An empty Contacts list is a valid admitted state. On first use, capture the organizer account only after the already-required Connect continuation has resolved its actual owner. A later changed owner is still refused. Retained same-owner displays reopen without another grant or collection read. Empty Contacts offers both Add and Import; CSV, vCard and JSON use the same native import and its returned saved rows.

Calendar dates, Week and Month share the held range. Horizontal Agenda gestures move one day; horizontal day-strip gestures move one week. Vertical movement, text selection and native controls remain independent. Sign-in records remain in their source history and stay out of the Calendar display.

A selected Calendar record paints its recorded facts from the event and any exact held Ledger original. It never asks for a current price. Transfers, Notes and asset trades reuse the existing receipt, trade and funding disclosures. Visitor questions and Twin replies stay readable, with generated transport/debug payloads kept in the downloadable record rather than printed as notes. The existing Calendar bundle is checked once per selected revision; that record-integrity check does not replace its financial or ownership originals. The complete bundle may carry the candidate that the native list projection intentionally omits.

## Your Twin inside Messages

A thin brain icon sits at the right of the attachment row. It opens the same owner’s Twin controls inside the existing sheet: Settings, Mind, Work and Add to website. The ordinary Messages entry does not import this panel, read its settings or request its memory. Tabs reuse a single held owner view. Successful edits use the returned native view instead of refetching it.

The Twin portrait is separate from the profile picture. Its selected image uses the existing image preparation and native portrait operation, with one retained operation ID on an uncertain response. Settings edit named fields only: identity, persona, memory scope, capabilities, permissions, session action limit, voice and presentation, offer and business skills. Native plan restrictions and action approvals remain in force; the form paints the effective saved policy.

Mind displays the native saved memory and source-object index, including carried continuity coordinates where present. An index never replaces its original proof objects. Add to website copies the existing owner-bound Twin embed; its preview loads only when requested.

Work composes the existing native World task and campaign lifecycle. The agent can request research, enrichment, Contacts import and campaign work through the same owner conversation. A task start is distinct from completed output. Chat remains usable while the task runs. Chat and the recap share one progress reader; no ordinary login poll or duplicate timer is added. Successful native contact-import results merge into an already-open organizer once per revision, with no Contacts reload. New Contacts first opened later still use their normal complete source read. Actual revenue and estimated pipeline remain separate native projections; Bankeiz does not invent a conversion or pipeline valuation.

Existing native task-board snapshots are worker-local; campaign and contact results remain in their native retained sources. The interface does not recreate or rerun a task because its progress read is unavailable.

## Credit funding

New top-ups use the native `reserve-settlement-card` quote policy: Reserve first, then Settlement, then card for the uncovered amount. The minimum card deposit stays $0.50; any minimum surplus remains in the available balance. Existing Reserve-only quotes retain their original funding policy and recovery path. A completed native purchase can be recovered without discovering its funding source again; an unavailable selected source cannot authorize a fresh debit. A selected funded-source runtime must provide its own purchase adapter rather than silently borrowing a different writer.

Mind uses the same owner’s native source index, with a compact neural Graph and Kai Continuity view. Links describe source membership and recorded conversation order, not inferred financial causality. Source originals, carried heads and original Kai stay inspectable. The drawing is capped at 240 points; the complete returned source and memory lists remain available. A single canvas draws on resize, selection or a view change, with no idle animation, physics, image preloads or extra requests. The Mind chunk and native index are requested only after the user selects Mind. Only the native orb and Continuity visualization are adapted; no Mind website navigation, dashboards or example workstreams are added. Continuity uses original carried Kai from existing source objects and the native Kai geometry; a display date never manufactures a sealed coordinate.
