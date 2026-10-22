import {
  canonicalizeReceizV122, quoteReceizDisplayUsdV122, planReceizValueIntentV122, validateReceizValueIntentV122,
  persistReceizExactPlannedTransaction, restoreReceizExactPlannedTransaction,
  createReceizSemanticIdempotencyKey, createReceizInMemoryAdmissionStore,
  runReceizAdmissionStoreConformance, projectReceizProofValueV129,
  verifyReceizProofValueReplayV129, isSdkIssuedReceizArtifactRecoveryPlan,
} from '@receiz/sdk';
import { runReceizLivingSubjectConformanceV120 } from '@receiz/sdk/testing';

export type SuiteId = 'money' | 'recovery' | 'atomic' | 'ownership' | 'assets';
export interface VectorResult { id: string; expected: string; observed: unknown; passed: boolean; error?: string; }
export interface SuiteReport { id: SuiteId; passed: boolean; checks: VectorResult[]; scope: string; financialAuthority: false; }
const equal = (a: unknown, b: unknown) => canonicalizeReceizV122(a) === canonicalizeReceizV122(b);
async function vector(id: string, expected: string, run: () => Promise<{observed:unknown; passed:boolean}>): Promise<VectorResult> {
  try { return {id, expected, ...await run()}; }
  catch(cause) { return {id, expected, observed:null, passed:false, error:cause instanceof Error?cause.message:'VECTOR_ERROR'}; }
}
async function refusal(run: () => unknown, code: string) {
  try { await run(); return {observed:'ACCEPTED',passed:false}; }
  catch(cause) { const observed=cause instanceof Error?cause.message:'UNKNOWN_ERROR'; return {observed,passed:observed===code}; }
}
export async function runInstitutionSuite(id: SuiteId): Promise<SuiteReport> {
  const checks:VectorResult[]=[];
  const add=async (name:string, expected:string, run:()=>Promise<{observed:unknown;passed:boolean}>)=>{checks.push(await vector(name,expected,run));};
  let scope='';
  if(id==='money') {
    scope='SDK integer display arithmetic and exact value-intent mutation checks. Quotes and plans do not establish funding, backing or credit.';
    for(const [name,amount,rate,expected] of [['below-half-cent','1','499999999999','0'],['half-cent-rounding','1','500000000000','1'],['large-integer-precision','9007199254740993','1000000000000','9007199254740993']] as const) {
      await add(name,expected,async()=>{const observed=quoteReceizDisplayUsdV122(amount,rate);return {observed,passed:observed===expected};});
    }
    for(const invalid of ['0','01','-1','1.1']) await add(`invalid-amount-${invalid}`,'V122_PHI_DISPLAY_QUOTE_INVALID',()=>refusal(()=>quoteReceizDisplayUsdV122(invalid,'1'),'V122_PHI_DISPLAY_QUOTE_INVALID'));
    for(const rail of ['reserve','settlement'] as const) {
      const plan=await planReceizValueIntentV122({rail,amountPhiMicro:'1000000',usdPerPhiMicrocents:'1000000',sourceProofObjectId:'nonfinancial-source',sourceValueHead:'a'.repeat(64),destinationSubjectId:'nonfinancial-recipient',expectedDestinationHead:'b'.repeat(64),priceBasis:{nonfinancialFixture:true}});
      await add(`${rail}-original-intent`,'Original exact intent verifies',async()=>({observed:{valid:await validateReceizValueIntentV122(plan),rail:plan.rail},passed:await validateReceizValueIntentV122(plan)}));
      for(const [field,value] of [['rail',rail==='reserve'?'settlement':'reserve'],['amountPhiMicro','1000001'],['expectedDestinationHead','c'.repeat(64)],['sourceValueHead','d'.repeat(64)]]) await add(`${rail}-changed-${field}`,'Changed signed intent refuses',async()=>{const observed=await validateReceizValueIntentV122({...plan,[field]:value});return {observed,passed:!observed};});
    }
  }
  if(id==='recovery') {
    scope='Exact canonical transaction retention, digest mutation refusal and semantic retry identity. No execution, staging or remote recovery occurs.';
    const original={operation:'nonfinancial.transfer',amount:'100',recipient:'fixture.receiver',heads:{source:'a'.repeat(64),destination:'b'.repeat(64)},unknown:{futureNamespace:'retain exact value'}};
    const saved=await persistReceizExactPlannedTransaction(original);
    await add('exact-reopen','Restored canonical transaction equals original',async()=>{const observed=await restoreReceizExactPlannedTransaction(saved);return {observed,passed:equal(observed,original)};});
    await add('changed-retained-digest','V122_PERSISTED_TRANSACTION_DIGEST_MISMATCH',()=>refusal(()=>restoreReceizExactPlannedTransaction({...saved,transactionDigest:'0'.repeat(64)}),'V122_PERSISTED_TRANSACTION_DIGEST_MISMATCH'));
    const key=async(recipient:string)=>createReceizSemanticIdempotencyKey({operation:'fixture.transfer',ownerReceizId:'fixture.owner',semanticIntent:{amount:'100',recipient}});
    await add('same-intent-same-coordinate','Identical intent resolves identical semantic key',async()=>{const observed=[await key('a'),await key('a')];return {observed,passed:observed[0]===observed[1]};});
    await add('changed-recipient-new-coordinate','Different recipient cannot reuse semantic key',async()=>{const observed=[await key('a'),await key('b')];return {observed,passed:observed[0]!==observed[1]};});
    await add('copied-recovery-not-authority','Property bag is not an SDK-issued recovery plan',async()=>{const observed=isSdkIssuedReceizArtifactRecoveryPlan({verified:true,transactionDigest:saved.transactionDigest});return {observed,passed:!observed};});
  }
  if(id==='atomic') {
    scope='Canonical SDK admission-store contract against isolated in-memory normal, bounded and crash-injected adapters. This does not qualify a durable production store.';
    const report=await runReceizAdmissionStoreConformance({create:()=>createReceizInMemoryAdmissionStore(),createLimited:()=>createReceizInMemoryAdmissionStore({maxRecordsPerTransaction:1}),createFailing:()=>createReceizInMemoryAdmissionStore({failBeforeSwap:()=>true})});
    for(const [name,passed] of Object.entries(report.checks)) checks.push({id:name,expected:'Canonical isolated adapter contract passes',observed:passed,passed:passed===true});
  }
  if(id==='ownership') {
    scope='SDK living-subject emulator: current ownership, stale/double claims, revoked mandates, causal replay, atomic failure and unknown namespaces. Synthetic subject transfers are not funded Notes or asset shares.';
    const report=await runReceizLivingSubjectConformanceV120();
    for(const check of report.checks) checks.push({id:check.id,expected:'Canonical SDK sandbox vector passes',observed:check.evidence,passed:check.status==='pass'});
  }
  if(id==='assets') {
    scope='Canonical v129 proof-value admission and replay refusal. No admitted asset, share supply, funded offer, title or liquidity is fabricated. Positive financial cases require original sources and the actual writer.';
    await add('caller-verified-flag-not-value','Unretained caller-shaped verification refuses',async()=>{
      try { await projectReceizProofValueV129({source:{status:'verified-artifact',verified:true,proofDigest:'a'.repeat(64)} as never,valuationKaiUPulse:'1'}); return {observed:'ACCEPTED',passed:false}; }
      catch(cause) {const observed=cause instanceof Error?cause.message:'UNKNOWN_ERROR'; return {observed,passed:observed==='ARTIFACT_VERIFICATION_NOT_RUNTIME_CUSTODIED'};}
    });
    await add('unbound-replay-not-value','Invalid carried replay produces invalid-replay with zero writes',async()=>{const observed=await verifyReceizProofValueReplayV129({schema:'receiz.proof-value-replay.v129',verified:true});return {observed,passed:observed.status==='invalid-replay'&&observed.writesPerformed===0};});
  }
  return {id,checks,passed:checks.length>0&&checks.every(check=>check.passed),scope,financialAuthority:false};
}
export async function runInstitutionSuites():Promise<SuiteReport[]> { const reports=[];for(const id of ['money','recovery','atomic','ownership','assets'] as const) reports.push(await runInstitutionSuite(id)); return reports; }
