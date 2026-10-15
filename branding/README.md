# Branding boundary

The application brand is Bankeiz; its Receiz identity and protocol integration remain unchanged. `identity.json` supplies the visible wordmark and application name for the console and entrance. It contains display strings only; it does not change identity custody, app registration, scopes, routing, rails, proof titles, verification or conformance.

The [GPL-3.0-only license](../LICENSE) permits modifications, rebranding and independent deployment. This display profile is a convenience, not a restriction on code changes. Use your own identity for an independent service or modified product, preserve legal notices and follow the separate [trademark policy](../TRADEMARKS.md). Code changes do not automatically demonstrate [conformance](../CONFORMANCE.md).

The build validates a small fixed shape of bounded plain-text strings (the optional descriptor may be empty). Brands render as escaped text, not markup. The existing CSS continues to control typography and layout. The application name and wordmark are required.

Public page titles, the web manifest, icons and sharing artwork also identify the app. A coherent rebrand should update those presentation assets consistently and retain necessary technical attribution; it must not rewrite proof schemas or suppress material status. The profile remains display-only; implement and review any functional changes explicitly.
