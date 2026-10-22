import {inspectOriginalUsing,type NativeVerifier} from './original-inspection';
export {inspectOriginalUsing,type NativeVerifier,type NoteInspection} from './original-inspection';
import profile from '../../institution/receiver-profile.json';
import manifest from 'virtual:receiz-receiver-build';
import recorded from '../../docs/verification/2026-10-15-receiver-reference.json';
import { planAndInspectBothEdges } from '../../institution/examples/edge-payments';
import type {SuiteId} from './suites';
import type {HarnessIdentity} from './provenance';
import type {coverage} from './coverage';
import suiteBuild from 'virtual:receiz-conformance-suite-build';
import { importDigestVerifiedModule, requireRefusal } from './boundaries';

export { profile, recorded };
export const institutionChecks = [
  {id:'money',name:'Value, rail and exact arithmetic',description:'Run SDK integer rounding, large amounts and signed-intent rail, amount and head mutations. Display quotes are not funding.'},
  {id:'ownership',name:'Ownership, consent and causal history',description:'Execute the SDK sandbox ownership, revocation, double-claim, replay and unknown-namespace vectors; no live value moves.'},
  {id:'atomic',name:'Atomic state and once-only retry',description:'Run the canonical admission-store contract on isolated in-memory normal, limited and crash-injected adapters. A production store still needs qualification.'},
  {id:'recovery',name:'Exact intent and recovery',description:'Restore canonical original intent, refuse changed retained digests and distinguish identical retry from changed recipient.'},
  {id:'assets',name:'Asset value and replay authority',description:'Refuse caller-shaped verification and unbound value replay using the actual SDK v129 verifier. Positive funded supply and shares remain independently required.'},
  { id: 'release', name: 'Pinned release & registry', description: 'Compare the actual loaded SDK release and canonical registry with this receiving profile.' },
  { id: 'integrity', name: 'Verifier build integrity', description: 'Hash the exact native module bytes against the pinned build manifest. This checks resource integrity, not institution authority.' },
  { id: 'source', name: 'Carried note required', description: 'An ordinary PNG and unsigned payment JSON must be refused by native source and format validation.' },
  { id: 'custody', name: 'Opaque custody handles', description: 'A forged or serialized property bag cannot expose a verified note head or export verified source custody.' },
  { id: 'transport', name: 'Bounded transport', description: 'An image above the 8 MiB native carrier limit must be refused before proof verification.' },
  { id: 'temporal', name: 'KaiSigil temporal authority', description: 'Run all 11 canonical positive/mutation vectors, including proof binding, causal heads and rejection of bare timestamps.' },
  { id: 'edges', name: 'Sender & receiver inspection', description: 'Plan and independently inspect both explicit rails using nonfinancial synthetic coordinates. No sources are signed or committed.' },
] as const;
export type InstitutionCheckId=typeof institutionChecks[number]['id'];
export type CheckId='release'|'integrity'|'source'|'custody'|'transport'|'temporal'|'edges';
export const checks=institutionChecks.filter((check):check is Extract<typeof institutionChecks[number],{id:CheckId}>=>!['money','ownership','atomic','recovery','assets'].includes(check.id));
export type CheckResult = { id: CheckId; passed: boolean; durationMs: number; evidence: unknown; error?: string };
export type ReferenceReport = { schema: 'receiz.bank.browser-reference-checks.v1'; receizVersion: string; registryDigest: string; verifierModuleSha256: string; startedAt: string; completedAt: string; checks: CheckResult[]; localChecksPassed: boolean; institutionConformance: 'not-assessed'; creditAuthorized: false; financialActionsPerformed: 0; timestampsAreAuthority: false; sourceIdentity?:HarnessIdentity; coverage?:typeof coverage; verifierSourceCommit?:string; operationMatrixDigest?:string; referenceEnvironment?:{origin:string;userAgent:string}; };
export type InstitutionCheckResult=Omit<CheckResult,'id'>&{id:InstitutionCheckId};
export type InstitutionReferenceReport=Omit<ReferenceReport,'checks'>&{checks:InstitutionCheckResult[]};
let nativeLoad: Promise<NativeVerifier> | undefined;
export function loadNativeVerifier() {
  return nativeLoad ??= (async () => {
    const url = new URL('/native/receiver-verifier.v129.mjs', location.origin); url.searchParams.set('build', manifest.moduleSha256);
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) throw Error('VERIFIER_RESOURCE_UNAVAILABLE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    const module: NativeVerifier = await importDigestVerifiedModule(bytes, manifest.moduleSha256, verifiedUrl => import(/* @vite-ignore */ verifiedUrl));
    if (typeof module.inspectConnectedNoteReceipt!=='function'||typeof module.inspectNoteDepositReceipt!=='function'||typeof module.isBankConnectedNoteImage !== 'function'||typeof module.isBankConnectedNoteSource !== 'function'||typeof module.inspectConnectedNote !== 'function'||typeof module.isBankNoteAccountDeposit !== 'function' || typeof module.inspectAccountNoteDeposit !== 'function' || typeof module.openReserveNoteImage !== 'function' || typeof module.inspectReserveNote !== 'function' || typeof module.exportReserveNoteSource !== 'function') throw Error('VERIFIER_INTERFACE_INVALID');
    return module;
  })().catch(error => { nativeLoad = undefined; throw error; });
}
export async function inspectOriginalNote(bytes: Uint8Array) {
  return inspectOriginalUsing(bytes,await loadNativeVerifier());
}
export async function runReferenceCases(selected:readonly (typeof institutionChecks[number])[],onStart: (id: InstitutionCheckId) => void, onResult: (result: InstitutionCheckResult) => void): Promise<InstitutionReferenceReport> {
  const startedAt = new Date().toISOString(), results: InstitutionCheckResult[] = [];
  // No private account, native custody, signing or financial endpoint is opened.
  const sdkLoad = import('@receiz/sdk');
  const assert = (condition: boolean, error: string) => { if (!condition) throw Error(error); };
  const runSuite=async(id:SuiteId)=>{const report=await (await import('./suites')).runInstitutionSuite(id);assert(report.passed,`REFERENCE_SUITE_FAILED:${id}:${report.checks.filter(c=>!c.passed).map(c=>c.id).join(',')}`);return report;};
  const cases: Record<InstitutionCheckId, () => Promise<unknown>> = {
    money:()=>runSuite('money'),ownership:()=>runSuite('ownership'),atomic:()=>runSuite('atomic'),recovery:()=>runSuite('recovery'),assets:()=>runSuite('assets'),
    release: async () => { const sdk = await sdkLoad; assert(sdk.RECEIZ_SDK_VERSION === profile.receizVersion && sdk.RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST === profile.registryDigest, 'RELEASE_REGISTRY_MISMATCH'); return { sdkVersion: sdk.RECEIZ_SDK_VERSION, registryDigest: sdk.RECEIZ_GENERATED_CURRENT_REGISTRY_DIGEST }; },
    integrity: async () => { await loadNativeVerifier(); return { moduleSha256: manifest.moduleSha256, sourceCommit: manifest.sourceCommit, verificationIsFinancialAdmission: false }; },
    source: async () => { const native = await loadNativeVerifier(); const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX9sAAAAASUVORK5CYII='), value => value.charCodeAt(0)); await requireRefusal(() => native.openReserveNoteImage(png), 'BANK_COMPLETE_NOTE_IMAGE_REQUIRED'); await requireRefusal(() => native.openReserveNoteImage(new TextEncoder().encode('{"paid":true,"verified":true}')), 'Invalid PNG: bad signature'); return { ordinaryPng: 'BANK_COMPLETE_NOTE_IMAGE_REQUIRED', unsignedPaymentJson: 'Invalid PNG: bad signature', sourceRequired: true }; },
    custody: async () => { const native = await loadNativeVerifier(); await requireRefusal(() => native.inspectReserveNote({ verified: true }), 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED'); await requireRefusal(() => native.exportReserveNoteSource({ noteId: 'forged' }), 'BANK_NOTE_SOURCE_CUSTODY_REQUIRED'); return { forgedHandleRefused: true, transportedPropertyBagRefused: true }; },
    transport: async () => { const native = await loadNativeVerifier(); await requireRefusal(() => native.openReserveNoteImage(new Uint8Array(8 * 1024 * 1024 + 1)), 'BANK_NOTE_TRANSPORT_CAPACITY'); return { maximumCarrierBytes: 8 * 1024 * 1024, oversizeRefused: true }; },
    temporal: async () => { const report = await (await sdkLoad).runReceizV125TemporalAuthorityConformance(); assert(report.qualified && report.failedChecks.length === 0 && report.checks.length === 11 && report.releaseVersion === profile.receizVersion, 'TEMPORAL_VECTORS_FAILED'); return { reportDigest: report.reportDigest, checks: report.checks, reportIsTemporalAuthority: false }; },
    edges: async () => { const edge = (await sdkLoad).createReceizClient().value.edge; const roles = []; for (const rail of ['settlement', 'reserve'] as const) { const result = await planAndInspectBothEdges(edge, rail, { applicationId: 'reference.fixture', amountPhiMicro: '1', sourceProofObjectId: 'nonfinancial-fixture-source', sourceValueHead: 'a'.repeat(64), destinationSubjectId: 'nonfinancial-fixture-receiver', expectedDestinationHead: 'b'.repeat(64), usdPerPhiMicrocents: '1', priceBasis: { nonfinancialFixture: true }, attemptId: 'nonfinancial-fixture-attempt' }); assert(result.sender.role === 'sender' && result.receiver.role === 'receiver' && result.sender.rail === rail && result.receiver.rail === rail, 'EDGE_ROLE_INSPECTION_FAILED'); roles.push({ rail, roles: [result.sender.role, result.receiver.role], planIsTransactionAuthority: result.plan.authority.planIsTransactionAuthority }); } return { roles, signingPerformed: false, commitsPerformed: 0 }; },
  };
  for (const check of selected) {
    onStart(check.id); const start = performance.now(); let result: InstitutionCheckResult;
    try { result = { id: check.id, passed: true, evidence: await cases[check.id](), durationMs: Math.round(performance.now() - start) }; }
    catch (error) { result = { id: check.id, passed: false, evidence: null, error: error instanceof Error ? error.message.slice(0, 240) : 'CHECK_FAILED', durationMs: Math.round(performance.now() - start) }; }
    results.push(result); onResult(result);
  }
  return { schema: 'receiz.bank.browser-reference-checks.v1', receizVersion: profile.receizVersion, registryDigest: profile.registryDigest, verifierModuleSha256: manifest.moduleSha256, startedAt, completedAt: new Date().toISOString(), checks: results, verifierSourceCommit:manifest.sourceCommit,operationMatrixDigest:profile.operationMatrixDigest,referenceEnvironment:{origin:location.origin,userAgent:navigator.userAgent},localChecksPassed: results.every(result => result.passed), institutionConformance: 'not-assessed', creditAuthorized: false, financialActionsPerformed: 0, timestampsAreAuthority: false };
}
export async function runBrowserChecks(onStart:(id:CheckId)=>void,onResult:(result:CheckResult)=>void):Promise<ReferenceReport>{return await runReferenceCases(checks,id=>onStart(id as CheckId),result=>onResult(result as CheckResult)) as ReferenceReport;}
export function downloadEvidence(value: unknown, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/** Compact actual twelve-check result for the entrance's idle-only runner.
 * The seven-check API remains unchanged for its existing consumers. */
export interface EntranceReferenceReport {
  schema:'receiz.bank.entrance-reference-status.v2';suiteId:string;profileVersion:string;ruleset:string;
  receizVersion:string;registryDigest:string;operationMatrixDigest:string;verifierModuleSha256:string;
  suiteSourceSha256:string;startedAt:string;completedAt:string;checks:InstitutionCheckResult[];
  localChecksPassed:boolean;institutionConformance:'not-assessed';creditAuthorized:false;
  financialActionsPerformed:0;timestampsAreAuthority:false;scope:'nonfinancial-browser-reference';
  referenceEnvironment?:{origin:string;userAgent:string};
}
export async function runEntranceReferenceChecks(onStart:(id:InstitutionCheckId)=>void,onResult:(result:InstitutionCheckResult)=>void):Promise<EntranceReferenceReport>{
  const {INSTITUTION_BROWSER_SUITE_ID,INSTITUTION_BROWSER_CHECK_IDS}=await import('./check-ids');
  if(institutionChecks.map(check=>check.id).join(',')!==INSTITUTION_BROWSER_CHECK_IDS.join(','))throw Error('ENTRANCE_REFERENCE_SUITE_MISMATCH');
  const report=await runReferenceCases(institutionChecks,onStart,onResult);
  if(!/^[a-f0-9]{64}$/.test(suiteBuild.sourceTreeSha256))throw Error('ENTRANCE_REFERENCE_SOURCE_IDENTITY_REQUIRED');
  return {schema:'receiz.bank.entrance-reference-status.v2',suiteId:INSTITUTION_BROWSER_SUITE_ID,profileVersion:profile.profileVersion,ruleset:profile.ruleset,
    receizVersion:report.receizVersion,registryDigest:report.registryDigest,operationMatrixDigest:profile.operationMatrixDigest,verifierModuleSha256:report.verifierModuleSha256,
    suiteSourceSha256:suiteBuild.sourceTreeSha256,startedAt:report.startedAt,completedAt:report.completedAt,
    checks:report.checks.map(check=>({...check,evidence:null})),localChecksPassed:report.localChecksPassed,
    institutionConformance:'not-assessed',creditAuthorized:false,financialActionsPerformed:0,timestampsAreAuthority:false,
    scope:'nonfinancial-browser-reference',referenceEnvironment:report.referenceEnvironment};
}
