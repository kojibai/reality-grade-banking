# Meeting End and private download — 2026-10-28

## Governing behavior

End and Leave stop local RTC media through the existing native call controller immediately. The Record panel opens in the same user action. Recording finalization, remote acknowledgement, proof sealing, download packaging and the optional Twin recap cannot gate that departure. A pending departure displays its already-known stopped-media state rather than Connecting.

A successful terminal recording prepares one ordinary private ZIP folder containing readable meeting JSON, actual captured media, the exact sealed meeting Original under Proof, and the current existing Identity Record under Identity. The unlock phrase is never included. Download transport and extracted content do not replace either enclosed proof object. The archive is not published, sent to other participants or used as new identity authority.

A failed seal, retention, package or browser handoff remains retryable from **Download meeting & ID**, without ending the call again. Reopening an already-ended room does not automatically export an Identity Record. Its explicit download uses the retained final proof.

## Confirmed large-record failure

Installed Receiz SDK 129 canonically verifies its exact sealed output before returning it from `seal()`. ZIP sources retain native ZIP structure with a trailing proof; the SDK returns the canonical filename and MIME type.

The previous `meetingArchive().seal` performed a second generic whole-file verification. The generic admission's 16 MiB in-memory limit returned `denied: VERIFICATION_RESOURCE_UNAVAILABLE` for a valid larger recording; native code incorrectly converted that operational denial into `MEETING_RECORD_PROOF_INVALID`.

`sealMeetingRecord` now consumes the completed canonical verification returned by the existing sealer, preserves its exact bytes/filename/MIME, and introduces no new signature, issuer, session, authority or network request. The SDK still rejects a failed canonical verification.

Disposable synthetic-custody reproduction, using canonical SDK algorithms/resources and ephemeral test trust roots:

- A 17 MiB playable recording produced a 17,860,407-byte meeting Original. Canonical verification and integrity passed; the obsolete generic admission still denied it for its resource limit.
- The actual production helpers created an ordinary 35,744,022-byte outer ZIP. Meeting proof, Identity Record, meeting JSON and playable media remained byte-identical after extraction; both Originals verified. No unlock phrase was present.
- Standard ZIP integrity and complete audio decode passed. The reproduction made zero network requests. It did not use a user's identity or a live meeting.

## Retention and interruption contracts

- A proof already sealed before a retention failure remains exact. Retrying identical capture/evidence/interpretation inputs retains and returns that same file without another seal.
- If final evidence changed after an earlier active-call proof failed retention, the older exact proof is retained first; the new terminal input receives its own sealed proof. Finality is projected from the retained proof's carried call metadata, never from newer requested inputs.
- Guest departure snapshots and terminal ended/archived records are distinct. Rejoining permits a later departure record and a subsequent final export.
- Different exact proof files queue separately for download packaging. An earlier successful or failed package cannot swallow delivery of the terminal proof.
- Identity recovery still waits for buffered recording finalization before disposing that Identity. The existing identity, PBI, private Twin context and financial primitives are unchanged.

## Qualification

The clean candidate starts at `2a455cfb320c3f08e9298cfbaba7cfbb79cb90ee` and includes only the meeting patch and two stale public-catalog count corrections (150 to the existing 151). The separate v4 guide, causal story, Investments polish and another agent's transfer work are excluded from this scoped candidate.

Commands: complete Vitest suite; TypeScript; source-bound product/meeting preview checks; complete production build, source inventory, licenses, offline shell and public-page gates; real Chrome meeting walkthrough/download checks; independent continuity review. The exact dependency runtime is installed from the unchanged npm lockfile; package-runner automatic upgrades are not qualification evidence.

Controlled real-browser checks exercise the actual MeetingRoom, capture, ZIP helper and browser download in phone/desktop viewports: immediate End, exact private contents, no duplicate End, and same-call retry after an injected save failure. Public walkthroughs are checked at 320/390/440/768/1280 pixels. Their meeting and Identity bytes are explicitly synthetic fixtures, not financial or identity admission evidence.

Physical iPhone/OS file-picker completion and the user's particular live meeting archive were not observed. An anchor handoff is not proof that a user saved a file; the explicit download action remains available. Recording still requires the existing host action; uncaptured intervals are never represented as recorded.
