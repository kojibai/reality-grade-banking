# Isolated native qualification host fix

The user approved applying and testing this one-line Receiz host exception in an isolated branch and preparing its deployment for review. Production deployment is not approved. The full live bank remains unfinished.

## Change and boundary

Branch: `fix/native-qualification-head-order` in `/Users/bjklock/Kai-Turah/receiz/.worktrees/receiz-bank-qualification-fix`, based on `ad836e9c7f97057a1dd8bc72b2c9c6824fbe185c`.

Local commit: `2058014de55a7780f7c424065109c8ad5d20a2c5`. Published review commit: `36a6494f95847620cf6860414b223bf8f3e58581`, [draft PR #238](https://github.com/kojibai/receiz/pull/238). Both have exactly the same independently matched Git tree, `1e146a194f3ea1a7cc64418ec1b06f4718419dba`. They contain one production-line replacement and three regression checks in one new test file. The existing main Receiz checkout was not edited and the PR is unmerged.

In `app/lib/receiz/v124/runtimeDependencies.server.ts`, qualification now passes dependency heads through its existing `sortedHeads` helper instead of freezing their noncanonical insertion order. The existing consumer requires lexicographically ordered heads. The actual producer/consumer regression reproduced ready source-publication and verified-replay failures before the fix; the unavailable-storage control passed. All three checks passed after the fix. Digest values and unavailable-source behavior remain unchanged.

This changes host report preparation beneath proof authority. It does not change SDK/MCP/AI Skills 129.0.0, the canonical registry, root, proof validators, financial rules or the bank UI. No new package release was prepared.

## Review deployment

Current production is `dpl_JBxb4cxMxjrT3VYzYD8A3Z8vPTwj`, a Git deployment of `ad836e9c7f97057a1dd8bc72b2c9c6824fbe185c`. That is the isolated patch's exact parent. It was deployed separately before this review preview. No production alias was assigned by this fix.

Current review preview: `dpl_29TQCuJmoogC8ApTpuSkzp9G3Hsf`, [review URL](https://receiz-61v0ssp7q-kojibs-projects.vercel.app). Final provider inspection reports **READY**, target `null` (preview), source Git, exact review commit `36a6494f95847620cf6860414b223bf8f3e58581`. Its only assigned alias is the feature-branch preview alias. GitHub comparison independently reports precisely the expected one-line production change and one 59-line regression file, with zero commits behind current main.

The first preview, `dpl_HeeFbYbJqAXmpCpydfrDjEnbTbLo`, reached READY and had no aliases. Its provider-held manifest confirmed all 10,947 original files from older CLI snapshot `dpl_46Yx7H8LLY9cYcnW7JvNKAFB1GYP`, exactly one changed file and replacement SHA-256 `00da2442b8fbf50cda3379f47bc66e88392c3bf050c8a4cee9cba09717b7ea1b`. Its native source matched the inspected v129 file before the replacement. However, the final alias check found that production already used the newer Git snapshot above. This first preview is **superseded and must not be promoted**. Its candidate SHA-256 remains `593c9f8ba6e48072c8a3bf413220fd29097192b871b9b5449f0d57d0837cb953` for diagnostic provenance only.

The first request was rejected with HTTP 400 before creating a deployment: the Vercel API requires omission of `target` to select preview. After resolving that refusal, the corrected request omitted the field. It did not change production aliases. The replacement Git preview uses the exact current-production parent and was created by the existing non-production branch integration. No dirty checkout or older snapshot will be released.

## Checks and limits

- Focused Receiz native runtime/source/signing/routes suites: 86/86 passed with explicitly nonfunctional fixture configuration.
- Targeted lint, native production contract and v129 package release-lock checks passed.
- Current bank checks: 192/192 tests across 55 files and TypeScript/production build passed.
- The full Receiz release-freeze did **not** pass. It reported an unavailable isolated profile database, existing module/fixture setup failures and insufficient disk space; execution was stopped. No test or lock was relaxed. Removing only the new ignored build output and excluding duplicate public assets from the new sparse worktree recovered space; original checkout assets and tracked vendor files were preserved.
- The draft PR's independent [CI run](https://github.com/kojibai/receiz/actions/runs/38509351055) is in progress. Checkout, dependency installation and the advisor guard passed; the full release-freeze step remains running. This is not a passing gate result.
- The sparse checkout is not the deployment source; the preview uses the original provider-held manifest.
- No positive live native qualification, custody issuance, ownership transfer, funded sale, currency issuance or redemption has been observed from this host fix yet. Browser control reported no available browsers, so the open bank ID's protected grant could not be reused for the authenticated preview check. Passing focused tests or a READY build would not establish those capabilities.
- Temporary local family diagnostics are disabled; the normal bank preview is running on port 4173 and its home request returns HTTP 200. Its financial actions remain governed by actual source/runtime readiness.

Production promotion/release and the final whole-bank review remain pending. See [native-bank-domain-verification.md](native-bank-domain-verification.md) for the remaining source, custodian and atomic bank-domain requirements.
