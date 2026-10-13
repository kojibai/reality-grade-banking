import type { ReceizAttestationAuthorityV125, ReceizVerifiedIdentityArtifactAdmission, ReceizKksV1ProofCoordinate, ReceizClient, ReceizPortableSealedArtifactV124 } from '@receiz/sdk';
import { loadReceiz } from './client';
export interface BankCustodyInput { receipt: File; intake: File; holderIdentityAdmission: ReceizVerifiedIdentityArtifactAdmission; operatorAuthority: ReceizAttestationAuthorityV125; operatorPolicyDigest: string; kaiCoordinate: ReceizKksV1ProofCoordinate; }
export const BANK_CUSTODY_DOMAIN = 'bank.receiz.com.custody';
export const BANK_CUSTODY_CREDENTIAL_TYPE = 'bank.custody-receipt';
export interface BankCustodyReceipt {
  credentialId: string; proofObjectId: string; receiptArtifactDigest: string;
  intakeArtifactDigest: string; acceptedHead: string; holderReceizId: string;
  title: string; quantity: string; redemptionTermsDigest: string;
  currentness: 'current'; kaiPulse: string;
  createsCash: false; ownershipExecutionCompleted: false;
}
const heldReceipts = new WeakMap<BankCustodyReceipt, ReceizPortableSealedArtifactV124>();
// The policy digest must come from the operator's admitted bank policy source
// in trusted host configuration, never a customer-supplied HTTP field.
export async function openBankCustodyReceipt(input: BankCustodyInput): Promise<BankCustodyReceipt> {
  if (!/^[a-f0-9]{64}$/.test(input.operatorPolicyDigest) || input.operatorAuthority?.domainAuthorityArtifactSha256 !== input.operatorPolicyDigest || input.operatorAuthority.domainId !== BANK_CUSTODY_DOMAIN) throw new Error('CUSTODY_OPERATOR_SOURCE_REQUIRED');
  const sdk = await loadReceiz(), client = sdk.createReceizClient();
  let opened: Awaited<ReturnType<typeof sdk.verifyAndOpenReceizCredentialArtifactV125>>, source: ReceizPortableSealedArtifactV124;
  try {
    const artifact = await client.artifacts.verifyAndOpen(input.receipt);
    if (artifact.sealedArtifact.kind !== 'receiz.native-record-seal') throw new Error('CURRENT_CUSTODY_SOURCE_REQUIRED');
    source = await sdk.transportReceizSealedArtifactV124(artifact.sealedArtifact);
    opened = await sdk.verifyAndOpenReceizCredentialArtifactV125({ artifact: source, verifier: {} }, input.operatorAuthority);
  } catch { throw new Error('CUSTODY_SOURCE_NOT_ADMITTED'); }
  const identity = await sdk.verifyReceizArtifactAdmission(input.holderIdentityAdmission);
  if ('code' in identity || identity.verdict !== 'canonical-identity') throw new Error('CUSTODY_HOLDER_IDENTITY_REQUIRED');
  const holder = await sdk.readReceizIdentityPublicBinding(identity), credential = opened.history.credential;
  if (credential.credentialType !== BANK_CUSTODY_CREDENTIAL_TYPE || credential.holderReceizId !== holder.artifactOwnerReceizId) throw new Error('CUSTODY_HOLDER_OR_TYPE_MISMATCH');
  const kai = await sdk.admitReceizKksV1ProofCoordinate(input.kaiCoordinate);
  const current = await sdk.resolveReceizCredentialCurrentnessV125({ issuance: opened.issuance, credential, verifiedHistory: opened.history, presentedHead: opened.acceptedHead, selectedKai: kai.kaiPulse }, input.operatorAuthority);
  if (!current.credentialValid || current.status !== 'current') throw new Error('CUSTODY_RECEIPT_NOT_CURRENT');
  const intake = await client.artifacts.verifyAndOpen(input.intake);
  if (intake.sealedArtifact.continuity.ownerReceizId !== holder.artifactOwnerReceizId) throw new Error('CUSTODY_INTAKE_OWNER_MISMATCH');
  const request = JSON.parse(new TextDecoder().decode(intake.verifiedPayload.bytes));
  if (request.schema !== 'receiz.bank.asset-intake-request.v1' || request.custody !== 'awaiting-receipt' || request.createsSpendableValue !== false) throw new Error('CUSTODY_INTAKE_REQUIRED');
  const claims = opened.issuance.attestation.genesis.claimSet.claims;
  const claim = (name: string): string => {
    const found = claims.filter(item => item.name === name);
    if (found.length !== 1 || typeof found[0].value !== 'string' || found[0].disclosure === 'private') throw new Error('CUSTODY_CLAIM_UNAVAILABLE');
    return found[0].value;
  };
  const intakeArtifactDigest = claim('depositRequestArtifactDigest'), title = claim('assetTitle'), quantity = claim('quantity'), redemptionTermsDigest = claim('redemptionTermsDigest');
  if (intakeArtifactDigest !== intake.sealedArtifact.artifactSha256 || title !== request.asset?.title || quantity !== request.asset?.quantity || claim('custodyStatus') !== 'received-and-verified' || !/^[a-f0-9]{64}$/.test(redemptionTermsDigest)) throw new Error('CUSTODY_REQUEST_BINDING_MISMATCH');
  const result: BankCustodyReceipt = Object.freeze({ credentialId: credential.credentialId, proofObjectId: opened.proofObjectId, receiptArtifactDigest: opened.artifactSha256, intakeArtifactDigest, acceptedHead: opened.acceptedHead, holderReceizId: holder.artifactOwnerReceizId, title, quantity, redemptionTermsDigest, currentness: 'current', kaiPulse: kai.kaiPulse, createsCash: false, ownershipExecutionCompleted: false });
  heldReceipts.set(result, source); return result;
}
export function heldBankCustodyReceiptSource(receipt: BankCustodyReceipt): ReceizPortableSealedArtifactV124 {
  const source = heldReceipts.get(receipt); if (!source) throw new Error('CUSTODY_SOURCE_CUSTODY_REQUIRED'); return source;
}
export type BankCustodyInitialSourceInput = Parameters<ReceizClient['credentials']['planInitialSource']>[0];
const heldIssuePlans = new WeakSet<Awaited<ReturnType<ReceizClient['credentials']['planInitialSource']>>>();
export async function planBankCustodyReceiptIssue(input: BankCustodyInitialSourceInput, operatorPolicyDigest?: string) {
  if (!operatorPolicyDigest || !/^[a-f0-9]{64}$/.test(operatorPolicyDigest) || input.authority.domainId !== BANK_CUSTODY_DOMAIN || input.authority.domainAuthorityArtifactSha256 !== operatorPolicyDigest) throw new Error('CUSTODY_OPERATOR_SOURCE_REQUIRED');
  const sdk = await loadReceiz();
  const issuance = await sdk.verifyAndOpenReceizAttestationArtifactV125({ artifact: input.issuanceSource, verifier: input.verifier }, input.authority);
  if (issuance.state.credentialType !== BANK_CUSTODY_CREDENTIAL_TYPE || issuance.state.status !== 'issued') throw new Error('CUSTODY_ISSUANCE_SOURCE_REQUIRED');
  const plan = await sdk.createReceizClient().credentials.planInitialSource(input);
  heldIssuePlans.add(plan); return plan;
}
export async function applyBankCustodyReceiptIssue(input: Parameters<ReceizClient['credentials']['applyInitialSource']>[0]) {
  if (input.plan.kind !== 'credential' || input.confirmationDigest !== input.plan.confirmationDigest) throw new Error('CUSTODY_EXACT_CONFIRMATION_REQUIRED');
  if (!heldIssuePlans.has(input.plan)) throw new Error('CUSTODY_SOURCE_PLAN_REQUIRED');
  const sdk = await loadReceiz(); return sdk.createReceizClient().credentials.applyInitialSource(input);
}
