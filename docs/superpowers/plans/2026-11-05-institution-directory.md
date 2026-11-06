# Reality-Grade Banking Registry

**Goal:** An institutional lookup at `/registry/` showing whether published evidence establishes the applicable Reality-Grade Banking conformance scope.

**Final user direction:** Say money. Ask whether the institution can receive money and preserve its original proof, provenance, ownership and complete history through the next transfer. Bankeiz is one conforming implementation of Reality-Grade Banking. Keep its existing verified PASS in the same directory as everyone else, without an extra featured panel. Keep the original public navigation; discovery includes a direct Conformance → View the register link, the shared footer, the guide directory and the institution guide.

**Architecture:** All 60 records, logos, evidence explanations and requirement links render in static HTML. A page-selected module searches and filters the held DOM by institution name/alias, region, country and conformance result; sorting, reset and empty states require no account or record fetch. The existing carried navigation and offline shell retain the page, module and logo assets. The former `/institutions/scorecard/` route remains an alias.

## Completed work

- [x] Identify 59 external institutions using official organization links, useful aliases, countries and regions. Record authentic logo provenance and retain local static assets.
- [x] Include Bankeiz once with its verified Original, 33 passing contract cases, holder, build/artifact/evidence identities and separately scoped 12 reference results.
- [x] Preserve FAIL-until-qualified policy while distinguishing missing assessment evidence from documented bank-specific test failures. Never invent tests, applications, affiliation, regulatory authority or human-rights findings.
- [x] Implement searchable rows, region/country/result filters, sorting, accessible result announcements, reset, no-match state and expandable evidence. Retain nodes and open evidence during filtering.
- [x] Preserve one-line FAIL, requirement numbers and the word Conformance; align count values and labels. Inspect responsive layouts down to 280 CSS pixels.
- [x] Register canonical metadata, social art, alias, static build, public-name reservation, guide/footer discovery and offline dependencies.
- [x] Keep the original menu unchanged and link directly from Conformance to Registry. Verify the link stays on one line at 280–1280 CSS pixels.
- [x] Run focused tests, types, certificate verification, compiled public-page generation and independent reviews. Preserve frozen entry, source authority and unrelated work.

## Release verification

Focused Registry/public-navigation tests and typecheck pass. The canonical Bankeiz Original verifies independently. Direct Vite compilation and public-page generation pass. Browser checks exercise search, combined filters, sorting, reset, empty state and Conformance → Registry navigation without console warnings/errors.

The shared checkout's full production build stops at the existing `PRODUCT_UI_PREVIEW_OUT_OF_DATE` prerequisite. Final commit verification uses an isolated snapshot containing only the staged Registry change; record that result before calling the commit production-ready. No push or deployment is authorized by the commit request.

## Central-bank expansion

Added the Federal Reserve System, European Central Bank, Bank of England, Bank of Japan, Swiss National Bank, People’s Bank of China, Bank of Canada, Reserve Bank of India and Bank for International Settlements. Eight entries use Central bank; the BIS uses International financial institution. All have official local logo assets with source provenance, country/jurisdiction, region and searchable aliases. All use the existing receiving controls and FAIL-until-qualified policy. No category exemption or alternate qualification gate was added.

Expansion verification: 37 tests in six relevant files passed; TypeScript and the canonical Bankeiz Original check passed. Browser checks confirmed 60 entries, category and alias searches, the Federal Reserve’s official logo and unchanged qualification wording, with no console warnings/errors.
