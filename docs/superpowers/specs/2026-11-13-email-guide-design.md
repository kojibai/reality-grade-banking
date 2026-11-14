# Email and connected booking guide

Build the three coordinated concepts supplied by the parent in default build mode. The user has requested implementation; this document records the concrete design rather than introducing another approval flow.

## Visual contract

1. Split hero: “Your username. Your email.”, explanatory copy and actions on the left, actual Messages example on the right, followed by the large `maya@receiz.com` address rail.
2. “Email outside. Connected inside.” with three horizontal steps: they email the address, it arrives in Messages, the reply reaches their inbox. A local walkthrough makes that sequence explorable.
3. “One address. More of your day.” with actual code-email and appointment presentation; below it, booking continuation and compact FAQs, followed by the existing footer.

Use the existing brand header/footer. The concept’s macOS traffic lights, skeleton inbox rows and invented mail chrome are intentionally replaced by real Messages leaves. All UI is HTML, SVG icons and source-rendered React; no concept PNG is shipped.

## Tokens and layout

- Paper `#fbfcfe`; ink `#14283f`; cobalt `#244cdb`; muted `#60738d`; border `#d4dce8`.
- Existing Inter/system font stack; headline 76–82 px desktop, 42–54 px mobile; body 18–21 px; product controls 13–15 px.
- Editorial width 1280 px, 64 px desktop gutters, 22 px mobile; open whitespace and thin rules rather than card stacks.
- Product frame 22–26 px radius with a restrained shadow. Narrow strokes use the existing Lucide icons.
- Motion changes the visible example, never delays first paint. Autoplay pauses for manual input, focus, reduced motion, offscreen content, hidden documents and page removal.

## Product and delivery boundaries

Static first paint contains the complete guide, immediate example and inline page/preview CSS. The browser script switches only held example HTML and never opens an identity, Source, provider, email, payment or booking service. Reuse EmailMessage, MessageNavigation, ProfileAvatar, ReplyIdentity, MessageComposer and MeetingInvitation/PaymentMessage display components. The actual Messages controller is not mounted.

Default addresses use the full18-character receiving name without `receiz_`. Retained names remain bound to their actual account; unretained legacy history is not reconstructed. Developer copy is limited to the audited link until the parent supplies exact claims.

The `/email` guide needs explicit static rewrites before the public-profile catchall and a reserved bare route; `/u/email/` remains the explicit profile route. The held catalog was checked for the `email` username before reserving it. `/book/:username`, booking runtime, account entry and generated JSON are outside scope. `/book` receives a presentation refinement and reciprocal link only.

## Fidelity ledger

| Comparison | Required implementation | Intentional difference |
| --- | --- | --- |
| Hero copy/layout | Exact headline, split editorial/product view and large address rail | Shared brand header replaces concept navigation |
| Color/type | Paper, navy, cobalt, large closely tracked headlines | Existing product typography remains authoritative inside previews |
| Product frame | Real Messages chrome and conversation bubbles | No macOS chrome or skeleton rows |
| Flow | Three numbered horizontal steps with connecting line | Real app message rendering replaces invented third-party mail UI |
| Everyday | Codes and appointment examples, then booking/FAQs | Fictional fixture data, clearly labeled |
| Mobile/motion | Stacked readable layout, local controls, reduced motion | No animation-gated content |

Browser screenshots and measured deviations will be recorded after implementation.

## Verified fidelity and interaction record

Browser/IAB was attempted first and returned “Browser is not available: iab”. Verification used the installed Playwright CLI and the repository’s Playwright browser-check pattern. Native concept viewport1488×1058 was checked, plus768,390 and320 px layouts. Screenshots live outside the repository under `/private/tmp/bankeiz-email-guide-evidence/`; hero/detail captures are `/private/tmp/bankeiz-email-hero-desktop.png`, `/private/tmp/bankeiz-email-flow-desktop.png`, `/private/tmp/bankeiz-email-everyday-desktop.png`, `/private/tmp/bankeiz-email-mobile.png`, `/private/tmp/bankeiz-book-desktop.png` and `/private/tmp/bankeiz-book-mobile.png`.

- Hero headline, supporting copy, CTA order and large address rail match the accepted structure; the address is explicitly navy, correcting an inherited muted paragraph color.
- Split layout, closely tracked headline scale, paper/cobalt/navy palette, thin rules and restrained product frame were compared against the concept.
- Actual source message wrappers and avatar CSS replace the concept’s invented chrome. Nested inherited message padding was removed after the first browser capture clipped the reply; both actual message bodies remain present.
- Three horizontal flow steps and everyday code/appointment examples preserve section order and the concept’s open layout. Actual Messages and appointment leaves replace a simulated third-party mail client.
- Shared brand header/footer, local pause/step controls, fictional-example caption and the requested account-linking band are intentional deviations authorized by the implementation brief. The developer link uses the parent-audited public existing-accounts explanation.
- On narrow screens the layout stacks without horizontal overflow. Local Original, incoming and reply controls work; manual selection pauses playback. Reduced motion begins paused.
- Above-fold copy comparison: headline and explanatory lines are preserved; “Open Messages” uses the real `/#account/messages` route. Existing shared navigation replaces the concept’s new nav, and quiet example/playback labels are added for the requested inert demonstration.
- The complete guide and actual incoming email render with JavaScript disabled and APIs blocked. Browser checks record zero API calls and no page errors; no identity or provider is opened.

A final fresh-render browser pass and focused guide tests qualify these authored files. Integrated build, release/CI and deployment remain the parent’s separate evidence.
