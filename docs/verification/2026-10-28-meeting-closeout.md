# Meeting closeout — October 28, 2026

Final v4 user law: End closes the room and chat console, then presents a finished screen in the existing entrance style. Calendar precedes Record. New meeting uses the existing /meet/start/ entrance. Save session and Save Identity Record are separate, explicit exact-file downloads; End exports neither.

MeetingRoom keeps the existing controller and encrypted capture lifetime. RTC departure remains immediate. Capture finalization, remote acknowledgement, sealing, download work and optional Twin recap cannot block the finished screen. Session export waits on the same outstanding departure and final-record job; it uses the exact retained File, with no new signature, format, authority or Identity backup. Identity export uses the existing backup bytes and filename, with the same PNG MIME mapping as existing account export. The private unlock phrase is excluded.

Controller acknowledgement errors remain visible. The screen distinguishes a known ended call from local departure with an unconfirmed end. Rejoin is absent while the same departure is pending; an active room can be rejoined afterward. A failed seal/export remains retryable without another End, while the exact final proof is retained. Optional old folder export still works from Record; it does not replace the new separate save actions.

The new closeout contract was observed failing before implementation, then passing. Focused contracts cover host End, guest Leave, remote End, historical reopening, failed acknowledgements, delayed departure, delayed Rejoin, current-proof selection, old packaging, same-file retry, no automatic Identity disclosure, unknown initial call state, manual exports and preserved optional Twin/follow-up behavior. The final complete engineering baseline binds their exact source and assertions.

The actual Chrome harness observes populated public walkthroughs at 320/390/440/768/1280 and End → finished screen → separate session/Identity downloads at 390/1280, both normally and after an injected seal failure. It inspects session ZIP evidence and exact Identity bytes; no automatic export or duplicate End occurs. It uses clearly synthetic meeting/Identity fixtures, no live call, real account, customer email, payment or physical credential.

[Mobile screenshot](images/2026-10-28-meeting-closeout-390.png) and [desktop screenshot](images/2026-10-28-meeting-closeout-1280.png) show the final screen. The parent inspected the mobile rendering; it confirms the entrance style and distinct save actions. No observed visual evidence contradicts the intended closeout. Browser download delivery is not proof of an operating-system save.

Independent review found and corrected hidden controller errors and premature Rejoin; re-review reported no remaining Critical or Important findings in this scoped change. Final aggregate/build/source qualification and publication have their own records in the v4 qualification ledger.
