# Messaging entry and PWA update discovery

The Messaging and Twin factories now belong to the Identity runtime's static
module graph. Opening Messages no longer performs those two dynamic imports
after connecting. Messaging was already a static dependency of the app; the
Twin factory is the additional eager dependency. Constructors and authenticated
requests still run only through the existing account operations.

The reported first-open module failure coincided with production deployment
activation. Current module URLs returned JavaScript; older locally recorded
hashed URLs returned 404. This supports a deployment-version mismatch, but the
failing URL from the phone was not captured, so it does not establish the exact
failed module. This change cannot repair code already running on a device.

The PWA checks for public worker updates on visible foreground return and online
events. Checks are coalesced and throttled to once per minute. A failed initial
registration can retry on a later qualifying event. The browser's normal waiting
and activation lifecycle is unchanged: no forced reload, cache clearing, worker
takeover or private account reads were added. Existing retained account storage
is untouched. A downloaded worker can continue waiting while an old app window
is open.

Validation used HEAD 0475656 plus only the four scoped source/test files in an
isolated checkout with the locked dependencies, excluding concurrent meeting
work. The full suite passed: 653 files, 4,020 tests, no skipped tests. The full
production build passed. Focused messaging, identity and worker tests also
passed. The first sandboxed suite attempt could not open two local test servers;
the unchanged suite passed with loopback access. No tests or timeouts were
weakened. Read-only review found no important defects in the final patch.

No production deployment or configuration changes were performed.
