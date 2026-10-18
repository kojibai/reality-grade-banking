import { verifyAccountProof, isVerifiedAccountProof, type VerifiedAccountProof } from './account-proof';
import { ACCOUNT_PROOF_MAX_BYTES } from './account-proof-policy';
import { accountProofUrl } from './account-proof-links';
const published = new WeakSet<VerifiedAccountProof>();
export const hasPublicAccountProofLink = (proof: VerifiedAccountProof) => published.has(proof);
export async function readPublicAccountProof(digest: string, latest = false, signal?: AbortSignal): Promise<VerifiedAccountProof> {
  accountProofUrl(digest);
  const response = await fetch(`/api/bank/account-proof?proof=${digest}${latest ? '&view=latest' : ''}`, { credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer', cache: 'no-store', signal: signal ?? AbortSignal.timeout(30_000) });
  if (!response.ok || !response.body) throw Error('ACCOUNT_PROOF_PUBLIC_SOURCE_UNAVAILABLE');
  const reader = response.body.getReader(), parts: Uint8Array[] = []; let length = 0;
  try {
    for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > ACCOUNT_PROOF_MAX_BYTES) throw Error('ACCOUNT_PROOF_CAPACITY'); parts.push(value); }
  } finally { await reader.cancel().catch(() => {}); }
  const bytes = new Uint8Array(length); let offset = 0; for (const part of parts) { bytes.set(part, offset); offset += part.length; }
  const proof = await verifyAccountProof(new File([bytes], 'public-account-proof.json'));
  if (!latest && proof.sourceDigest !== digest) throw Error('ACCOUNT_PROOF_SOURCE_MISMATCH');
  return proof;
}
/** Publication is confirmed by independently reopening the anonymous public
 * bytes, not by a success field in the authenticated publishing response. */
export async function confirmPublicAccountProof(proof: VerifiedAccountProof): Promise<string> {
  if (!isVerifiedAccountProof(proof)) throw Error('ACCOUNT_PROOF_VERIFIED_SOURCE_REQUIRED');
  const publicProof = await readPublicAccountProof(proof.sourceDigest);
  if (publicProof.statement.account.keyId !== proof.statement.account.keyId || publicProof.sourceDigest !== proof.sourceDigest) throw Error('ACCOUNT_PROOF_SOURCE_MISMATCH');
  published.add(proof); return accountProofUrl(proof.sourceDigest);
}
export function verifyAccountProofContinuation(prior: VerifiedAccountProof, next: VerifiedAccountProof): void {
  if (!isVerifiedAccountProof(prior) || !isVerifiedAccountProof(next)) throw Error('ACCOUNT_PROOF_VERIFIED_SOURCE_REQUIRED');
  const a = prior.statement, b = next.statement;
  if (a.applicationId !== b.applicationId || prior.writer !== next.writer || Object.entries(a.account).some(([key, value]) => value !== b.account[key as keyof typeof b.account]) || a.checkpoint.genesisHead !== b.checkpoint.genesisHead || BigInt(b.checkpoint.kaiUPulse) < BigInt(a.checkpoint.kaiUPulse) || b.transactions.length < a.transactions.length || a.transactions.some((t, i) => Object.entries(t).some(([key, value]) => value !== b.transactions[i][key as keyof typeof t]))) throw Error('ACCOUNT_PROOF_CONTINUITY_MISMATCH');
}
