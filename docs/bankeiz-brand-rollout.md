# Bankeiz branding and domain rollout

The owner selected **Bankeiz** in place of the former Receiz Bank product name. Reality-Grade Banking remains the reference project and subtle positioning line. Receiz remains the identity, SDK, MCP, AI Skills and proof infrastructure. This change preserves the existing palette, typography, app layout, flows and note artwork.

Implemented presentation changes: wordmark, app name, public metadata, installed-app manifest, product labels and consent wording, share images and matching lowercase-b icon. The optional wordmark descriptor is empty. Existing social-image filenames remain stable; their content now says Bankeiz. Historical verification records, proof schemas, storage namespaces and native artifact names remain intact.

The two sharing images were edited with ImageGen from the exact prior assets, preserving their composition and copy. Generated originals: `exec-d992666a-e736-4332-aa91-96a663688f2b.png` and `exec-a689b72b-c766-4dae-8f43-34063a65c79c.png`. Both remain 1730 × 909 in the application. The second is encoded as JPEG for the existing size budget. The app icon extends the existing native SVG system with a b monogram and unchanged colors.

## Bankeiz.com activation

The desired new public origin is `https://bankeiz.com`. This commit changes branding, not the existing application permission boundary. The currently registered `https://bank.receiz.com` origin, callbacks, public client IDs, checkout framing rules and native host allowlists remain unchanged. Canonical URLs continue to identify the current registered deployment until the domain migration is executed.

Before serving financial flows from Bankeiz.com:

1. Attach the owned domain to the deployment and verify HTTPS, including the desired www redirect.
2. Register or update the Receiz application's exact Bankeiz.com callbacks and permitted origin, keeping each person's scoped consent distinct from app registration.
3. Add the exact origin/client tuple to the protected native Bank host and scoped embedded-checkout framing policy. Preserve all other checks; do not turn them into wildcard permissions.
4. Switch the public origin in `src/receiz/config.ts`, canonical/structured/social metadata in both HTML entries and the public-page builder, and robots/sitemap references. Update origin-bound expectations and exercise the resulting QR/NFC links.
5. Verify enrollment/import, protected reads, checkout rendering and customer-operated credit confirmation on the new origin. Origin-local browser custody does not silently migrate: use the original Identity Seal when opening the account at the new domain.

No new environment secret or package version is required for the display-name change. The existing production note qualification and unfinished financial adapter gates remain separately documented.
