# Ledger cold delivery and profile asset creation

## Qualified change

Both `/ledger/` and `/ledger/proofs/` now ship readable settled rows and one complete compressed public Ledger seed. The current complete Market supplies the Proofs projection. Authenticated Ledger reuses that already-selected public family instead of reading the same Proofs source again. A newer prepared cohort cannot be replaced by an older held Market capture; current withdrawals retain their existing selection rules.

The refreshed public capture contains **51,353 records**: 44,431 actions, 263 public wallet records, 4,974 graph records and 1,685 public Originals. It includes `imported-b69c12eaabfb7e5e2a3875c936a728f2670c007d7ad191471388da23c78e73d4`. Every previous seed record ID remains present. The prior actions and wallet records retain their exact entry hashes, predecessor hashes, amounts and temporal coordinates. New native funding context is carried as supplied; it is not replaced by calculated legacy attribution.

The gzip seed is 6,153,479 bytes; its compact decoded wire is 37,754,331 bytes. SHA-256: `2e278e9d41199d7588cb42e0cd25e0ec52ef45449a7b6da0ae55f1633aa0bd20`. The seed decoder now shares the existing 64 MiB decoded bound used by prepared Ledger documents and archives, retaining its existing 8 MiB compressed transport bound. Repeated public context is stored once through the existing wire format.

Saved Ledger export uses that same compact wire instead of expanding repeated context into every record. Existing canonical sealing, public-field selection, archive checks, integrity verification and recovery remain in place. The controls read **Save Ledger** and **Open saved Ledger**. No financial authority is assigned to a captured public display.

Safari and Node use different English date/time punctuation. Initial Ledger timestamps normalize that connector so hydration retains the server-rendered rows. Ordinary local formatting resumes through the existing effect. No additional read or wait is introduced.

An owner-only **Create an asset** plus icon opens the existing CreateAsset composer through the existing profile Sheet/portal. It uses the held owner identity and existing refresh callback, preserves the profile root and URL, and closes back to the profile. Anonymous and other-owner views do not expose the control. The gaming guide CTA links to `https://wildz.quest/`.

## Verification

- Full suite: **964 files passed; 6,074 tests passed; 9 existing conditional tests skipped**. Both optional public-membership fixture checks ran against the real shipped cohort.
- Frozen account-entry command: **7 files, 62 tests passed**.
- Additional timestamp/held-Ledger regression run: **59 tests passed**, including real hydration with the Node/WebKit connector difference; typecheck passed.
- Full production build passed, including cold document guards, source archive, offline shell, native boundaries and deployment packaging: **4,159 files, 15 relocated entry documents**.
- Eight browser cases passed: WebKit at 390 px and Chromium at 1,280 px; both Ledger routes; JavaScript enabled and disabled. All 51,353 records and 1,685 current Proofs remained carried, the target was in the first Proofs page, and no hydration errors, runtime errors or overflow occurred. The shared public-network reader made zero initial requests while its source was unavailable.
- The real SDK sealed and canonically verified the complete Saved Ledger under isolated conformance issuer fixtures. Exact offline reopening and tamper rejection passed. No personal identity or production financial action was used.
- Existing vault create/fund/private-image/reopen integration was audited locally with real SDK guards and isolated native issuer fixtures. The reported phone failure occurs after approval and remains unidentified. Existing live modules match the audited local build. This report does not claim a production vault repair.
- Both deployed Feed trade-dialog X controls worked in WebKit, including nested and scrolled Feed dialogs. No speculative close-handler change was made.

## Boundaries and release state

No account-entry function, identity custody, financial admission, transaction execution or SDK version changed. Existing Ownership/PWA work was preserved. Ordinary navigation retains its existing compact entries; the complete Ledger is not copied into every unrelated page.

These results qualify the local implementation and its commit. The preceding live check observed historical Ledger delivery and an unavailable public Proofs endpoint. Deployment and verification of the new deployed responses remain separate steps after pushing this commit.
