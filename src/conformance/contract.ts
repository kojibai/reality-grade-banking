import {canonicalJson,caseDigest} from './assessment.ts';
export interface ContractRequest {operation:string;input:Record<string,unknown>;}
export interface ContractCase {id:string;capability:string;request:ContractRequest;expected:unknown;}
export interface ContractResult extends ContractCase {observed:unknown;passed:boolean;requestDigest:string;responseDigest:string;remediation:string;}
export interface ContractReport {schema:'receiz.bank.contract-run.v1';scope:'public-integration-contracts';nonce:string;implementation:{name:string;buildSha256:string};executionMode:'active-adapter-run'|'transcript-replay';assessmentPassed:boolean;cases:ContractResult[];productionQualification:'not-demonstrated';financialActionsPerformed:0;reportIsAuthority:false;}
export type ContractAdapter=(request:ContractRequest)=>Promise<unknown>;
const failure=(error:string)=>({error});
function toB64u(text:string){return btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
export async function contractCases(nonce:string):Promise<ContractCase[]> {
 const cases:ContractCase[]=[];
 const add=(id:string,capability:string,operation:string,input:Record<string,unknown>,expected:unknown)=>cases.push({id,capability,request:{operation,input},expected});
 for(const [id,amount,rate,expected] of [['below-half-cent','1','499999999999','0'],['half-cent','1','500000000000','1'],['integer-above-js-safe-range','9007199254740993','1000000000000','9007199254740993']] as const)add(id,'exact-integer-value','quote',{amount,rate},expected);
 for(const amount of ['0','01','-1','1.1'])add(`reject-${amount}`,'exact-integer-value','quote',{amount,rate:'1'},failure('V122_PHI_DISPLAY_QUOTE_INVALID'));
 // Expected canonical digests are computed by this checker from the published
 // JSON contract, independently of the selected adapter's output.
 for(const rail of ['reserve','settlement']){
  const basis={schema:'receiz.world.value-intent.v122',rail,amountPhiMicro:'1000000',usdPerPhiMicrocents:'1000000',quotedUsdCents:'1',priceBasisDigest:await caseDigest({nonfinancialFixture:nonce}),sourceProofObjectId:`fixture:${nonce}`,sourceValueHead:'a'.repeat(64),destinationSubjectId:`recipient:${nonce}`,expectedDestinationHead:'b'.repeat(64),idempotencyKey:`fixture:${nonce}:${rail}`};
  const plan={...basis,valueIntentDigest:await caseDigest(basis)};
  add(`${rail}-exact-intent`,'rail-and-head-binding','validate-intent',{plan},{valid:true,digest:plan.valueIntentDigest});
  for(const [key,value] of [['rail',rail==='reserve'?'settlement':'reserve'],['amountPhiMicro','1000001'],['sourceValueHead','c'.repeat(64)],['expectedDestinationHead','d'.repeat(64)]])add(`${rail}-changed-${key}`,'rail-and-head-binding','validate-intent',{plan:{...plan,[key]:value}},{valid:false,digest:plan.valueIntentDigest});
 }
 const transaction={operation:'fixture.transfer',nonce,amount:'100',receiver:`recipient:${nonce}`,unknown:{futureNamespace:'opaque-data'},heads:{source:'a'.repeat(64),destination:'b'.repeat(64)}};
 const canonical=canonicalJson(transaction),saved={schema:'receiz.persisted-planned-transaction.v122',canonicalBytesB64u:toB64u(canonical),transactionDigest:await caseDigest(transaction)};
 add('restore-exact-source-and-namespace','exact-intent-recovery','restore',{saved},transaction);
 add('changed-recovery-digest','exact-intent-recovery','restore',{saved:{...saved,transactionDigest:'0'.repeat(64)}},failure('V122_PERSISTED_TRANSACTION_DIGEST_MISMATCH'));
 const changedBytes=toB64u(canonicalJson({...transaction,amount:'101'}));
 add('changed-recovery-bytes','exact-intent-recovery','restore',{saved:{...saved,canonicalBytesB64u:changedBytes}},failure('V122_PERSISTED_TRANSACTION_DIGEST_MISMATCH'));
 const unit={schema:'receiz.admission.unit-of-work.v1',aggregateId:`fixture:${nonce}`,commandDigest:`command:${nonce}`,idempotencyKey:`retry:${nonce}`,expectedRevision:0,expectedHeadDigest:null,acceptedCommand:{nonce},events:[{nonce}],nextHead:{revision:1,digest:`head:${nonce}`,state:{nonce,units:'7',unknown:'preserved'}},resourceEffects:{fixture:7},receipt:{nonce},outboxIntents:[{nonce}],auditReference:{nonce}};
 add('atomic-identical-retry-and-conflict','isolated-atomic-store','store-scenario',{unit,mode:'normal'},{outcomes:['committed','idempotent','conflict:IDEMPOTENCY_CONFLICT'],aggregate:{revision:1,headDigest:unit.nextHead.digest,state:unit.nextHead.state},collections:{acceptedCommands:1,events:1,heads:1,resourceLedgers:1,receipts:1,idempotencyRecords:1,outboxIntents:1,auditReferences:1}});
 const empty={acceptedCommands:0,events:0,heads:0,resourceLedgers:0,receipts:0,idempotencyRecords:0,outboxIntents:0,auditReferences:0};
 add('crash-before-swap-retains-no-effects','isolated-atomic-store','store-scenario',{unit,mode:'crash'},{outcomes:['failed:ATOMIC_COMMIT_FAILED'],aggregate:null,collections:empty});
 add('bounded-store-retains-no-effects','isolated-atomic-store','store-scenario',{unit,mode:'limited'},{outcomes:['rejected:TRANSACTION_LIMIT_EXCEEDED'],aggregate:null,collections:empty});
 const quote={reserveUsdCents:'6000',balancePhiMicro:'5000000',settlementPhiMicro:'2000000',usdPerPhiMicrocents:'2000000000'};
 add('reserve-note-original-claim','note-funding-components','note-funding',{amount:'4000',quote},{rail:'reserve',amountUsdCents:'4000',amountPhiMicro:'2000000'});
 add('settlement-note-exact-phi','note-funding-components','note-funding',{amount:'4000',quote,requested:'settlement'},{rail:'settlement',amountUsdCents:'4000',amountPhiMicro:'2000000'});
 const components=[{rail:'reserve',amountUsdCents:'6000',amountPhiMicro:'3000000'},{rail:'settlement',amountUsdCents:'4000',amountPhiMicro:'2000000'}];
 add('composite-note-conserves-both-parts','note-funding-components','note-funding',{amount:'10000',quote},{rail:'composite',amountUsdCents:'10000',amountPhiMicro:'5000000',fundingParts:{reserve:{amountUsdCents:'6000',amountPhiMicro:'3000000'},settlement:{amountUsdCents:'4000',amountPhiMicro:'2000000'}}});
 add('insufficient-admitted-quote-refuses','note-funding-components','note-funding',{amount:'10001',quote},failure('BANK_NOTE_INSUFFICIENT_FUNDS'));
 const totals={amountUsdCents:'10000',amountPhiMicro:'5000000'};
 add('asset-component-totals-preserved','asset-backing-components','asset-components',{components,totals},components);
 add('asset-changed-component-refuses','asset-backing-components','asset-components',{components:[{...components[0],amountUsdCents:'6001'},components[1]],totals},failure('BANK_ASSET_BACKING_INVALID'));
 add('asset-reordered-component-refuses','asset-backing-components','asset-components',{components:[components[1],components[0]],totals},failure('BANK_ASSET_BACKING_INVALID'));
 add('asset-duplicate-component-refuses','asset-backing-components','asset-components',{components:[components[0],components[0]],totals},failure('BANK_ASSET_BACKING_INVALID'));
 add('asset-unknown-private-field-refuses','asset-backing-components','asset-components',{components:[{...components[0],privateKey:'not-authority'},components[1]],totals},failure('BANK_ASSET_BACKING_INVALID'));
 const temporalOutcomes:Record<string,string>={'valid-kaisigil-proof-admitted':'VALID_KAISIGIL_PROOF_ADMITTED','bare-upulse-rejected':'V125_KKS_PROOF_COORDINATE_SHAPE_INVALID','kks-lattice-binding-enforced':'V125_KAI_SIGIL_KKS_LATTICE_MISMATCH','blake3-poseidon-binding-enforced':'V125_KAI_SIGIL_COMMITMENT_MISMATCH','groth16-public-signal-binding-enforced':'V125_KAI_SIGIL_GROTH16_PUBLIC_SIGNAL_MISMATCH','groth16-proof-verification-enforced':'V125_KAI_SIGIL_GROTH16_VERIFICATION_FAILED','previous-head-binding-enforced':'V125_KAI_SIGIL_PREVIOUS_HEAD_MISMATCH','strictly-monotonic-append-enforced':'V125_KAI_SIGIL_KAI_NONCAUSAL','future-coordinate-rejected':'V125_KAI_SIGIL_KAI_FROM_FUTURE','chronos-authority-rejected':'V125_KKS_PROOF_COORDINATE_SHAPE_INVALID','sealed-projection-preserves-exact-upulse':'SEALED_EXACT_UPULSE_PRESERVED'};
 const temporal=[];for(const [checkId,outcomeCode] of Object.entries(temporalOutcomes))temporal.push({checkId,outcomeCode,evidenceDigest:await caseDigest({checkId,passed:true,outcomeCode})});
 add('kaisigil-kks-proof-and-causal-mutations','verified-kai-causality','temporal-vectors',{release:'129.0.0',coordinateAuthority:'source-bound-kaisigil-kks'},temporal);
 return cases;
}
export const contractRemediation='Implement the specified public contract in the adapter; run the same command with a fresh nonce and inspect raw outputs and exact source hashes. This mechanical contract does not qualify funded Notes, financial assets or hardware.';
export async function runContractAssessment(adapter:ContractAdapter,implementation:ContractReport['implementation'],nonce:string=crypto.randomUUID()):Promise<ContractReport>{
 const cases:ContractResult[]=[];
 for(const test of await contractCases(nonce)){
  let observed:unknown;try{observed=await adapter(structuredClone(test.request));}catch(cause){observed=failure(cause instanceof Error?cause.message:'ADAPTER_ERROR');}
  if(observed===undefined)observed=failure('ADAPTER_OUTPUT_REQUIRED');
  cases.push({...test,observed,passed:canonicalJson(observed)===canonicalJson(test.expected),requestDigest:await caseDigest(test.request),responseDigest:await caseDigest(observed),remediation:contractRemediation});
 }
 return {schema:'receiz.bank.contract-run.v1',scope:'public-integration-contracts',nonce,implementation,executionMode:'active-adapter-run',assessmentPassed:cases.length>0&&cases.every(c=>c.passed),cases,productionQualification:'not-demonstrated',financialActionsPerformed:0,reportIsAuthority:false};
}
export async function verifyContractTranscript(value:unknown):Promise<ContractReport>{
 const input=value as Partial<ContractReport>,nonce=typeof input?.nonce==='string'?input.nonce:'';
 if(input?.schema!=='receiz.bank.contract-run.v1'||input.scope!=='public-integration-contracts'||nonce.length<1||nonce.length>128||!Array.isArray(input.cases)||input.cases.length>100||!input.implementation||!/^[a-f0-9]{64}$/.test(input.implementation.buildSha256))throw Error('CONTRACT_TRANSCRIPT_INVALID');
 const expected=await contractCases(nonce),supplied=input.cases;
 const replay=await runContractAssessment(async request=>{
  const test=expected.find(c=>canonicalJson(c.request)===canonicalJson(request)),matches=supplied.filter(c=>c.id===test?.id);
  if(matches.length!==1)throw Error('CONTRACT_CASE_MISSING_OR_DUPLICATED');
  const result=matches[0];if(result.requestDigest!==await caseDigest(request)||result.responseDigest!==await caseDigest(result.observed)||canonicalJson(result.request)!==canonicalJson(request))throw Error('CONTRACT_TRANSCRIPT_BINDING_MISMATCH');
  return result.observed;
 },input.implementation,nonce);
 return {...replay,executionMode:'transcript-replay',assessmentPassed:replay.assessmentPassed&&supplied.length===expected.length};
}
/** Actual pinned public APIs, isolated synthetic sources and in-memory state. */
export const referenceContractAdapter:ContractAdapter=async({operation,input})=>{
 const sdk=await import('@receiz/sdk');
 try{
  if(operation==='note-funding'){const {selectNoteFunding}=await import('../receiz/note-funding.ts');return selectNoteFunding(String(input.amount),input.quote,input.requested as 'reserve'|'settlement'|undefined);}
  if(operation==='asset-components'){const {inspectNativeAssetFundingComponents}=await import('../receiz/native-asset-backing.ts');return inspectNativeAssetFundingComponents(input.components,input.totals as {amountUsdCents:string;amountPhiMicro:string});}
  if(operation==='temporal-vectors'){const report=await sdk.runReceizV125TemporalAuthorityConformance();return report.checks.map(({checkId,outcomeCode,evidenceDigest})=>({checkId,outcomeCode,evidenceDigest}));}
  if(operation==='quote')return sdk.quoteReceizDisplayUsdV122(String(input.amount),String(input.rate));
  if(operation==='validate-intent'){const plan=input.plan as Parameters<typeof sdk.validateReceizValueIntentV122>[0];return {valid:await sdk.validateReceizValueIntentV122(plan),digest:plan.valueIntentDigest};}
  if(operation==='restore')return await sdk.restoreReceizExactPlannedTransaction(input.saved as Parameters<typeof sdk.restoreReceizExactPlannedTransaction>[0]);
  if(operation==='store-scenario'){
   const store=sdk.createReceizInMemoryAdmissionStore(input.mode==='crash'?{failBeforeSwap:()=>true}:input.mode==='limited'?{maxRecordsPerTransaction:1}:{}),unit=input.unit as Parameters<typeof store.commit>[0];
   const format=(r:Awaited<ReturnType<typeof store.commit>>)=>r.status+('code' in r?`:${r.code}`:'');
   const outcomes=[format(await store.commit(unit))];
   if(input.mode==='normal'){outcomes.push(format(await store.commit(unit)));outcomes.push(format(await store.commit({...unit,commandDigest:`different:${unit.commandDigest}`})));}
   const inspection=await store.inspect();return {outcomes,aggregate:await store.readAggregate(unit.aggregateId),collections:Object.fromEntries(Object.entries(inspection).map(([k,v])=>[k,v.length]))};
  }
  throw Error('CONTRACT_OPERATION_UNSUPPORTED');
 }catch(cause){return failure(cause instanceof Error?cause.message:'ADAPTER_ERROR');}
};
