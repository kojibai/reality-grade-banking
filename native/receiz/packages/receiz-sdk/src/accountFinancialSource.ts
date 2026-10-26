import {createReceizArtifactAdmissionEngine, readReceizIdentityPublicBinding} from './artifactAdmission.js';
import {verifyReceizArtifactWithCanonicalRoots} from './artifactVerification.js';
import {sha256ReceizBytes} from './artifacts.js';
import {receizBase64UrlDecode, receizBase64UrlEncode, type ReceizIdentityLoginProof} from './identity.js';
import {parseReceizPortableAssetDocument, extractReceizPortableAssetPayload} from './portableAsset.js';
import {canonicalizeReceizV122 as canonical, digestReceizCanonicalV122 as digest} from './v122Canonical.js';
import {receizCurrentPinnedSignatureV4Roots} from './verifier/roots.js';
import type {ReceizSignatureV4RootPublicKey} from './verifier/signatureV4.js';
import {compileBankOfflineMarketPricing, compileBankOfflineWalletValuation, inspectBankOfflineWalletLedger, type AccountExecutionWalletAmounts} from './accountFinancialMath.generated.js';

const SHA=/^[a-f0-9]{64}$/u, UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
const MAX=(1n<<63n)-1n;
function fail(reason:string):never{throw new TypeError('ACCOUNT_FINANCIAL_SOURCE_'+reason);}
function object(v:unknown,keys:readonly string[]):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail('SHAPE');
 return v as Record<string,unknown>;
}
function string(v:unknown):string{if(typeof v!=='string')fail('SHAPE');return v;}
function uint(v:unknown):string{const s=string(v);if(!/^(0|[1-9][0-9]{0,18})$/u.test(s)||BigInt(s)>MAX)fail('INTEGER');return s;}
function positive(v:unknown):string{const s=uint(v);if(s==='0')fail('INTEGER');return s;}
function hash(v:unknown):string{const s=string(v);if(!SHA.test(s))fail('DIGEST');return s;}
function bytes(v:unknown,length?:number):Uint8Array{
 const s=string(v),b=receizBase64UrlDecode(s);
 if(receizBase64UrlEncode(b)!==s||(length!==undefined&&b.length!==length))fail('ENCODING');return b;
}
function same(a:unknown,b:unknown){if(canonical(a)!==canonical(b))fail('OPENING');}
function array(v:unknown):unknown[]{if(!Array.isArray(v))fail('SHAPE');return v;}
function ordered(values:readonly string[]){if(values.some((s,i)=>i>0&&s<=values[i-1]!))fail('ORDER');}
function wallet(v:unknown):AccountExecutionWalletAmounts{
 const w=object(v,['balancePhiMicro','availableUsdCents','settledUsdCents']);Object.values(w).forEach(uint);
 if(BigInt(string(w.settledUsdCents))>BigInt(string(w.availableUsdCents)))fail('BALANCE');
 return w as AccountExecutionWalletAmounts;
}
function positions(v:unknown){
 const result=array(v).map(p=>{
  const r=object(p,['marketItemId','shareQuantityMicro','costBasisUsdCents','costBasisPhiMicro']);
  const id=string(r.marketItemId);if(id.trim()!==id||id.length<3||id.length>240||/[\u0000-\u001f]/u.test(id))fail('POSITION');
  positive(r.shareQuantityMicro);uint(r.costBasisUsdCents);uint(r.costBasisPhiMicro);return r;
 });ordered(result.map(p=>string(p.marketItemId)));return result;
}

export type ReceizAccountFinancialSource=Readonly<{
 artifactSha256:string;allocationId:string;accountUserId:string;ownerReceizId:string;
 sourceFamily:'connected-wallet-share-market';wallet:AccountExecutionWalletAmounts;
}>;
// Only successful enclosing-original admission issues this custody. A copied
// projection or an arbitrary document seal cannot become a financial source.
const admitted=new WeakMap<ReceizAccountFinancialSource,Readonly<{bytes:Uint8Array;body:Record<string,unknown>;valuation:ReturnType<typeof compileBankOfflineWalletValuation>;marketPricing:ReadonlyMap<string,ReturnType<typeof compileBankOfflineMarketPricing>>}>>();
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const nested of Object.values(value))freeze(nested);Object.freeze(value);}return value;}
/** Internal composition only; no projection can fabricate admitted custody. */
export function readReceizAccountFinancialSourceCustody(source:ReceizAccountFinancialSource){const held=admitted.get(source);if(!held)fail('CUSTODY_REQUIRED');return Object.freeze({body:held.body,valuation:held.valuation,marketPricingAt:(id:string,delta:string,flow:Parameters<ReturnType<typeof compileBankOfflineMarketPricing>['at']>[1],at:string)=>held.marketPricing.get(id)?.at(delta,flow,at)??null,artifactBytes:()=>held.bytes.slice()});}

/** Unsigned preparation checks only. These reuse the exact Source openings
 * and Identity verifier; they issue no funding or admitted Source custody. */
export async function validateReceizAccountFinancialSourceOpenings(input:unknown,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={}){
 const body=object(input,['funding','program','initialState','inventory','ownerConsent','identityArtifact']),roots=options.roots??receizCurrentPinnedSignatureV4Roots();
 const admit=createReceizArtifactAdmissionEngine({canonicalSignatureV4RootPublicKeys:roots});
  const f=object(body.funding,['schema','allocationId','applicationId','accountUserId','ownerReceizId','receizKeyId','sourceAccountArtifactSha256','sourceInventorySha256','executionProgramSha256','initialStateSha256','receivingCustodyCommitmentDigest','fundedAtKaiUPulse']);
  if(f.schema!=='receiz.bank.offline-financial-allocation.v1'||!UUID.test(string(f.accountUserId))||!/^[a-zA-Z0-9_.:-]{3,240}$/u.test(string(f.applicationId))||!/^[-a-z0-9_]+\.receiz\.id$/u.test(string(f.ownerReceizId)))fail('FUNDING');
  for(const key of ['allocationId','receizKeyId','sourceAccountArtifactSha256','sourceInventorySha256','executionProgramSha256','initialStateSha256','receivingCustodyCommitmentDigest'])hash(f[key]);
  const at=positive(f.fundedAtKaiUPulse);
  for(const [key,value]of [['executionProgramSha256',body.program],['initialStateSha256',body.initialState],['sourceInventorySha256',body.inventory]]as const)if(await digest(value)!==f[key])fail('OPENING');
  const programVersion=(body.program as Record<string,unknown>)?.schema,quantityBudget=programVersion==='receiz.bank.offline-financial-program.v3',dynamic=quantityBudget||programVersion==='receiz.bank.offline-financial-program.v2';
  const p=object(body.program,['schema','sourceFamily','applicationId','accountUserId','ownerReceizId','nativeValueEnabled','usdPerPhiMicrocents','validFromKaiUPulse','expiresAtKaiUPulse','walletValuation','marketTerms','identity','custodian',...(dynamic?['marketPricing']:[]),...(Object.hasOwn(body.program as object,'recipientBindings')?['recipientBindings']:[])]);
  if(!['receiz.bank.offline-financial-program.v1','receiz.bank.offline-financial-program.v2','receiz.bank.offline-financial-program.v3'].includes(string(p.schema))||p.sourceFamily!=='connected-wallet-share-market'||p.applicationId!==f.applicationId||p.accountUserId!==f.accountUserId||p.ownerReceizId!==f.ownerReceizId||p.validFromKaiUPulse!==at||BigInt(positive(p.expiresAtKaiUPulse))<=BigInt(at))fail('PROGRAM');
  if(p.recipientBindings!==undefined){
   const recipients=array(p.recipientBindings).map(value=>{const r=object(value,['recipientUserId','recipientOwnerReceizId','conversationId','sourceAccountArtifactSha256']);
    if(!UUID.test(string(r.recipientUserId))||r.recipientUserId===f.accountUserId||!UUID.test(string(r.conversationId))||!/^[-a-z0-9_]+\.receiz\.id$/u.test(string(r.recipientOwnerReceizId)))fail('RECIPIENT');hash(r.sourceAccountArtifactSha256);return string(r.recipientUserId)+':'+string(r.conversationId);
   });ordered(recipients);
  }
  const identity=object(p.identity,['keyId','alg','publicKeyRawB64u']);if(identity.keyId!==f.receizKeyId||!['Ed25519','P-256'].includes(string(identity.alg)))fail('IDENTITY');
  const custodian=object(p.custodian,['kind','publicKeyRawB64u']);if(custodian.kind!=='existing-sdk-record-signer'||await digest(custodian)!==f.receivingCustodyCommitmentDigest)fail('CUSTODY');bytes(custodian.publicKeyRawB64u,32);
  const carried=object(body.identityArtifact,['artifactSha256','exactBytesB64u']),identityBytes=bytes(carried.exactBytesB64u);
  if(await sha256ReceizBytes(identityBytes)!==f.sourceAccountArtifactSha256||carried.artifactSha256!==f.sourceAccountArtifactSha256)fail('IDENTITY');
  const consent=object(body.ownerConsent,['schema','keyId','alg','challengeB64Url','signatureB64Url']);
  const owner=await admit(await verifyReceizArtifactWithCanonicalRoots(identityBytes,roots),{profile:'identity',identityProof:consent as ReceizIdentityLoginProof,identityExactChallenge:'receiz.account-execution-consent.v1\0'+canonical(f)});
  if('code'in owner||owner.profile!=='identity'||owner.verdict!=='canonical-identity')fail('CONSENT');
  const binding=await readReceizIdentityPublicBinding(owner);
  if(binding.artifactOwnerReceizId!==f.ownerReceizId||binding.keyId!==identity.keyId||binding.alg!==identity.alg||binding.publicKeyRawB64u!==identity.publicKeyRawB64u)fail('IDENTITY');
  const inventory=object(body.inventory,['schema','accountUserId','walletAccount','rawSettledUsdCents','principalArtifactIds','ledgerKnownKaiHead','ledgerExactJson','positionsExactJson','walletLedger','profileSeed','positions']);
  if(inventory.schema!=='receiz.bank.offline-financial-capture.v1'||inventory.accountUserId!==f.accountUserId)fail('INVENTORY');
  const ledger=inspectBankOfflineWalletLedger(inventory.walletLedger),account=object(inventory.walletAccount,['balancePhiMicro','membershipRevision']);
  uint(account.membershipRevision);same(account.balancePhiMicro,ledger.accountBalancePhiMicro);same(inventory.rawSettledUsdCents,ledger.settledUsdCents);
  if(inventory.ledgerKnownKaiHead!==null&&BigInt(uint(inventory.ledgerKnownKaiHead))>BigInt(at))fail('INVENTORY');
  // These exact originals remain carried for financial adoption. Arithmetic
  // openings are signed by the existing financial root, never rediscovered.
  for(const field of ['ledgerExactJson','positionsExactJson'])array(JSON.parse(string(inventory[field])));
  const seed=object(inventory.profileSeed,['amountPhiMicro','amountUsdCents']);Object.values(seed).forEach(uint);
  const valuation=object(p.walletValuation,['schema','creationSigilBenefitsEnabled','publicGlyphs','lawfulActionPhiMicro','profileSeedPhiMicro','profileSeedUsdCents','membershipDigest','projectorDigest']);
  same(valuation.profileSeedPhiMicro,seed.amountPhiMicro);same(valuation.profileSeedUsdCents,seed.amountUsdCents);
  // Existing lawful-action sources need their own custody handoff. A scalar
  // projection cannot silently delegate an independently spendable original.
  if(valuation.lawfulActionPhiMicro!=='0')fail('UNQUALIFIED_LAWFUL_ACTION_CUSTODY');
  const ids=array(inventory.principalArtifactIds).map(v=>{const id=string(v);if(!UUID.test(id))fail('INVENTORY');return id;});ordered(ids);
  same(ids,array(valuation.publicGlyphs).map(g=>string((g as Record<string,unknown>).id)).sort());
  const compiledValuation=compileBankOfflineWalletValuation(valuation,at),projected=compiledValuation.at(ledger,string(f.accountUserId),at);
  same(projected.nativeValueEnabled,p.nativeValueEnabled);same(projected.usdPerPhiMicrocents,positive(p.usdPerPhiMicrocents));
  const state=object(body.initialState,['schema','allocationId','accountUserId','sequence','lastKaiUPulse','wallet','walletLedger','positions','marketCapacity',...(dynamic?['marketActivity']:[])]);
  if(state.schema!=='receiz.account-financial-state.v1'||state.allocationId!==f.allocationId||state.accountUserId!==f.accountUserId||state.sequence!=='0'||state.lastKaiUPulse!==at)fail('STATE');
  same(wallet(state.wallet),projected.wallet);same(state.walletLedger,ledger);same(positions(state.positions),positions(inventory.positions));
  const terms=array(p.marketTerms).map(t=>{
   const r=object(t,['marketItemId','sourceArtifactSha256','bidPriceUsdCents','askPriceUsdCents','referenceMidUsdCents','maxSingleTradeUsdCents','buyCapacityUsdCents','backedSellLiquidityUsdCents','targetBudgetUsdCents',...(quantityBudget?['buyShareQuantityMicro']:[])]);
   const id=string(r.marketItemId);if(id.trim()!==id||id.length<3||id.length>240||/[\u0000-\u001f]/u.test(id))fail('TERM');hash(r.sourceArtifactSha256);
   for(const k of ['bidPriceUsdCents','askPriceUsdCents','referenceMidUsdCents','targetBudgetUsdCents'])positive(r[k]);
   for(const k of ['maxSingleTradeUsdCents','buyCapacityUsdCents','backedSellLiquidityUsdCents',...(quantityBudget?['buyShareQuantityMicro']:[])])uint(r[k]);
   if(BigInt(string(r.askPriceUsdCents))<=BigInt(string(r.bidPriceUsdCents))||BigInt(string(r.targetBudgetUsdCents))>50000000000n)fail('TERM');return r;
  });ordered(terms.map(t=>string(t.marketItemId)));
  same(state.marketCapacity,terms.map(t=>({marketItemId:t.marketItemId,buyCapacityUsdCents:t.buyCapacityUsdCents,backedSellLiquidityUsdCents:t.backedSellLiquidityUsdCents,...(quantityBudget?{buyShareQuantityMicro:t.buyShareQuantityMicro}:{})})));
 const compiledMarketPricing=new Map<string,ReturnType<typeof compileBankOfflineMarketPricing>>();
  if(dynamic){
   same(state.marketActivity,[]);
   const priceRows=array(p.marketPricing).map(value=>object(value,['marketItemId','basis']));
   same(priceRows.map(row=>row.marketItemId),terms.map(term=>term.marketItemId));
   for(const row of priceRows){const basis=row.basis as {item?:{id?:unknown}},id=string(row.marketItemId);if(basis?.item?.id!==id)fail('TERM');
    const compiled=compileBankOfflineMarketPricing(row.basis,at),opening=compiled.at('0',[],at),term=terms.find(term=>term.marketItemId===id)!;
    for(const key of['referenceMidUsdCents','bidPriceUsdCents','askPriceUsdCents']as const)same(String(opening[key]),term[key]);
    same(String(opening.pressure.targetBudgetUsdCents),term.targetBudgetUsdCents);compiledMarketPricing.set(id,compiled);
   }
  }
 return{compiledValuation,compiledMarketPricing,projected};
}

/** Admit an existing-root-funded original once, outside financial taps. This
 * admits its financial inputs, not an action, global delivery or device
 * nonclonability. All source/head acceptance remains a separate boundary. */
export async function admitReceizAccountFinancialSource(input:Uint8Array,options:Readonly<{
 roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;
}>={}):Promise<ReceizAccountFinancialSource>{
 try{
  const original=input.slice(),roots=new Map([...options.roots??receizCurrentPinnedSignatureV4Roots()].map(([k,v])=>[k,{...v}]));
  const admit=createReceizArtifactAdmissionEngine({canonicalSignatureV4RootPublicKeys:roots});
  const source=await admit(await verifyReceizArtifactWithCanonicalRoots(original,roots),{profile:'portable-state'});
  if('code'in source||source.profile!=='portable-state'||source.verdict!=='bearer-recovery')fail('ORIGINAL');
  const document=await parseReceizPortableAssetDocument(source.recoveredState),payload=await extractReceizPortableAssetPayload(document);
  if(document.assetType!=='proof_object'||document.settlement.state!=='offline_financial_allocation'||payload.mimeType!=='application/json')fail('ORIGINAL');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(payload.bytes);
  const body=object(JSON.parse(text),['funding','fundingSignature','program','initialState','inventory','ownerConsent','identityArtifact']);
  if(canonical(body)!==text)fail('CANONICAL');
  const f=object(body.funding,['schema','allocationId','applicationId','accountUserId','ownerReceizId','receizKeyId','sourceAccountArtifactSha256','sourceInventorySha256','executionProgramSha256','initialStateSha256','receivingCustodyCommitmentDigest','fundedAtKaiUPulse']);
  if(f.schema!=='receiz.bank.offline-financial-allocation.v1'||!UUID.test(string(f.accountUserId))||!/^[a-zA-Z0-9_.:-]{3,240}$/u.test(string(f.applicationId))||!/^[-a-z0-9_]+\.receiz\.id$/u.test(string(f.ownerReceizId)))fail('FUNDING');
  for(const key of ['allocationId','receizKeyId','sourceAccountArtifactSha256','sourceInventorySha256','executionProgramSha256','initialStateSha256','receivingCustodyCommitmentDigest'])hash(f[key]);
  const at=positive(f.fundedAtKaiUPulse),pulse=BigInt(at)/1000000n;
  const signature=object(body.fundingSignature,['kid','alg','sig','signedAtMs']),root=roots.get(string(signature.kid));
  if(!root||root.alg!=='Ed25519'||signature.alg!=='Ed25519'||!Number.isSafeInteger(signature.signedAtMs)||Number(signature.signedAtMs)<=0
   ||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)||root.status==='retired'&&!root.retiredAtPulse||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))fail('FUNDING_SIGNATURE');
  const publicKey=await crypto.subtle.importKey('raw',bytes(root.publicKeyRawB64u,32).slice().buffer,'Ed25519',false,['verify']);
  if(!await crypto.subtle.verify('Ed25519',publicKey,bytes(signature.sig,64).slice().buffer,new TextEncoder().encode('receiz.bank.offline-reserve.v129\0'+canonical(f))))fail('FUNDING_SIGNATURE');
  if(source.ownerReceizId!==f.ownerReceizId||document.ownership.ownerReceizId!==f.ownerReceizId||document.ownership.custody!=='receiz.account-execution:'+f.allocationId||document.ownership.proofRef!=='genesis'
   ||document.provenance.root!=='receiz.bank.offline-financial-allocation:'+f.allocationId||document.provenance.appends.length!==0)fail('OWNERSHIP');
  const {fundingSignature:_signature,...openings}=body;void _signature;
  const {compiledValuation,compiledMarketPricing,projected}=await validateReceizAccountFinancialSourceOpenings(openings,{roots});
  const accepted=Object.freeze({artifactSha256:source.artifactSha256,allocationId:string(f.allocationId),accountUserId:string(f.accountUserId),ownerReceizId:string(f.ownerReceizId),sourceFamily:'connected-wallet-share-market'as const,wallet:Object.freeze({...projected.wallet})});
  admitted.set(accepted,{bytes:original,body:freeze(body),valuation:compiledValuation,marketPricing:compiledMarketPricing});return accepted;
 }catch(error){if(error instanceof Error&&error.message.startsWith('ACCOUNT_FINANCIAL_SOURCE_'))throw error;fail('INVALID');}
}
