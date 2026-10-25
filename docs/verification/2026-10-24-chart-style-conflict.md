# Chart range layout and shared-style audit

The user's October 24 screenshot showed four Account ranges followed by two
more on another row. `app.css` declared four columns; `features.css` declared
six for the same `.periods` selector. The delivered production HTML placed
`features.css` before `app.css`, so the obsolete four-column definition won.
The source component still contained the same six ranges.

Commit `0d9ae03` consolidates six `minmax(0, 1fr)` columns and the existing 5px
gap into the base rule, removing the second grid definition. Account, Market,
Investments and object charts use this shared control. Account typography,
32px height, selection, chart calculations and range behavior remain unchanged.

The delivered-CSS browser check failed against the previous build, then passed
at 280, 320, 390, 440, 480, 720 and 1440px. It checks one row and no overflow
for both base and compact object controls, plus the unchanged Account sizing.
Twelve chart behavior tests passed. `npm run test:browser` includes this gate.

The follow-up audit found no other conflicting property declarations between
the base `app.css` and `features.css` at matching selectors/media conditions.
Object charts have intentional compact overrides; standalone public surfaces
have independent resets. Public navigation disables/restores the carried
surface styles rather than making all route resets active together.

Four `.identity-vault-entry` rules were exact duplicates in `features.css` and
`vault.css`. Retaining their established main definition and removing the lazy
Vault copy removes 437 source bytes. Every computed property of the button and
its text stayed identical at 320, 390, 720 and 1440px in Chrome; 15 affected
Identity/Vault tests passed. This adds no requests, scripts or runtime work.

This is a verified layout correction and exact duplicate removal. It does not
establish that CSS caused the connected Market quote wait or every rendering
symptom. Unproven CSS changes were not made.
