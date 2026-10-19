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
