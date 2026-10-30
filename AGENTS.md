# Bankeiz agent rules

Account entry is frozen to the exact working creation path preserved in `tests/fixtures/account-entry-frozen.ts.txt` under [docs/account-entry-frozen-invariants.md](docs/account-entry-frozen-invariants.md). Read that document before changing identity, account creation, shared storage or entry.

- Unrelated naming, profile, media, Feed, Discover, presentation or performance work must not change account entry.
- Normal creation never asks the user for a passphrase. Preserve internal bootstrap protection and the admitted, self-contained, phrase-free Identity Record.
- Respect the exact installed SDK input contract. Display names belong in the shared projection; do not pass display fields or a new creation coordinate into the onboarding sealer.
- Run `npm run test:account-entry-freeze` for any shared identity/storage change and before releasing an entry repair. Every production build also enforces the frozen creation function.
- Never replace the real SDK guard with a permissive mock or update the frozen fixture/tests to ratify a regression. An intentional entry change requires an explicit user request and passing real SDK and end-to-end evidence.
- Preserve existing identities and other agents' changes. Do not reset the branch, erase device custody or weaken artifact verification to make entry pass.
