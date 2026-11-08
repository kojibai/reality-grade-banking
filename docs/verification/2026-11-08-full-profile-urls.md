# Complete default-account profile URLs — 8 November 2026

Both the full 25-character generated name (`receiz_` plus all 18 characters) and the full unprefixed name open the same existing canonical profile as the older 24-character locator. The final character is validated through the existing owner-bound identity data rather than guessed. The existing locator remains compatible. An exact custom profile retains its route; private, revoked, missing or wrong-final-character aliases cannot select another profile.

Receiz's existing public page and profile API resolve these input forms beneath current Account/identity bindings and redirect to the canonical profile. Bankeiz accepts the full-name route and consumes that exact canonical redirect from the existing public HEAD reader. Already compiled canonical profile entry opens its current HTML without entering alias lookup, Source discovery or rendering. No identity is renamed, resealed or recreated; no payment or historical proof changes.

Qualification on isolated inputs:

- Receiz: 114 focused tests passed, including actual page and GET/HEAD handlers, real native Source binding, wrong-final-character/private/revoked refusals and existing held-profile/continuity regressions.
- Bankeiz: 39 focused tests passed, including both route forms and a compiled canonical profile opening while Source and alias readers are stalled.
- Scoped Receiz ESLint passed.
- Both complete production builds passed, including production TypeScript and compiled server entry checks. Receiz generated all 338 static pages; Bankeiz passed native inventory, source archive, offline shell and public delivery checks.
- A separate ad hoc Receiz `tsc` process hit its default 4 GiB heap limit; the configured production build's TypeScript stage passed with its existing memory settings. No application memory setting was changed.

No live deployment, GitHub CI, actual payment, production mutation or browser alias navigation is claimed. Local handler tests supply DOM/route evidence; no screenshot overrides these checks. The preexisting Cadence catalog mismatch and new-profile three-stage entrance remain separate work. No stronger identity or proof truth was replaced by a public name representation.
