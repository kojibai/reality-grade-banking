# Continue a profile Message through account entry

An explicit profile Message action retains its exact recipient through the
existing account entrance. Saved-device identity restoration finishes first.
If it restores an account, that account continues to the chosen conversation.
If no saved account exists, the same normal new-account entry used by Enter is
attempted once for that action. A restoration error does not replace an existing
account or create another one. Ordinary visits to the entrance do not create an
account automatically.

The Message action authorizes the existing messaging consent and scopes, through
the same native messaging API as Enable messages. Existing direct conversations
are reused; a new conversation follows the existing creation and recovery path.
The selected conversation's input receives focus. No message text is generated
or sent. Identity Record and PBI access remain available through the existing
entrance; a device cannot automatically retrieve a record stored elsewhere.

Regressions observed failing before the change covered the missing automatic
new-account continuation, missing composer focus and extra messaging-consent
screen. Passing checks cover restoration before entry, one attempt per action,
preserved restore failures, exact recipient handoff, reused conversations,
focused input, no duplicate creation on reopen and no automatic message send.
The five-file Message/account selection passed 84 cases; the combined profile,
navigation and Message selection passed 113 cases. Type checking and the
production build passed. Independent review approved the final behavior.

The final full working-tree suite passed 3,151 cases without skips; four newly
introduced operating-manual cases belonging to the other developer failed.
See the profile-navigation verification record for that explicit limitation.
No real account, payment or trade was submitted during verification.
