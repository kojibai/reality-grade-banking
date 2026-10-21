# Message and call notifications

Bankeiz uses standards-based Web Push with Receiz's existing chat notification
sender and subscription storage. No separate notification service, Apple
Developer enrollment, native application, or financial permission is required.

## Enable on a device

Open Messages, select the bell, and select **Enable notifications**. The operating
system asks for permission. On iPhone and iPad, open Bankeiz as an installed Home
Screen web app on a supported OS (Web Push was introduced in iOS/iPadOS 16.4).
Notifications follow the device's Focus, preview, sound and notification settings.
Browser support determines the available notification actions and presentation.

A message notification opens its conversation. A call notification opens the
same conversation's still-active call invitation; the user accepts the call in
Bankeiz. An ended or expired invitation opens the conversation. Web Push does not
provide native Phone/CallKit ringing, background microphone access, or guaranteed
instant delivery. Messages and calls still work when notification permission is
declined or the browser does not support push.

## Existing infrastructure and deployment

Deploy the Receiz host changes before deploying Bankeiz:

- `/api/chat/notifications/push` retains cookie access and adds the existing
  verified `receiz:chat.read` bearer access. A present invalid bearer cannot fall
  through to a cookie. The verified subject selects the account; request bodies
  cannot select it. GET returns only existing public configuration; POST registers
  a subscription; DELETE disables that owner's exact endpoint.
- The existing `chat_push_subscriptions` table and Web Push VAPID configuration
  are reused. This change adds no SQL migration or new signing key.
- Existing chat message and call writers remain responsible for notification
  delivery. Each pushed envelope includes its recipient account ID. Bankeiz does
  not poll or send a second notification for the same event.
- Bankeiz registers under its own origin and existing root service worker. Its
  native relay allows only the exact push path and GET/POST/DELETE methods;
  cookies are not forwarded.

An older active Bankeiz worker may need the app's existing normal update cycle:
close all Bankeiz windows and reopen. Registration checks for notification support
before subscribing. It does not force a waiting worker to take over a live
financial runtime. No notification work blocks account or public-page first paint.
Already-consented registration is restored when Messages opens and concurrent
restore attempts share one operation.

## Privacy, continuity and scope

The worker stores only a notification account selector in a separate local
preference cache. It does not store message bodies, tokens, financial data or
proof there. Notification display requires the envelope recipient to match that
selector. A mismatched or malformed envelope produces a generic alert without
private content. Supplied URLs are ignored; destinations are built from validated
conversation and call identifiers. Notification clicks are checked again against
the current account and the existing host's conversation membership.

Turning notifications off clears the local binding, disables the exact remote
subscription, and unsubscribes the browser. Forgetting the device identity also
clears local notification delivery, including when the service is unreachable.
A notification does not create an identity, grant access, join a call, send a
message, alter proof, or move money.

## Qualification

Automated checks cover registration/refusal/revocation, click targets, account
isolation, expired calls, unsupported workers, and the existing offline worker.
A local test is not evidence of live iPhone push delivery. After both deployments,
enable notifications on the installed iPhone PWA, background it, receive a real
message and call from another account, and verify that each phone alert opens the
correct destination. Also check an ended call, Focus settings, and turning alerts
off. No real message or call is sent by the test suite.

Platform reference: [WebKit Web Push for Home Screen web apps](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).
