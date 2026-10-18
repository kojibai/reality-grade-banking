# Public Ledger inspection

Preserve the public Ledger layout and the shared account-history experience.
Every supported record opens to its complete selected display context: value
basis, exact monetary operands, participants, ownership references, event
coordinates, source evidence and receipt/original links. Source responses remain
display projections; inspecting a row does not independently verify its claims.

1. Retain bounded, explicitly selected public source fields in the existing row
   parser and offline cache. Exclude credentials, conversations, note tokens,
   arbitrary metadata and private identity custody. Keep old caches compatible.
2. Add a shared inline inspector with readable groups, expandable exact fields,
   an explicit local JSON download and safe original/receipt links. Receipt URLs
   carry only the selected public context, never private account source fields.
3. Show event value and locally recomputed proof value separately. Keep current
   valuation coordinates visible. Do not aggregate repeated witnesses into an
   economy balance or replace absent evidence with invented amounts.
4. Use the same inspector on public and account history and expose the carried
   title/evidence/value fields on the existing compact receipt page.
5. Test source/privacy boundaries, cache and receipt round trips, missing fields,
   all activity types, keyboard use, mobile containment and offline inspection.
   Run the production build and source/offline distribution checks; commit main.

The one-time private legacy recovery stays outside both repositories and public
archives. No more database reads, SQL, issuer changes or financial execution.
The recovered pre-migration data does not close missing historical ownership.

The selected public Mind capture and bundled market membership are also retained
locally. Rebuild their display seed without a database or network call; pool
repeated identity context to preserve all selected fields within the existing
32 MiB decoded limit. Restore 1,678 proof values/owners and exact original links.

The value calculator captures the SDK current pulse on Calculate, labels that
result “Present value at pulse”, and keeps the original coordinate fixed. Its
read-only evaluation field displays the chosen coordinate. Historical slider
samples and imported replays retain their explicit coordinates; the pure v129
arithmetic and proof verification do not change.

Global publication uses the existing shared discovery/source routes. Track the consumed cursor across concurrent appends, retry failed canonical source refreshes, and refresh existing publications on page reopen. Notifications only request a read and never replace source verification or disclosure consent.

Publish the installed SDK schemas byte-for-byte at `/schemas/`, with original generation paths, full reference closure, ZIP and digests. Derive coordinated release metadata from application/lockfile/installed SDK/MCP/AI Skills and the native source manifest, refusing mixed releases. Document the actual v130 upgrade and requalification path without installing or claiming unreleased packages.
