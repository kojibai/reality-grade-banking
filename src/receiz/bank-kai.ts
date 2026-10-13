import type { ReceizKksV1ProofCoordinate } from '@receiz/sdk';
import type { ReceizOfflineKaiProofFactory } from '@receiz/sdk/offline/kai';
import { loadReceiz } from './client';
// The supplied factory is a producer, never a verifier. Every returned full
// coordinate is independently admitted by the SDK's unchanged pinned circuit.
export async function nextBankKaiCoordinate(factory: ReceizOfflineKaiProofFactory, previous?: ReceizKksV1ProofCoordinate): Promise<ReceizKksV1ProofCoordinate> {
  const sdk = await loadReceiz();
  const prior = previous ? await sdk.admitReceizKksV1ProofCoordinate(previous) : null;
  const coordinate = await factory({ previousKaiSigilProofHead: prior?.kaiSigil.proofHead ?? null });
  return sdk.admitReceizKksV1ProofCoordinate(coordinate, { expectedPreviousKaiSigilProofHead: prior?.kaiSigil.proofHead ?? null, ...(prior ? { minimumExclusiveKaiUpulse: prior.kaiUpulse } : {}) });
}
let browserFactory: Promise<ReceizOfflineKaiProofFactory> | null = null;
export function browserBankKaiFactory(): Promise<ReceizOfflineKaiProofFactory> {
  if (!browserFactory) browserFactory = (async () => {
    const { createReceizOfflineKaiProofFactory } = await import('@receiz/sdk/offline/kai');
    const [wasm, zkey] = await Promise.all(['/zk/kai-sigil.wasm', '/zk/kai-sigil.zkey'].map(async path => {
      const response = await fetch(path, { credentials: 'omit', signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error('The bank’s native Kai proof resources are unavailable.');
      return new Uint8Array(await response.arrayBuffer());
    }));
    // The SDK checks the exact packaged resource digests before proving.
    return createReceizOfflineKaiProofFactory({ wasm, zkey });
  })().catch(error => { browserFactory = null; throw error; });
  return browserFactory;
}
