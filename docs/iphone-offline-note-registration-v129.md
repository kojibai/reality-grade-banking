# iPhone Offline Note registration — v129

## Verified boundary

The reported iPhone Safari/PWA error is
`OFFLINE_NOTE_CUSTODY_ATTESTATION_FORMAT_UNSUPPORTED`, after one Face ID prompt.
It occurs at registration, before strict-counter qualification. The screenshot
does not contain the returned format or counter; it cannot establish either.

Apple documents that new Safari platform credentials are passkeys and do not
provide an attestation statement:
[Meet passkeys, WWDC22](https://developer.apple.com/videos/play/wwdc2022/10092/).
A PWA installation does not add a native App Attest adapter to this code path.

The existing v129 implementation composes:

- Bankeiz's exact registered origin/RP, delegated account consent and challenge ticket.
- `verifyRegistrationResponse` for the original challenge, origin, RP and user verification.
- The existing trusted vendor attestation, single-device/non-backed-up credential and chain checks.
- The v129 platform certificate and two exact sequential assertions for rollback qualification.
- Exact previous-head consumption, receiver binding and whole-value preservation.

The `ios-secure` adapter-kind name in the generic v129 qualification schema is
not an implemented Safari/App Attest certificate or assertion verifier. No
native adapter or SDK/MCP/AI Skills version change is included here.

## Change

After the original registration response passes its challenge/origin/RP checks,
a `none` format now returns the precise public code
`OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED` instead of calling it an unknown
format. Other unsupported formats retain their existing result. Neither result
issues a custody certificate or qualifies the credential.

Bankeiz keeps the existing Note panel and reports the missing device custody
evidence in plain language. Its support details retain only the bounded public
code. Credentials, challenge tickets and account data are not added to UI,
logs, share links or documentation.

Both custody slots must still qualify before the existing browser runtime can
request Reserve or Settlement allocation. A failed registration does not become
an issued Note or an available balance. Its already retained unissued attempt
uses the existing resume/discard behavior.

## Verification

- A public upstream legacy Apple CBOR/X.509 vector still passes the existing
  attestation stage. This does not qualify a current iPhone or its counter.
- A test-only `none` conversion of that vector returns the new code and invokes
  no certificate signature. It is not presented as a real current-iPhone capture.
- A wrong challenge is rejected before device-support classification.
- The delegated Bankeiz route preserves the exact origin/client/RP and returns
  the missing-evidence result as HTTP 422, without a certificate.
- Bank transport preserves that failure without automatic retry or certificate substitution.
- Existing tests still reject backup eligibility, absent/repeated/decreased or
  unexpectedly advanced counters, restored pre-send state and wrong receivers.
- UI tests retain the existing layout, safe support code and absence of a success
  or balance-refresh claim on registration failure.

## Deployment and remaining qualification

The Receiz commit supplies the new classification and the Bankeiz commit its
specific message. Existing native v129 browser transport already passes the
bounded code; its verifier, certificates and package versions do not change.

**Consumer iPhone Safari/PWA Offline Note registration remains unqualified.**
This change clarifies the actual boundary; it does not enable unsupported
credentials. A fresh real-device attempt after deployment can distinguish
`none` from another unsupported format. End-to-end financial qualification
still requires actual compatible device evidence and disconnected create →
send → deposit → credit → spend tests. No such real-device financial test was
performed by the agent, and production financial selection is unchanged.

## Safari/PWA evidence review

The browser path already sends the original `attestationObject`,
`clientDataJSON`, credential public-key material, transports, attachment and
client extension results through the exact Bankeiz challenge ticket. Verified
assertions then bind the custody key and RP to the exact previous head,
receiver, value and successor. Adding another copy of these bindings cannot
create a missing irreversible device state.

| Browser evidence | What it establishes | Remaining boundary |
| --- | --- | --- |
| WebAuthn challenge, RP hash, origin, signature and user-verification flag | The enrolled key approved the bound operation in the expected realm | Does not itself establish non-exportability or retirement of the previous state |
| Vendor attestation and signed backup flags | Provenance and credential backup properties, when trusted and actually supplied | `none` is not vendor attestation; single-device support must be verified |
| Signature counter | The assertion's authenticator sequence, if implemented | v129 requires both qualification assertions and each consumption to advance by exactly one; missing, repeated or advanced counts still fail |
| PRF extension, if supported and requested | A credential-bound derivation useful for encryption | Re-evaluating the same input can reproduce the output; it does not prove one-time consumption |
| `largeBlob`, if supported and requested | Opaque data stored with a credential | The interface permits rewriting; a successful write is not a verified compare-and-consume or rollback-proof retirement receipt |
| IndexedDB, OPFS, persistent-storage requests and Web Locks | Local retention and coordination between cooperating app contexts | Browser-controlled state does not supply an independent attested rollback anchor |
| PWA installation and feature-capability advertisements | Application presentation and advertised API support | Neither qualifies a financial custody profile |

Sources: [WebAuthn Level 3](https://www.w3.org/TR/webauthn-3/), sections 6.1.1,
6.1.3, 10.1.4 and 10.1.5; [Safari 18 PRF support](https://webkit.org/blog/15865/webkit-features-in-safari-18-0/).
The PRF/largeBlob conclusions are protocol analysis of those interfaces, not
a claim that extensions were captured from this user's iPhone. No device
counter, backup flags or current attestation format can be recovered from the
earlier screenshot alone.

Apple's [managed passkey attestation configuration](https://support.apple.com/guide/deployment/depd218e61b5/web)
requires device-management enrollment and an attestation identity. It is not a
consumer Safari preference, and its availability alone does not establish the
single-device and exact-counter requirements. An external authenticator would
also require a deliberately supported attachment path and real qualification;
the current adapter selects platform credentials. Neither route is silently
enabled or represented as qualified here.

The current review establishes no additional consumer Safari/PWA evidence that
can safely replace the missing v129 custody evidence. Registration must remain
unqualified until an actual browser-accessible device path passes the existing
checks. No native app, new custody certificate, counter relaxation, delayed
double-spend acceptance, or online-only substitute is introduced by this work.

## Actual browser-format diagnostics

Failed delegated registrations now retain a bounded, in-memory diagnostic from
the original browser response: its CBOR `fmt`, unsigned registration counter,
user-verification flag, backup eligibility and backup state. Registration details
explicitly label this browser report as unqualified. The original attestation
object, client data, challenge ticket, credential ID, extensions and delegated
request are unchanged; none of those private fields enter the displayed report.
The exact original Error and public failure code are preserved. This diagnostic
does not classify support, issue certificates or bypass the canonical verifier.

Synthetic `none` fixtures test byte-preserving transport and presentation only.
The earlier screenshots contained no format, flags or counter. On 2026-10-19,
the user supplied an actual iPhone Safari registration-details screenshot:
`OFFLINE_NOTE_CUSTODY_ATTESTATION_NOT_PROVIDED`, format `none`, registration
counter `0`, user verified `Yes`, backup eligible `Yes`, backed up `Yes`. Safari
identified the connected device as iOS 26.5.2. The screenshot is evidence of the
browser's diagnostic report, not independent attestation verification.

That response cannot satisfy the existing requirement for trusted device-bound
attestation and a non-backup credential with the required exact counter
progression. Registration counter zero alone does not prove what later
assertions would report; the absent attestation and positive backup flags
already prevent qualification. Re-encoding the original response cannot add
missing evidence. The verifier and production enrollment gate remain strict.
No native app, substitute issuer, reset or browser-storage counter was added.

The older installed PWA's `offline-note-checkpoint · OperationError` is a
separate unresolved record-decryption issue. Safari's new registration attempt
does not decrypt, repair or reset that PWA container. A read-only AES-GCM probe
was locally tested, but the remote PWA inspector did not complete even its
context evaluation, so no actual phone keys, checkpoint bytes or decrypted
payload were captured. No real iPhone registration or financial operation was
performed by the agent.

## Current PWA attempt — October 19, 2026, 7:55 PM

The user's new screenshot reaches registration and reports the same `none`,
counter `0`, user-verified, backup-eligible and backed-up response. Its pending
attempt is readable. This is no longer the saved-checkpoint error for that
attempt; it does not establish recovery of the older PWA record or container.
No private device storage was read or reset in this check.

The Bank now cancels a known registration refusal only when the original
encrypted runtime independently reopens its attempt in `preparing`. It holds
the existing account execution and Notes locks and calls the existing canonical
`cancelUnfunded` operation. It adds no cancellation implementation or issuance
authority. Funding, issuing, prepared and unreadable states remain held. Failed
cleanup retains the original error and pending source. The UI removes Resume
only after a successful pending read returns no attempt; a failed read cannot
clear the recovery controls. The registration evidence remains visible.

The device-only review also checked the shipped `offlineSeal.ts`: its enrolled
non-extractable Ed25519 WebCrypto key signs native proof objects, but enrollment
does not attest a hardware monotonic state or retire a previous spend head.
Reusing this valid signer as irreversible custody would cross that boundary.
The `ios-secure` schema label is still not an implementation of that operation.

PRF and largeBlob have useful encryption/storage roles, but their documented
interfaces do not add an attested atomic compare-and-consume operation. This is
protocol analysis, not a claim to have captured those extensions from the phone.
See [WebAuthn PRF](https://www.w3.org/TR/webauthn-3/#prf-extension),
[largeBlob](https://www.w3.org/TR/webauthn-3/#sctn-large-blob-extension) and
[WebCrypto security considerations](https://www.w3.org/TR/webcrypto/#security-considerations).
Apple's native [App Attest interface](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity)
does not supply a Safari JavaScript adapter. Managed passkey attestation requires
device enrollment and a configured identity; it does not, by itself, establish
the counter/irreversible-consumption contract. No native app, external device,
management enrollment, new issuer or online-only substitute was added.

There is still no qualified consumer iPhone PWA custody path in the current
implementation. Changing the SDK version or re-encoding this response cannot
create missing device evidence. The prepared local-credit activation gate and
the independent shared-writer/reconnect qualification gates remain unchanged.

Current native checks passed: 21 registration/transport/strict-counter tests,
plus all eight real-v129 prepared create → handoff → deposit → respend journeys
with networking disabled, changing quotes, interrupted adoption and restart.
Those eight journeys use ephemeral test roots and synthetic attested hardware.
They are not physical-device or production financial qualification.

Bank regression checks passed: 267 files / 1,615 tests. The first full run
overlapped native proving and the build and timed out in
`market-history.test.ts` and `market-capitalization-hook.test.tsx`; both files
passed independently, followed by the complete suite with two workers and
unchanged timeouts. The 390 × 844 isolated panel check removed Resume after a
confirmed cancellation, retained Registration details and the unissued preview,
had no horizontal overflow and reported no browser console errors. Its API
outcome is synthetic; it does not enroll a credential or move value.
