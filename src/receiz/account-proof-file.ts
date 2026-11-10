import { heldAccountProofOriginal, type VerifiedAccountProof } from './account-proof';

/** Name the download without changing the already verified Original. */
export function accountStatementFile(proof: VerifiedAccountProof) {
  const original = heldAccountProofOriginal(proof);
  const owner = proof.statement.account.receizId.replace(/\.receiz\.id$/, '');
  const extension = /\.[a-z0-9]{1,24}$/i.exec(original.filename)?.[0] ?? '.receiz';
  const pulse = proof.statement.checkpoint.kaiUPulse;
  return { ...original, filename: `Account-Statement-${owner}-Kai-${pulse}-${proof.sourceDigest.slice(0, 12)}${extension}` };
}
