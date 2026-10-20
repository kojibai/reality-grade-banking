import profile from '../../institution/receiver-profile.json';
import manifest from 'virtual:receiz-receiver-build';
import recorded from '../../docs/verification/2026-10-15-receiver-reference.json';
import { planAndInspectBothEdges } from '../../institution/examples/edge-payments';
import { importDigestVerifiedModule, requireRefusal } from './boundaries';

export { profile, recorded };
export const checks = [
  { id: 'release', name: 'Pinned release & registry', description: 'Compare the actual loaded SDK release and canonical registry with this receiving profile.' },
  { id: 'integrity', name: 'Verifier build integrity', description: 'Hash the exact native module bytes against the pinned build manifest. This checks resource integrity, not institution authority.' },
  { id: 'source', name: 'Carried note required', description: 'An ordinary PNG and unsigned payment JSON must be refused by native source and format validation.' },
  { id: 'custody', name: 'Opaque custody handles', description: 'A forged or serialized property bag cannot expose a verified note head or export verified source custody.' },
  { id: 'transport', name: 'Bounded transport', description: 'An image above the 8 MiB native carrier limit must be refused before proof verification.' },
  { id: 'temporal', name: 'KaiSigil temporal authority', description: 'Run all 11 canonical positive/mutation vectors, including proof binding, causal heads and rejection of bare timestamps.' },
  { id: 'edges', name: 'Sender & receiver inspection', description: 'Plan and independently inspect both explicit rails using nonfinancial synthetic coordinates. No sources are signed or committed.' },
] as const;
export type CheckId = typeof checks[number]['id'];
export type CheckResult = { id: CheckId; passed: boolean; durationMs: number; evidence: unknown; error?: string };
export type ReferenceReport = { schema: 'receiz.bank.browser-reference-checks.v1'; receizVersion: string; registryDigest: string; verifierModuleSha256: string; startedAt: string; completedAt: string; checks: CheckResult[]; localChecksPassed: boolean; institutionConformance: 'not-assessed'; creditAuthorized: false; financialActionsPerformed: 0; timestampsAreAuthority: false };
export interface NoteInspection { schema: string; rail: 'reserve' | 'settlement' | 'composite'; fundingParts?:import('../receiz/offline-notes').BankNoteFundingParts; noteId: string; noteArtifactSha256?: string; terminalArtifactSha256?:string; receiverUserId?:string; receiverKeyId?:string; redemptionDigest?:string; hostCreditChecked?:false; fundingArtifactSha256?: string; allocationId?: string; amountUsdCents: string; amountPhiMicro: string; receivingCustodyCommitmentDigest?: string; carriedChainVerified: true; currentSpendabilityChecked: false; custodyConsumed: false; creditAuthorized: false; }
interface NativeVerifier { isBankConnectedNoteImage(bytes:Uint8Array):Promise<boolean>;isBankConnectedNoteSource(bytes:Uint8Array):Promise<boolean>;inspectConnectedNote(bytes:Uint8Array):Promise<NoteInspection>;isBankNoteAccountDeposit(bytes:Uint8Array):boolean; inspectAccountNoteDeposit(bytes:Uint8Array):Promise<NoteInspection>; openReserveNoteImage(bytes: Uint8Array): Promise<unknown>; inspectReserveNote(handle: unknown): NoteInspection; exportReserveNoteSource(handle: unknown): unknown; }
let nativeLoad: Promise<NativeVerifier> | undefined;
export function loadNativeVerifier() {
  return nativeLoad ??= (async () => {
    const url = new URL('/native/receiver-verifier.v129.mjs', location.origin); url.searchParams.set('build', manifest.moduleSha256);
    const response = await fetch(url, { credentials: 'omit' });
    if (!response.ok) throw Error('VERIFIER_RESOURCE_UNAVAILABLE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const module: NativeVerifier = await importDigestVerifiedModule(bytes, manifest.moduleSha256, verifiedUrl => import(/* @vite-ignore */ verifiedUrl));
    if (typeof module.isBankConnectedNoteImage !== 'function'||typeof module.isBankConnectedNoteSource !== 'function'||typeof module.inspectConnectedNote !== 'function'||typeof module.isBankNoteAccountDeposit !== 'function' || typeof module.inspectAccountNoteDeposit !== 'function' || typeof module.openReserveNoteImage !== 'function' || typeof module.inspectReserveNote !== 'function' || typeof module.exportReserveNoteSource !== 'function') throw Error('VERIFIER_INTERFACE_INVALID');
    return module;
  })().catch(error => { nativeLoad = undefined; throw error; });
}
export async function inspectOriginalNote(bytes: Uint8Array) {
  const native = await loadNativeVerifier();
  if(await native.isBankConnectedNoteImage(bytes)||await native.isBankConnectedNoteSource(bytes))return{...await native.inspectConnectedNote(bytes),currentSpendabilityChecked:false as const};
  return native.isBankNoteAccountDeposit(bytes)?native.inspectAccountNoteDeposit(bytes):native.inspectReserveNote(await native.openReserveNoteImage(bytes));
}
export async function runBrowserChecks(onStart: (id: CheckId) => void, onResult: (result: CheckResult) => void): Promise<ReferenceReport> {
  const startedAt = new Date().toISOString(), results: CheckResult[] = [];
  // No private account, native custody, signing or financial endpoint is opened.
  const sdkLoad = import('@receiz/sdk');
  const assert = (condition: boolean, error: string) => { if (!condition) throw Error(error); };
  const cases: Record<CheckId, () => Promise<unknown>> = {
    release: async () => { const sdk = await sdkLoad; assert(sdk.RECEIZ_SDK_VERSION === profile.receizVersion && sdk.RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST === profile.registryDigest, 'RELEASE_REGISTRY_MISMATCH'); return { sdkVersion: sdk.RECEIZ_SDK_VERSION, registryDigest: sdk.RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST }; },
    integrity: async () => { await loadNativeVerifier(); return { moduleSha256: manifest.moduleSha256, sourceCommit: manifest.sourceCommit, verificationIsFinancialAdmission: false }; },
    source: async () => { const native = await loadNativeVerifier(); const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII='), value => value.charCodeAt(0)); await requireRefusal(() => native.openReserveNoteImage(png), 'BANK_COMPLETE_NOTE_IMAGE_REQUIRED'); await requireRefusal(() => native.openReserveNoteImage(new TextEncoder().encode('{"paid":true,"verified":true}')), 'Invalid PNG: bad signature'); return { ordinaryPng: 'BANK_COMPLETE_NOTE_IMAGE_REQUIRED', unsignedPaymentJson: 'Invalid PNG: bad signature', sourceRequired: true }; },
    custody: async () => { const native = await loadNativeVerifier(); await requireRefusal(() => native.inspectReserveNote({ verified: true }), 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED'); await requireRefusal(() => native.exportReserveNoteSource({ noteId: 'forged' }), 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED'); return { forgedHandleRefused: true, transportedPropertyBagRefused: true }; },
    transport: async () => { const native = await loadNativeVerifier(); await requireRefusal(() => native.openReserveNoteImage(new Uint8Array(8 * 1024 * 1024 + 1)), 'BANK_NOTE_TRANSPORT_CAPACITY'); return { maximumCarrierBytes: 8 * 1024 * 1024, oversizeRefused: true }; },
    temporal: async () => { const report = await (await sdkLoad).runReceizV125TemporalAuthorityConformance(); assert(report.qualified && report.failedChecks.length === 0 && report.checks.length === 11 && report.releaseVersion === profile.receizVersion, 'TEMPORAL_VECTORS_FAILED'); return { reportDigest: report.reportDigest, checks: report.checks, reportIsTemporalAuthority: false }; },
    edges: async () => { const edge = (await sdkLoad).createReceizClient().value.edge; const roles = []; for (const rail of ['settlement', 'reserve'] as const) { const result = await planAndInspectBothEdges(edge, rail, { applicationId: 'reference.fixture', amountPhiMicro: '1', sourceProofObjectId: 'nonfinancial-fixture-source', sourceValueHead: 'a'.repeat(64), destinationSubjectId: 'nonfinancial-fixture-receiver', expectedDestinationHead: 'b'.repeat(64), usdPerPhiMicrocents: '1', priceBasis: { nonfinancialFixture: true }, attemptId: 'nonfinancial-fixture-attempt' }); assert(result.sender.role === 'sender' && result.receiver.role === 'receiver' && result.sender.rail === rail && result.receiver.rail === rail, 'EDGE_ROLE_INSPECTION_FAILED'); roles.push({ rail, roles: [result.sender.role, result.receiver.role], planIsTransactionAuthority: result.plan.authority.planIsTransactionAuthority }); } return { roles, signingPerformed: false, commitsPerformed: 0 }; },
  };
  for (const check of checks) {
    onStart(check.id); const start = performance.now(); let result: CheckResult;
    try { result = { id: check.id, passed: true, evidence: await cases[check.id](), durationMs: Math.round(performance.now() - start) }; }
    catch (error) { result = { id: check.id, passed: false, evidence: null, error: error instanceof Error ? error.message.slice(0, 240) : 'CHECK_FAILED', durationMs: Math.round(performance.now() - start) }; }
    results.push(result); onResult(result);
  }
  return { schema: 'receiz.bank.browser-reference-checks.v1', receizVersion: profile.receizVersion, registryDigest: profile.registryDigest, verifierModuleSha256: manifest.moduleSha256, startedAt, completedAt: new Date().toISOString(), checks: results, localChecksPassed: results.every(result => result.passed), institutionConformance: 'not-assessed', creditAuthorized: false, financialActionsPerformed: 0, timestampsAreAuthority: false };
}
export function downloadEvidence(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}
