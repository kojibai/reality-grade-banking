# Vault public copy — qualified publication source

The implemented copy lives in `scripts/vault-page.mjs` and builds `/learn/vaults/`. This supersedes the earlier mandatory-passkey draft: the user explicitly chose a private bearer original by default and optional passkey protection.

## Message

**Yours to hold.**

Your money. Your originals. The plans behind them. Give them a place of their own.

- Keep the real thing: supported originals and investments move in kind, with their proof.
- Add a passkey: extra protection where the owner chooses it.
- Prove it. Keep it: selected public evidence without giving access.

The private original and shared proof must remain clearly different. The private original grants Vault access; the public proof grants none. Without optional protection, anyone with the private original can use its Vault authority. With protection, the original passkey is also required.

## Claim-to-evidence boundary

| Claim | Required evidence and scope |
| --- | --- |
| File alone cannot open a protected Vault | Authenticated encryption and fresh verified WebAuthn PRF assertion; applies only when protection was selected. |
| Shared proof grants no access | Closed public projection, admitted native public witnesses, no private keys or spendable bearer tokens. |
| Value stays connected to its proof | Complete admitted source closure, exact operation journal, no substitution of summaries for originals. |
| Moving an investment does not sell it | In-kind ownership certificate and conserved quantity/cost basis; no trade repricing. |
| Retrying does not execute twice | Native once-only contracts and replay of the same retained request, including lost responses. |
| Open saved contents offline | Local artifact and source admission; protected files require their original passkey locally. Financial mutations still use connected contracts in this release. |
| Recovery on another device | Complete saved private original plus the same PRF-compatible credential when protected. Provider support varies; no universal recovery claim. |
| Public evidence verifies independently | Self-contained browser/CLI reader, pinned verification material, source hashes and complete included sources; no network, login or custody action. |

Do not claim universal fraud prevention, current unspentness from historical evidence, real-device qualification from a virtual authenticator, or fully offline financial execution from offline inspection.

See `docs/vaults.md` for the exact integration and inspection contract.
