# Production Note schema installation

User authorization: apply the reviewed Note migrations, check whether another developer already installed them, and inspect the remaining Supabase migrations for genuine missing changes.

Target: Receiz production Supabase project `yggkbnvikufnncormsrm`. No Receiz working-tree files or other developer changes were edited. The Bankeiz implementation remains commit `27ced42`.

## Installed

| Repository migration | Recorded production version | Source SHA-256 |
| --- | --- | --- |
| `20261015012532_bank_offline_notes_native.sql` | `20261020231147` / `bank_offline_notes_native` | `efa7c769efcf4a9e1fd096fcfe8b4b82e36dd28e7924ffb9cc20383f4f5a7fc0` |
| `20261020204430_bank_connected_note_compatibility_wallet.sql` | `20261020231159` / `bank_connected_note_compatibility_wallet` | `edacdcc83caf6f01b6b5027f1a113e53992901af0238076962a8b6d813ae4e8e` |

Both were absent from live migration history and live schema immediately before installation. Existing Wallet, identity tables and required procedures were present. The exact repository SQL was installed in dependency order through the Supabase migration API. Supabase assigned installation-time versions; the table above preserves the original source-to-history mapping.

The broader audit also found the existing `creator_os_run_wallet_charge` migration's function absent despite a current server callsite. Its exact repository migration was installed as production version `20261020231754`. The remaining `idx_signal_run_vault_cards_owner_kind_updated_id_v1` index from the million-card storage migration was absent; its exact `CREATE INDEX CONCURRENTLY IF NOT EXISTS` statement was executed independently, as the source migration requires. The final index is ready and valid. Already-present portions of that storage migration were not replayed, and its original whole-file migration history was not fabricated.

## Live verification

- All three Note custody tables exist with row-level security enabled.
- Public, anonymous and authenticated callers have no Note table access or Note function execution. Service-role table and function permissions are present.
- All eight Note functions are `SECURITY INVOKER` with the fixed `pg_catalog, public` search path.
- The five connected Note uniqueness indexes are unique and valid: allocation Note/nonce, cancellation Note/nonce, and once-only redemption by allocation.
- Connected funding profile, rail, split, Note ID, nonce and status columns exist.
- Invalid quote/allocation inputs and an invalid Creator user reject with their expected guards before any accounting write.
- The PostgREST schema reload notification was sent.
- Allocation, redemption and cancellation counts were all zero immediately after installation and verification. No Note or money-moving action was executed by this work.
- Security advisors report the intentional service-only tables as informational `rls_enabled_no_policy`. No client policy was added to grant access. Reference: [Supabase RLS-without-policy advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Wider migration-history audit

The repository contains 316 migration files. After excluding recorded migration names and the newly installed Note migrations, 215 older names did not match the production history. Name absence was not treated as proof of missing schema.

The audit checked 984 referenced table/function/index names and 167 added-column/view/type references against production metadata. Most were already installed. PostgreSQL's 63-byte identifier truncation accounted for the apparent missing long index names. Other absent objects were deliberately removed by later migrations, including the Stripe index successor, the Kai table-global uniqueness revert and the recorded pre-merge eight-migration behavior restoration. These later behaviors were preserved.

This is a schema-presence and targeted installation audit, not a claim that every historical function body, data backfill or migration-history row was reconstructed. Historical migrations were not blindly replayed; doing so could overwrite later procedures, repeat old backfills or reactivate superseded execution rules. Existing history was not rewritten to claim those scripts were newly run.

## Qualification boundary

The connected Note schema blocker is removed. An authenticated browser quote and the approved issue/receive/deposit path still require live qualification. The production migration check is not evidence of physical-device offline custody conformance, successful money movement or a v1.0.0 release. Existing SDK proof verification and device antirollback requirements remain unchanged. SQL remains subordinate accounting and exact-byte custody; it does not replace the sealed Note proof.
