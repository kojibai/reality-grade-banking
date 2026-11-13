# Links into installed Bankeiz

Bankeiz shares ordinary `https://bankeiz.com/...` destinations. The root manifest
keeps its existing `id`, `start_url` and `scope` at `/`. When a browser captures a
link for the installed app, `launch_handler.client_mode: navigate-new` requests a
new app browsing context at that exact destination. It avoids replacing an
already-open app's unsent draft, active call or pending transaction. This is a
launch preference for supporting browsers, not a command to external apps or the
operating system.

Chrome 139 introduced default capture of eligible in-scope links on Windows,
macOS and Linux. The user can opt out; without an installed controlling PWA, the
link opens in the browser. The browser determines eligibility and capture before
the manifest launch handler applies. `navigate-new` requests a new app context;
`navigate-existing` would navigate the most recently used app context, and
`focus-existing` would require a launch consumer to route the new destination.
Bankeiz deliberately keeps the exact server entrance for all routes. See
[Chrome navigation management](https://developer.chrome.com/docs/capabilities/pwa-navigation-management)
and the [Launch Handler API](https://developer.chrome.com/docs/web-platform/launch-handler/).

Apple's standalone manifest mode makes a Home Screen launch open the web app,
and its scope controls links clicked **inside** that app. The WWDC23 statement
that a site opens in a Home Screen web app is in that context; it does not promise
that arbitrary email, Gmail, social-app or embedded-browser links launch an
installed iPhone PWA. Apple documents universal-link handling through a native
app's associated domains and app/scene delegate. Bankeiz is a web app and does not
gain that native registration by adding a manifest property. General external
iOS capture is therefore not a Bankeiz guarantee. See
[Apple's web-app behavior](https://developer.apple.com/videos/play/wwdc2023/10120/)
and [Apple universal links](https://developer.apple.com/documentation/xcode/supporting-universal-links-in-your-app).

The destination's path, query and fragment stay intact. Secure email entrances
continue through their existing one-click server route and HttpOnly handoff;
launch configuration adds no client token processing, storage, service-worker
cache, API request, readiness check or intermediate screen. Native Receiz URLs
stay on their original origin and rails. There are no custom schemes, scope
extensions or browser-to-app redirect loops. Without capture or installation,
the same URL continues to use its existing browser route.

Local manifest and worker regressions qualify this configuration and the existing
entry/cache boundaries. They do not establish OS-level capture from a real mail
or social app, nor do they establish a committed build, CI result or live release.
Device qualification must cover installed and uninstalled entry, user capture
preferences, exact destination, and an app already holding unsent work.
