# Messages, Contacts and Calendar

Messages keeps conversations, people and appointments in the same sheet. Calendar and Contacts use the Receiz ID already open in Bankeiz. They show that ID’s existing records and write back to those same records.

## Moving through the experience

- Use the Calendar or Contacts icon in Messages. Return to the conversation without losing its draft, position or active call.
- Open a person to message, call, view their profile or prepare an appointment. Import existing CSV, vCard or JSON contacts, or use the device contact picker where supported.
- Calendar offers agenda and week views, appointment creation, editing and cancellation. Cancellation retains the record and its continuity.
- Your booking link opens a Bankeiz guest page. Configure availability, questions and custom links inside Calendar. Guests choose an offered instant in their timezone, keep their details when changing slots and receive the same appointment held in the host’s Calendar.
- Past conversations appears only with Agent access and actual conversation history. A draft by itself does not make the icon appear.

## Reuse and continuity

The organizer is loaded after intent. Login and ordinary Messages opening perform no organizer reads. One controller shares the same admitted contact collection and calendar ranges across the interface and the owner’s agent. Retained display paints first. Search, category changes and known-range navigation reuse those records. Missing reads share their in-flight request. A successful write merges its actual result without reloading the collection.

A partial contact write never claims a complete collection. Calendar ranges become complete only after admitted owner pages and valid pagination. Closing or changing identity stops old-account operations and discards late responses. An uncertain write preserves the draft and never retries automatically.

## Agent actions

The owner’s agent uses these same organizer operations and receives their actual results. The native tool connection can discover the installed Receiz tool catalog and AI skills. Read-only tools use their native access checks; other actions show the exact retained request for human review. Checking a pending result inspects the same attempt rather than submitting another action.

Native full-tool execution requires the application’s registered `mcp:execute` scope and the same owner’s configured native runtime. Catalog discovery does not grant custody, provision a host or replace a tool’s own consent requirements. Ordinary messaging and financial approvals retain their existing behavior.

An agent replying to another person uses the existing conversation booking tools. It can remember facts the visitor actually supplied, present available times and prepare a visible appointment review. Booking requires that exact prior receipt-bound review and the visitor’s subsequent confirmation. It does not expose private owner management.

## Qualification

Local tests use synthetic records and disposable Sources; they do not send real invitations, messages or bookings. Public and owner Calendar tests cover shared availability, duplicate recovery, competing visitors, confirmation records and cold replay. Unit tests cover account isolation, collection completeness, request reuse, guest draft retention and the conditional history icon. Production service deployment and physical-device qualification are separate from these local results.
