# Local account genesis and first paint

New Bankeiz accounts initialize from the SDK-generated device identity's
verified bootstrap state. The creation path signs an empty account genesis
with that same identity key, seals the complete Identity Seal, then reopens
it through the existing canonical artifact verifier and identity admission.

The genesis carries zero Reserve, zero Settlement and a zero total, with its
identity binding and creation time. Its chart begins at identity creation.
The same original is included in the downloaded Identity Seal. The encrypted
device observation supplies first paint after reopening; the signed carried
state supplies recovery when that observation is absent.

Import and restore never initialize an absent balance to zero. The creation
helper refuses a previously carried wallet or non-bootstrap state. SDK
verified segmented content takes precedence over the snapshot inspection
alias. No display observation supplies funding or transfer authority.

Opening this local genesis does not wait for identity continuation, wallet
reads or runtime qualification. Background synchronization can add confirmed
account observations; its failure does not invalidate or erase the signed
empty genesis. A confirmed account placement preserves the original opening
chart point under that same identity's returned account coordinate.

The local crypto tests exercise the actual pinned SDK 129.0.0 signing and
portable-state verifier. The hook tests cover pending/failed background reads,
existing balances, late replies and creation single-flight. The isolated
browser fixture renders the actual Account and chart components from a
throwaway signed genesis, without enrollment, remote account creation or a
wallet API request. This verifies entry and display, not financial execution.

Validation on October 15, 2026: 358 tests across 96 files passed, the production
build passed, and the source archive/license/conformance build checks passed.
The actual browser fixture passed at mobile and desktop sizes; Total,
Settlement, Reserve and time-period switching retained the local zero balance
and rendered chart with no console errors. Separately, the browser IndexedDB
fixture passed pending-custody removal/replacement and concurrency checks.

An independent review found that recovery lookup requested overly broad native
scopes and that a retained committed label needed independent re-verification.
Both were fixed with failing-then-passing regression tests. The retained commit
refresh callback was also connected to the existing account refresh. No real
identity was enrolled and no financial action was executed during these checks.
