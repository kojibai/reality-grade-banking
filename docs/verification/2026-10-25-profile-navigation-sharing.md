# Profile document and shared navigation

## Confirmed overhead

A read-only cold request to `/bjklock/?igsh=bankeiz-load-diagnostic`, with
Instagram browser headers, returned HTTP 200 without a redirect. The document
was 9,531,175 bytes. Its carried public navigation contained 119 destinations
and repeated large, identical inline styles. This was confirmed transport,
parsing and memory overhead; the request did not establish a physical iPhone
rendering defect or an Instagram-only cause.

The build now carries identical style blocks once and references them from each
page head. The public navigator expands only a visited head and retains its exact
string afterward. Legacy saved documents with ordinary string heads continue to
work. All page content, metadata, aliases, first-paint markup, account retention
and existing navigation behavior remain available without another request.

The scoped public stylesheet also passes through the already installed esbuild
CSS minifier, targeting Safari 16 and Chrome 100. No source stylesheet, selector
or layout was edited. Gzip CSS fell from 9,704 to 9,501 bytes; the shared CSS and
JavaScript total is 14,927 bytes, beneath the unchanged 15,000-byte budget.

## Before and after

Using the same captured 119-destination public document:

| Carried navigation | Before | After |
| --- | ---: | ---: |
| UTF-8 bytes | 7,634,704 | 4,804,434 |
| Gzip bytes | 1,405,619 | 736,630 |

All 119 original page heads round-tripped exactly. No destination or disclosure
was removed to achieve the reduction.

An isolated browser comparison replayed the recorded server-rendered profile and
its actual public navigator, alternating three fresh runs of each version. Chrome
used a 390-by-844 mobile viewport, Instagram user-agent headers, four-times CPU
throttling and 10 Mbps throughput with 40 ms latency. Remote requests were blocked;
the private account runtime, React, remote images and upstream discovery were
excluded equally from both versions. This measures the already-available document
and navigator, not an entire live sign-in or physical Instagram browser.

| Median | Before | After |
| --- | ---: | ---: |
| Document ready | 1,695.3 ms | 1,105.5 ms |
| Document load | 1,703.9 ms | 1,112.8 ms |
| First contentful paint | 312 ms | 308 ms |

Document completion improved by about 590 ms (35%). The first paint was largely
unchanged. Both versions painted the same 24 initial cards and profile name;
the checked computed dimensions, colors, fonts, display and gaps matched.
The temporary browser and local server closed after the comparison.

## Verification

- Sharing tests exercised the actual public navigator: missing styles failed
  before the reader change; the fixed route preserves styling, the account DOM,
  and its input without a network read.
- The combined profile, navigation and Message selection passed 113 tests;
  the navigation/motion selection passed 8 tests.
- Type checking and the complete production build passed, including the unchanged
  presentation size budget, exact source archive, offline cache, canonical page,
  retained navigation and dedicated checkout checks.
- Independent review approved the sharing reader, format and CSS minification.
- Final complete working-tree suite: 3,151 passed, zero skipped. Four cases in
  the other developer's new, untracked `tests/docs-manual.test.ts` failed while
  that separate operating-manual work was in progress: substantive sourced
  references; static steps/tables/code/lifecycle; deep article search; and
  financial/custody/disclosure boundaries. Those files and assertions were left
  untouched. This is not a claim that the entire shared working tree was green.

This change adds no financial path, pricing rule, source lookup or periodic work.
Physical Instagram loading should be rechecked after the user pushes the commit;
the measurements above must not be presented as a physical-device guarantee.
