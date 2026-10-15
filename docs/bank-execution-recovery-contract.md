# Exact Bank execution recovery

This implements the recovery portion of the approved native Bank completion
plan. It uses SDK 129.0.0 beneath the existing registry and does not create a
new balance, operator authority, funding source or bank command.

The shared executor must retain an exact reviewed plan and its complete
verified transition set before any SDK staging or execution call. A failed
local retention must leave that same review usable. A customer-shaped copy
of a review never authorizes submission.

An SDK-authenticated staging refusal with the exact application, domain,
operation, plan, semantic key and attempt is a terminal zero-write result.
Transport errors, foreign refusals, unauthenticated response data and
ambiguous delivery remain unknown. The existing SDK is responsible for
admitting runtime responses; no JSON flag can replace its custody.

Retain the exact zero-write reason. Reopening a retained terminal refusal
must work without a new network lookup. Reopening a committed recovery must
independently verify the same complete transition set. Pending/unknown
operations resolve only at their original semantic idempotency coordinate.

Tests cover refusal identity, foreign responses, retention failure, restart,
and prevention of staging or execution during recovery. Existing canonical
SDK rejection tests remain in place. A source capability expiring cannot block
read-only lookup of its original result. The lookup uses only
`receiz:domains.read`, with its own displayed consent and explicit user action;
it does not acquire native write scopes. A committed status and an export both
reopen canonical recovery before reporting success. Pending execution custody
prevents removing or replacing its device identity, including concurrent
changes inside the storage transaction. This work does not establish that
Send, exchange, custody sales, funded issuance or Settlement Note funding
has been implemented or qualified.
