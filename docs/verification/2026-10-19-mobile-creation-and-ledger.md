# Mobile account creation and Ledger transfer valuation

The user reported account creation failing in iPhone Safari Private Browsing,
then succeeding on desktop, and subsequently succeeding again on mobile.
No production code change was deployed during that recovery. The precise
mobile error was not captured, so neither cache nor database health is an
established cause. Do not reset website custody to troubleshoot this report.

Creation now annotates recognized failures with a fixed stage (proof resources,
device signer, identity seal, account genesis, portable identity or device
custody) and a recognized SDK/DOM error code. Arbitrary error messages, private
key material and identity bytes do not enter those diagnostics. SDK certificate,
resource, artifact admission and custody verification remain in force.

The subsequent phone report supplied the precise stage and code:
`device-signer · offline_seal_certificate_invalid`, in both Private and regular
Safari. The user again reported successful retry. Three isolated live enrollment
responses passed the unchanged v129 verifier against its pinned roots. An
isolated reproduction with one genuinely verified disposable enrollment then
set only that test process's clock 1 ms before the certificate's issuance: v129
returned the same error. Restoring the clock passed with the exact same enrollment.
The phone's actual failed certificate and clock were not captured; this proves
the timing weakness, not that it explains every reported phone failure.

The host now waits for actual local time when an existing or freshly returned
certificate is at most 2 seconds in the future. Current certificates add no timer.
A monotonic deadline bounds the wait if wall time stalls. The response bytes,
certificate, issuance date, private key and store remain unchanged, and the SDK
still performs all existing checks. Large clock errors, malformed certificates,
invalid signatures and other failures are not accepted or reset. A second live
disposable-certificate probe reproduced failure with a progressing clock 100 ms
behind issuance; the guarded path passed unchanged v129 verification after 102 ms,
with the exact same enrollment and zero extra requests for the guarded check.

The supplied Supabase CSV contains 100 edge requests, all HTTP 200, between
09:22:06.840 and 09:22:12.669 UTC. Of these, 89 are chat unread-count HEAD
requests. The matching Receiz implementation issues one count per conversation;
that burst is a performance lead, not proof of the Realtime incident's cause.
Read-only service logs show successful Realtime health checks, two tenant
migrations completed at 09:21:34 UTC, and an administrator-triggered database
restart at 09:22:45 UTC. The database was back at 09:23:16 UTC and the subsequent
read observed 24 of 120 connections and zero blocked sessions. One earlier
JSONPath error was the agent's rejected read-only inspection query. The returned
logs do not establish a resource exhaustion or replication failure before the
restart. No database or service configuration was changed by this investigation.

Ledger replay coverage, authority boundaries and original snapshot priority are
documented in [recorded card transfer values](../recorded-card-transfer-values.md).
The retained-source regression replays 43 additional copy-bound models, preserves
41 recorded snapshots and refuses the remaining 174 unsupported rows. It asserts
zero fetch calls and reuse of the same event result across local pulse ticks.
Native golden replay, wrong-copy rejection, mismatched snapshot pulse, model
bounds and shareable receipt operand retention have focused regression coverage.
