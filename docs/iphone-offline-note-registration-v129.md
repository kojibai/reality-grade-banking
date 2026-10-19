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
