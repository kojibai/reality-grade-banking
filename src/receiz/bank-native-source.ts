import type { ReceizPortableSealedArtifactV124, ReceizVerifiedIdentityArtifactAdmission, ReceizKksV1ProofCoordinate, ReceizClient } from '@receiz/sdk';
import type { createReceizOfflineSealer } from '@receiz/sdk/offline';
import type { ReceizOfflineKaiProofFactory } from '@receiz/sdk/offline/kai';
import { loadReceiz } from './client';
import { nextBankKaiCoordinate } from './bank-kai';
import { BANK_APPLICATION_ID } from './config';

export interface BankSubjectSource {
  subjectId: string;
  artifactDigest: string;
  subjectHead: string;
  stateDigest: string;
  historyHead: string;
  ownerReceizId: string;
  namespaces: readonly string[];
  kaiCoordinate: ReceizKksV1ProofCoordinate;
}
const heldSources = new WeakMap<BankSubjectSource, ReceizPortableSealedArtifactV124>();

// Admission starts with the complete original seal. This display object never
// supplies actor authority; the privately held source is reopened by the SDK.
export async function openBankSubjectSource(file: File, ownerIdentityAdmission: ReceizVerifiedIdentityArtifactAdmission): Promise<BankSubjectSource> {
  const sdk = await loadReceiz();
  try {
    const opened = await sdk.createReceizClient().artifacts.verifyAndOpen(file);
    if (opened.sealedArtifact.kind !== 'receiz.native-record-seal') throw new Error('BANK_SUBJECT_SOURCE_NOT_ADMITTED');
    const artifact = await sdk.transportReceizSealedArtifactV124(opened.sealedArtifact);
    const subject = await sdk.readReceizTemporalSubjectSourceV125(artifact);
    const owner = await sdk.readReceizIdentityPublicBinding(ownerIdentityAdmission);
    if (subject.source.subjectState.ownerReceizId !== owner.artifactOwnerReceizId || subject.source.ownership.ownerReceizId !== owner.artifactOwnerReceizId || opened.sealedArtifact.continuity.ownerReceizId !== owner.artifactOwnerReceizId) throw new Error('BANK_SUBJECT_OWNER_MISMATCH');
    if (subject.source.subjectState.registryDigest !== sdk.RECEIZ_CURRENT_REGISTRY_DIGEST || subject.source.subjectState.reducerDigest !== sdk.RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST) throw new Error('BANK_SUBJECT_REGISTRY_MISMATCH');
    const source: BankSubjectSource = Object.freeze({ subjectId: subject.source.subjectState.subjectId, artifactDigest: artifact.artifactSha256, subjectHead: subject.source.subjectState.head, stateDigest: subject.source.subjectState.stateDigest, historyHead: subject.head, ownerReceizId: owner.artifactOwnerReceizId, namespaces: Object.freeze(subject.source.subjectState.opaqueNamespaces.map(item => item.namespace)), kaiCoordinate: subject.coordinate });
    heldSources.set(source, artifact);
    return source;
  } catch (error) {
    if (error instanceof Error && ['BANK_SUBJECT_OWNER_MISMATCH', 'BANK_SUBJECT_REGISTRY_MISMATCH'].includes(error.message)) throw error;
    throw new Error('BANK_SUBJECT_SOURCE_NOT_ADMITTED');
  }
}

export function heldBankSubjectSource(source: BankSubjectSource): ReceizPortableSealedArtifactV124 {
  const held = heldSources.get(source);
  if (!held) throw new Error('BANK_SUBJECT_SOURCE_CUSTODY_REQUIRED');
  return held;
}

// Explicit new, private account coordination source. It neither imports a
// wallet balance nor creates currency, custody, value or transfer rights.
export async function createBankSubjectSource(input: { ownerIdentityAdmission: ReceizVerifiedIdentityArtifactAdmission; sealer: Pick<ReturnType<typeof createReceizOfflineSealer>, 'seal'>; kaiFactory: ReceizOfflineKaiProofFactory; client: Pick<ReceizClient, 'subjects'>; seed?: { bytes: Uint8Array; filename: string }; retainSeed(seed: { bytes: Uint8Array; filename: string; digest: string }): Promise<void> }) {
  const sdk = await loadReceiz();
  const owner = await sdk.readReceizIdentityPublicBinding(input.ownerIdentityAdmission);
  const createdSeed = input.seed ? null : await input.sealer.seal({ bytes: new TextEncoder().encode(JSON.stringify({ schema: 'receiz.bank.account-source-intent.v1', applicationId: BANK_APPLICATION_ID, purpose: 'private-account-coordination', createsSpendableValue: false })), filename: 'bank-account-intent.json', mimeType: 'application/json' });
  const seed = input.seed ?? { bytes: new Uint8Array(createdSeed!.artifactBytes), filename: createdSeed!.filename };
  const openedSeed = await sdk.createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(seed.bytes)], seed.filename));
  if (openedSeed.sealedArtifact.continuity.ownerReceizId !== owner.artifactOwnerReceizId) throw new Error('BANK_SUBJECT_OWNER_MISMATCH');
  const seedDigest = openedSeed.sealedArtifact.artifactSha256;
  // Retain complete original bytes before remote admission. Every timeout
  // reuses this same proof and semantic key; a projection cannot replace it.
  await input.retainSeed({ ...seed, digest: seedDigest });
  const admitted = await input.client.subjects.admit({ proofObject: new File([new Uint8Array(seed.bytes)], seed.filename), ownerReceizId: owner.artifactOwnerReceizId, idempotencyKey: `bank-account:${BANK_APPLICATION_ID}:${seedDigest}`, expectedAbsent: true });
  if (!admitted.ok) throw new Error(`BANK_SUBJECT_ADMISSION_${admitted.code}`);
  const state = await input.client.subjects.state(admitted.subjectId);
  if (state.admittedProofDigest !== seedDigest || state.ownerReceizId !== owner.artifactOwnerReceizId || state.subjectId !== admitted.subjectId || state.registryDigest !== sdk.RECEIZ_CURRENT_REGISTRY_DIGEST || state.reducerDigest !== sdk.RECEIZ_LIVING_SUBJECT_REDUCER_DIGEST || state.head !== state.genesisHead) throw new Error('BANK_SUBJECT_ADMITTED_STATE_MISMATCH');
  const coordinate = await nextBankKaiCoordinate(input.kaiFactory);
  const candidate = await sdk.prepareReceizInitialTemporalSubjectSourceV125({ initialSource: true, subject: { subjectState: state, portable: { ownership: { ownerReceizId: owner.artifactOwnerReceizId, custody: 'bearer', proofRef: 'genesis' }, provenance: { root: state.proofObjectId, appends: [] }, settlement: { state: 'none' } } }, kksCoordinate: coordinate });
  const sealed = await input.sealer.seal({ bytes: candidate.proofObject.payload.bytes, filename: 'bank-account-source.json', mimeType: candidate.proofObject.payload.mimeType });
  const file = new File([new Uint8Array(sealed.artifactBytes)], sealed.filename, { type: sealed.mimeType });
  const source = await openBankSubjectSource(file, input.ownerIdentityAdmission);
  return { source, bytes: new Uint8Array(sealed.artifactBytes), filename: sealed.filename };
}
