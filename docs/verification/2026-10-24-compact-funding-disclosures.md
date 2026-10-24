# Compact funding disclosures

The receipt and Ledger keep the complete already-carried source data while
presenting two independent, initially closed disclosures: **Funding source**
and **Full funding history** (or the existing source-specific history label).
Opening one does not open the other. Source rows, proof cohorts and full-history
steps render only when their disclosure opens. Existing pagination, exact
references, amounts, source boundaries and evidence remain available.

This change is presentation only. It does not fetch, verify, publish or mutate
any source. It does not change receipt encoding or shorten a URL by dropping
history. Short, hosted receipt links are a separate requested change.

Verification, 2026-10-24:

- The new independent-disclosure regression failed before implementation, then
  passed with both disclosures closed initially and independent when opened.
- Existing source, exact Note digest, cohort-coordinate, named proof, mixed-rail
  and standalone receipt cases pass after explicitly opening the source section.
- Focused funding/receipt tests: 21/21; Bank TypeScript: no diagnostics.
- Full current working-tree suite: 465 files, 2,892 tests passed; zero skipped.
- Actual ReceiptView in Chrome at 390 and 1280 pixels: initially compact; each
  section opens independently, zero external requests, zero browser errors.
  The retained public Note fixture carries 166 moments. No payment was submitted.
