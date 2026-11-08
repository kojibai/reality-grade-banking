# Complete receiving names — 8 November 2026

Receive displays and copies the complete generated name without the optional `receiz_` prefix. Both the full prefixed name (25 characters) and full unprefixed name resolve through the existing directory to the same stable account UID. The final character is never removed. Custom names and existing shorter links remain compatible.

The exact Receiz receiving-name projector is included in the native source inventory. An older shortened profile locator supplies the full name only through its retained identity binding. Account creation, identity bytes, account IDs, historical ownership and payment execution remain unchanged.

Local isolated qualification, excluding unrelated concurrent changes:

- Production `npm run build` passed, including type checking, native inventory, compiled entrypoints, Registry, source archive, offline shell and public pages.
- Six focused test files: 40 passed, including actual Receive DOM/copy/QR, full-name lookup against the older locator, recipient identity and request parsing.
- Frozen account-entry gate: 63 passed.
- Receiz companion directory/native Source checks: 27 passed; scoped lint and production build passed.

The existing browser lookup count and payment approval flow remain unchanged. No first-paint wait or payment was added or executed. The actual Receive DOM checks the full unprefixed address and copied bytes. GitHub CI and live deployment are separate, unclaimed evidence. Deploy the companion Receiz route update for complete-name resolution against older hosted profiles.

Profile URL aliases and Cadence's shared catalog/cold-entry repair remain separate work; this commit does not claim either is complete.
