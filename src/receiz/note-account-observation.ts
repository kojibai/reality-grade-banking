import type { ReceizKeyFile } from '@receiz/sdk';
import type { WalletObservation } from './wallet-observation';
import { loadReceiz } from './client';
import { parseSharedWallet } from './shared-wallet';

/** Display-only handoff from a completed native issuance. This does not admit
 * funding, update login custody, or turn a signed account snapshot into money. */
export async function readNoteAccountObservation(proof: ReceizKeyFile, identity: ReceizKeyFile, accountUid: string): Promise<WalletObservation> {
  const invalid = () => { throw Error('BANK_NOTE_ACCOUNT_SUCCESSOR_INVALID'); };
  if (!proof || !accountUid || proof.keyId !== identity.keyId || proof.alg !== identity.alg || proof.owner?.uid !== identity.owner.uid || proof.crypto?.publicKeyRawB64u !== identity.crypto.publicKeyRawB64u) invalid();
  const sdk = await loadReceiz();
  const projection = await sdk.projectReceizIdentityAccount(proof);
  if (!projection.portableStateVerified || projection.authority !== 'verified-identity-portable-state') invalid();
  // v129's verifiedState comes from signed segmented bytes. snapshot is an
  // inspection alias and is deliberately not read here.
  const state = projection.verifiedState as { account?: { userId?: string }; wallet?: { routeSummary?: unknown } } | null;
  const observedAt = proof.portableState?.exportedAt;
  if (state?.account?.userId !== accountUid || !state.wallet?.routeSummary || typeof observedAt !== 'string' || !Number.isFinite(Date.parse(observedAt))) invalid();
  try { return { wallet: parseSharedWallet({ ok: true, wallet: state!.wallet!.routeSummary }, accountUid), observedAt: observedAt! }; }
  catch { return invalid(); }
}
