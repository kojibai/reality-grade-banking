import type { ReceizArtifactVerificationResult } from '@receiz/sdk';
import { loadReceiz } from './client';
export interface ProofDepositInspection { status: ReceizArtifactVerificationResult['status']; filename: string; digest?: string; canCreditValue: false; canClaimOwnership: false; message: string; result: ReceizArtifactVerificationResult; }
export async function openProofDeposit(file: File): Promise<ProofDepositInspection> {
  const { verifyReceizArtifact } = await loadReceiz();
  const result = await verifyReceizArtifact(new Uint8Array(await file.arrayBuffer()));
  const message = result.status === 'verified-artifact' ? 'Original proof verified. Ownership and value admission are separate.' : result.status === 'unsupported' ? 'This file does not carry a supported Receiz proof.' : result.status === 'denied' ? 'This file exceeds the verifier’s supported capacity.' : 'The original proof could not be verified.';
  return { status: result.status, filename: file.name, digest: result.status === 'verified-artifact' ? result.artifactDigest.value : undefined, canCreditValue: false, canClaimOwnership: false, message, result };
}
