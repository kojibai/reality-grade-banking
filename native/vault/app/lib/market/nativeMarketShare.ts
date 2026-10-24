import {nativeMarketShareCapacityBudget,type NativeMarketShareCapacityMetrics} from './nativeMarketShareCapacity';
import {jcsCanonicalize} from '../../utils/jcs';
import {sha256Hex,base64UrlEncode,base64UrlDecode} from '../../utils/sha256';
import {deriveVaultMarketShareTransfer,inspectVaultMarketShareTransferRequest,type VaultMarketSharePosition,type VaultMarketShareTransferRequest} from './vaultMarketShares';
import {readVerifiedReceizDocumentBytesCanonical} from '../../../packages/receiz-sdk/src/verifier/canonical';
import {receizCurrentPinnedSignatureV4Roots} from '../../../packages/receiz-sdk/src/verifier/roots';
import {deriveReceizIdentityKeyIdFromPublicKeyRawB64u,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof} from '../../../packages/receiz-sdk/src/identity';
import type {ReceizSignatureV4RootPublicKey} from '../../../packages/receiz-sdk/src/verifier/signatureV4';
export const NATIVE_MARKET_SHARE_DOMAIN='receiz.market-share.native.root-signature.v1';
export type NativeMarketShareActor=Readonly<{accountId:string;keyId:string;receizId:string;alg:'Ed25519'|'P-256';publicKeyRawB64u:string}>;
export type NativeMarketShareReview=Readonly<{schema:'receiz.market-share.review.v1';kind:'deposit'|'send';request:VaultMarketShareTransferRequest;actor:NativeMarketShareActor;recipient:Readonly<{accountId:string;receizId:string;custody:boolean}>;sourcePosition:VaultMarketSharePosition;providerPosition:Record<string,unknown>|null;lotId:string|null;expiresAtKaiUPulse:string}>;
export type NativeMarketShareStoredPosition=Omit<VaultMarketSharePosition,'sourceHeadSha256'> & Readonly<{ownerReceizId:string;metadataExactJson:string}>;
export type NativeMarketShareExit=Readonly<{requestId:string;position:NativeMarketShareStoredPosition}>;
export type NativeMarketShareState=Readonly<{holdings:readonly NativeMarketShareStoredPosition[];pending:readonly NativeMarketShareExit[];exited:readonly NativeMarketShareExit[]}>;
export type NativeMarketSharePriorSource=Readonly<{consumedSourceSha256:string;headSourceSha256:string}>;
export type NativeMarketShareAuthorization=Readonly<{accountId:string;baselineSourceSha256:string;headSourceSha256:string}>;
export type NativeMarketShareRecipientIdentity=NativeMarketShareAuthorization & Readonly<{email:string;createdAt:string;keyId:string}>;
export type NativeMarketShareStatement=Readonly<{schema:'receiz.market-share.native-operation.v1';domain:typeof NATIVE_MARKET_SHARE_DOMAIN;issuerRootKid:string;operation:'adopt'|'send'|'release-pending'|'release';lotId:string;acceptedAtKaiUPulse:string;predecessorSourceSha256:string|null;review:NativeMarketShareReview;consentProof:ReceizIdentityLoginProof;before:NativeMarketShareState;after:NativeMarketShareState;evidence:readonly string[];allocationEvidenceSha256:string|null;creditEvidenceSha256:string|null;accountSources:readonly string[];priorSourceFamilies:readonly NativeMarketSharePriorSource[];authorizations:readonly NativeMarketShareAuthorization[];rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export type NativeMarketShareFamily=Readonly<{schema:'receiz.market-share.source-family.v1';headSourceSha256:string;sources:readonly Readonly<{sha256:string;exactBytesB64u:string}>[]}>;
export type NativeMarketSharePublicWitness=Readonly<{schema:'receiz.market-share.public-witness.v1';domain:typeof NATIVE_MARKET_SHARE_DOMAIN;issuerRootKid:string;lotId:string;sourceHeadSha256:string;holderAccountId:string;recordedAtKaiUPulse:string;holdings:readonly Readonly<{accountId:string;ownerReceizId:string;positionId:string;marketItemId:string;assetId:string|null;title:string;quantityMicro:string}>[];rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export const shareSame=(a:unknown,b:unknown)=>jcsCanonicalize(a)===jcsCanonicalize(b);
export const shareHex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/u.test(v);
export const shareClosed=(v:unknown,keys:readonly string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function fail(code:string):never{throw Error(`NATIVE_MARKET_SHARE_${code}`);}
export function nativeMarketShareChallenge(review:NativeMarketShareReview){return base64UrlEncode(new TextEncoder().encode(jcsCanonicalize({schema:'receiz.market-share.consent.v1',review})));}
export function inspectNativeMarketShareReview(input:unknown):NativeMarketShareReview{
 if(!shareClosed(input,['schema','kind','request','actor','recipient','sourcePosition','providerPosition','lotId','expiresAtKaiUPulse'])||input.schema!=='receiz.market-share.review.v1'||!['deposit','send'].includes(String(input.kind))||!shareClosed(input.actor,['accountId','keyId','receizId','alg','publicKeyRawB64u'])||!shareClosed(input.recipient,['accountId','receizId','custody'])||typeof input.recipient.custody!=='boolean'||typeof input.recipient.receizId!=='string'||!['Ed25519','P-256'].includes(String(input.actor.alg))||!shareHex(input.actor.keyId)||typeof input.actor.publicKeyRawB64u!=='string'||typeof input.actor.receizId!=='string'||typeof input.expiresAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,39}$/u.test(input.expiresAtKaiUPulse))return fail('REVIEW_INVALID');
 const r=inspectVaultMarketShareTransferRequest(input.request,{userId:String(input.actor.accountId),applicationId:String((input.request as Record<string,unknown>)?.applicationId)});
 if(input.recipient.accountId!==r.recipientAccountId||input.kind==='deposit'&&(input.lotId!==null||!input.providerPosition||!input.recipient.custody)||input.kind==='send'&&(!shareHex(input.lotId)||input.providerPosition!==null))return fail('REVIEW_INVALID');
 deriveVaultMarketShareTransfer({principal:{userId:r.sourceAccountId,applicationId:r.applicationId},request:r,source:input.sourcePosition as VaultMarketSharePosition,recipient:null,recipientPositionId:r.recipientAccountId});
 return structuredClone(input) as unknown as NativeMarketShareReview;
}
export async function verifyNativeMarketShareConsent(review:NativeMarketShareReview,proof:ReceizIdentityLoginProof){
 const r=inspectNativeMarketShareReview(review),a=r.actor;
 if(r.kind==='deposit'){const {metadataExactJson,...provider}=r.providerPosition!;if(typeof metadataExactJson!=='string'||!shareSame({...provider,sourceHeadSha256:await sha256Hex(jcsCanonicalize(r.providerPosition))},r.sourcePosition))fail('PROVIDER_POSITION_MISMATCH');}
 if(await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(a.publicKeyRawB64u,a.alg)!==a.keyId||!shareClosed(proof,['schema','keyId','alg','challengeB64Url','signatureB64Url'])||proof.schema!=='receiz.identity.login_proof.v1'||proof.keyId!==a.keyId||proof.alg!==a.alg||proof.challengeB64Url!==nativeMarketShareChallenge(r)||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:a.keyId,alg:a.alg,publicKeyRawB64u:a.publicKeyRawB64u,challengeB64Url:proof.challengeB64Url,signatureB64Url:proof.signatureB64Url}))fail('CONSENT_INVALID');
}
export const storedMarketSharePosition=(p:VaultMarketSharePosition,ownerReceizId:string,metadataExactJson='{}'):NativeMarketShareStoredPosition=>{const {sourceHeadSha256:_,...rest}=p;return {...rest,ownerReceizId,metadataExactJson};};
const projectStored=(p:NativeMarketShareStoredPosition,sourceHeadSha256:string):VaultMarketSharePosition=>{const {ownerReceizId:_,metadataExactJson:_metadata,...rest}=p;return {...rest,sourceHeadSha256};};
export function deriveNativeMarketShareState(before:NativeMarketShareState,review:NativeMarketShareReview,operation:NativeMarketShareStatement['operation']):NativeMarketShareState{
 const r=review.request,principal={userId:r.sourceAccountId,applicationId:r.applicationId};
 if(operation==='adopt'){
  if(before.holdings.length||before.pending.length||before.exited.length||review.kind!=='deposit'||!review.recipient.custody)fail('STATE_INVALID');
  const effect=deriveVaultMarketShareTransfer({principal,request:r,source:review.sourcePosition,recipient:null,recipientPositionId:r.recipientAccountId});
  return {holdings:[storedMarketSharePosition(effect.recipientAfter,review.recipient.receizId,String(review.providerPosition?.metadataExactJson??'{}'))],pending:[],exited:[]};
 }
 if(operation==='release'){
  const pending=before.pending.find(p=>p.requestId===r.requestId);if(!pending)fail('PENDING_REQUIRED');
  return {holdings:before.holdings,pending:before.pending.filter(p=>p!==pending),exited:[...before.exited,pending!]};
 }
 const source=before.holdings.find(p=>p.accountId===r.sourceAccountId&&p.positionId===r.positionId);if(!source||review.kind!=='send'||!shareSame(projectStored(source,r.sourceHeadSha256),review.sourcePosition))fail('CURRENT_SOURCE_REQUIRED');
 const recipient=review.recipient.custody?before.holdings.find(p=>p.accountId===r.recipientAccountId):null;
 const effect=deriveVaultMarketShareTransfer({principal,request:r,source:projectStored(source!,r.sourceHeadSha256),recipient:recipient?projectStored(recipient,r.sourceHeadSha256):null,recipientPositionId:recipient?.positionId??r.recipientAccountId});
 const holdings=before.holdings.filter(p=>p!==source&&p!==recipient).slice();
 if(effect.sourceAfter.shareQuantityMicro!=='0')holdings.push(storedMarketSharePosition(effect.sourceAfter,source!.ownerReceizId,source!.metadataExactJson));
 if(operation==='send'){
  if(!review.recipient.custody)fail('STATE_INVALID');holdings.push(storedMarketSharePosition(effect.recipientAfter,review.recipient.receizId,source!.metadataExactJson));
  return {holdings:holdings.sort((a,b)=>a.accountId.localeCompare(b.accountId)),pending:before.pending,exited:before.exited};
 }
 if(review.recipient.custody)fail('STATE_INVALID');
 return {holdings:holdings.sort((a,b)=>a.accountId.localeCompare(b.accountId)),pending:[...before.pending,{requestId:r.requestId,position:storedMarketSharePosition(effect.recipientAfter,review.recipient.receizId,source!.metadataExactJson)}],exited:before.exited};
}
async function verifyRoot(payload:Record<string,unknown>,signature:unknown,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>,upulse:string){
 if(!shareClosed(signature,['kid','alg','sig'])||signature.kid!==payload.issuerRootKid||signature.alg!=='Ed25519'||typeof signature.sig!=='string')return false;
 const root=roots.get(String(payload.issuerRootKid)),pulse=BigInt(upulse)/1000000n;if(!root||root.alg!=='Ed25519'||root.status!=='active'&&root.status!=='retired'||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)||root.status==='retired'&&!root.retiredAtPulse||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))return false;
 return verifyReceizIdentityPublicKeyProjectionSignature({keyId:await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u,'Ed25519'),alg:'Ed25519',publicKeyRawB64u:root.publicKeyRawB64u,challengeB64Url:base64UrlEncode(new TextEncoder().encode(jcsCanonicalize(payload))),signatureB64Url:signature.sig});
}
async function opened(bytes:Uint8Array,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>){
 const result=await readVerifiedReceizDocumentBytesCanonical({fileBytes:bytes,filename:'market-share.receizbundle',mime:'application/vnd.receiz.bundle+json',signatureV4RootPublicKeys:roots});
 if(!result.ok||!result.verification.integrity.ok||result.payloadMimeType!=='application/json')fail('ENCLOSING_SOURCE_UNVERIFIED');
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(result.payloadBytes),v=JSON.parse(raw);if(jcsCanonicalize(v)!==raw)fail('NONCANONICAL');return {v,result};
}
/** Independent reader: exact enclosing Sources, existing pinned financial roots,
 * complete predecessor closure, original consent and deterministic conservation.
 * It never requests a server/database/session or treats an old head as latest. */
export async function readNativeMarketShareFamily(input:unknown,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={}){
 const packet=structuredClone(input) as NativeMarketShareFamily,roots=options.roots??receizCurrentPinnedSignatureV4Roots();
 if(!shareClosed(packet,['schema','headSourceSha256','sources'])||packet.schema!=='receiz.market-share.source-family.v1'||!shareHex(packet.headSourceSha256)||!Array.isArray(packet.sources))fail('FAMILY_INVALID');
 const blocks=new Map<string,Uint8Array>();for(const source of packet.sources){if(!shareClosed(source,['sha256','exactBytesB64u'])||!shareHex(source.sha256)||typeof source.exactBytesB64u!=='string'||blocks.has(source.sha256))fail('FAMILY_INVALID');const bytes=base64UrlDecode(source.exactBytesB64u);if(base64UrlEncode(bytes)!==source.exactBytesB64u||await sha256Hex(bytes)!==source.sha256)fail('DIGEST_INVALID');blocks.set(source.sha256,bytes);}
 const priorPackets=new Map<string,NativeMarketShareReadChain>(),chains=new Map<string,NativeMarketShareReadChain>(),active=new Set<string>();
 const used=new Set<string>(),read=(d:string)=>{const b=blocks.get(d);if(!b)fail('COMPLETE_SOURCE_REQUIRED');used.add(d);return b!;};
 async function readChain(sourceHead:string):Promise<NativeMarketShareReadChain>{
 const cached=chains.get(sourceHead);if(cached)return cached;if(active.has(sourceHead))fail('SOURCE_CYCLE');active.add(sourceHead);
 const chain:Readonly<{head:string;statement:NativeMarketShareStatement}>[]=[];
 let cursor:string|null=sourceHead;const seen=new Set<string>();
 while(cursor){if(seen.has(cursor))fail('SOURCE_CYCLE');seen.add(cursor);const {v,result}=await opened(read(cursor),roots);
  if(!shareClosed(v,['schema','domain','issuerRootKid','operation','lotId','acceptedAtKaiUPulse','predecessorSourceSha256','review','consentProof','before','after','evidence','allocationEvidenceSha256','creditEvidenceSha256','accountSources','priorSourceFamilies','authorizations','rootSignature'])||v.schema!=='receiz.market-share.native-operation.v1'||v.domain!==NATIVE_MARKET_SHARE_DOMAIN||!shareHex(v.lotId)||typeof v.acceptedAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,39}$/u.test(v.acceptedAtKaiUPulse)||!['adopt','send','release-pending','release'].includes(String(v.operation))||v.predecessorSourceSha256!==null&&!shareHex(v.predecessorSourceSha256)||!Array.isArray(v.evidence)||!Array.isArray(v.accountSources)||!Array.isArray(v.priorSourceFamilies)||!Array.isArray(v.authorizations))fail('STATEMENT_INVALID');
  const {rootSignature,...payload}=v;if(!await verifyRoot(payload,rootSignature,roots,v.acceptedAtKaiUPulse)||String(result.verification.bundle?.kaiPulseEternal)!==(BigInt(v.acceptedAtKaiUPulse)/1000000n).toString())fail('ROOT_SIGNATURE_INVALID');
  const statement=v as unknown as NativeMarketShareStatement,review=inspectNativeMarketShareReview(statement.review),record=result.verification.bundle?.nativeRecordSeal as Readonly<{ownerReceizId?:unknown;recordId?:unknown}>|null|undefined;if(!record||record.ownerReceizId!==review.actor.receizId||record.recordId!==`market-share:${await sha256Hex(jcsCanonicalize(payload))}`)fail('ENCLOSING_RECORD_MISMATCH');await verifyNativeMarketShareConsent(review,statement.consentProof);
  for(const d of [...statement.evidence,...statement.accountSources]){if(!shareHex(d))fail('REFERENCE_INVALID');read(d);}
  if(!shareSame(deriveNativeMarketShareState(statement.before,review,statement.operation),statement.after))fail('CONSERVATION_INVALID');
  for(const prior of await verifyNativeMarketSharePriorSources(review,statement.priorSourceFamilies,readChain)){priorPackets.set(prior.headSourceSha256,prior);}
  if(statement.operation!=='adopt'&&statement.priorSourceFamilies.length)fail('PRIOR_SOURCE_INVALID');
  if(statement.operation==='adopt'){
   if(statement.predecessorSourceSha256!==null||!shareHex(statement.allocationEvidenceSha256))fail('ALLOCATION_REQUIRED');const allocation=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(read(statement.allocationEvidenceSha256!)));
   if(allocation.schema!=='receiz.market-share.current-allocation.v1'||allocation.scope!=='current-position-genesis'||allocation.historicalCompleteness!==false||allocation.recipientAccountId!==review.recipient.accountId||typeof allocation.acceptedAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,39}$/u.test(allocation.acceptedAtKaiUPulse)||BigInt(allocation.acceptedAtKaiUPulse)>=BigInt(statement.acceptedAtKaiUPulse)||BigInt(allocation.acceptedAtKaiUPulse)>=BigInt(review.expiresAtKaiUPulse)||!shareSame(allocation.before,review.providerPosition)||allocation.allocated.shareQuantityMicro!==review.request.quantityMicro||allocation.allocated.costBasisUsdCents!==statement.after.holdings[0]?.costBasisUsdCents||allocation.allocated.costBasisPhiMicro!==statement.after.holdings[0]?.costBasisPhiMicro||typeof allocation.providerExportExactJson!=='string')fail('ALLOCATION_INVALID');
   const effect=deriveVaultMarketShareTransfer({principal:{userId:review.actor.accountId,applicationId:review.request.applicationId},request:review.request,source:review.sourcePosition,recipient:null,recipientPositionId:review.recipient.accountId}),{sourceHeadSha256:_,...remaining}=effect.sourceAfter,{metadataExactJson:_metadata,...actualRemaining}=allocation.remaining??{},original=allocation.original;
   if(statement.lotId!==await sha256Hex(`receiz.market-share.custody-lot.v1|${allocation.allocationId}`)||allocation.positionId!==review.request.positionId||!shareSame(allocation.allocated,{...review.providerPosition,...effect.moved})||!shareSame(actualRemaining,remaining)||!original||!shareSame(original.review,review)||!shareSame(original.consentProof,statement.consentProof)||!shareSame(original.accountSources,statement.accountSources)||!shareSame(original.authorizations,statement.authorizations)||!shareSame(original.priorSourceFamilies,statement.priorSourceFamilies))fail('ALLOCATION_ORIGINAL_CONSERVATION_INVALID');
  }else if(statement.predecessorSourceSha256===null)fail('PREDECESSOR_REQUIRED');
  if(['send','release-pending'].includes(statement.operation)&&BigInt(statement.acceptedAtKaiUPulse)>=BigInt(review.expiresAtKaiUPulse))fail('CONSENT_EXPIRED');
  if(statement.operation==='release'){
   if(!shareHex(statement.creditEvidenceSha256))fail('CREDIT_REQUIRED');const credit=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(read(statement.creditEvidenceSha256!))),pending=statement.before.pending.find(p=>p.requestId===review.request.requestId);
   const identity=credit.recipientIdentity,authority=statement.authorizations.find(a=>a.accountId===review.recipient.accountId);if(!shareClosed(identity,['accountId','email','createdAt','keyId','baselineSourceSha256','headSourceSha256'])||!authority||identity.accountId!==authority.accountId||identity.baselineSourceSha256!==authority.baselineSourceSha256||identity.headSourceSha256!==authority.headSourceSha256||!shareHex(identity.keyId)||typeof identity.email!=='string'||typeof identity.createdAt!=='string'||!Number.isFinite(Date.parse(identity.createdAt)))fail('CREDIT_IDENTITY_INVALID');
   if(credit.schema!=='receiz.market-share.native-credit.v1'||credit.recipientAccountId!==review.recipient.accountId||credit.consumedSourceSha256!==statement.predecessorSourceSha256||!pending||!shareSame(credit.credited,pending.position))fail('CREDIT_INVALID');
   const {metadataExactJson:_beforeMetadata,...before}=credit.before??{},{metadataExactJson:_afterMetadata,...after}=credit.after??{};try{const effect=deriveVaultMarketShareTransfer({principal:{userId:review.actor.accountId,applicationId:review.request.applicationId},request:review.request,source:review.sourcePosition,recipient:{...before,sourceHeadSha256:review.request.sourceHeadSha256} as VaultMarketSharePosition,recipientPositionId:before.positionId}),{sourceHeadSha256:_head,...expected}=effect.recipientAfter;if(typeof _beforeMetadata!=='string'||typeof _afterMetadata!=='string'||!shareSame(after,expected))fail('CREDIT_CONSERVATION_INVALID');}catch{fail('CREDIT_CONSERVATION_INVALID');}
  }
  chain.push({head:cursor,statement});cursor=statement.predecessorSourceSha256;
 }
 chain.reverse();for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i];if(b.statement.operation==='release'&&(a.statement.operation!=='release-pending'||!shareSame(a.statement.review,b.statement.review)||!shareSame(a.statement.consentProof,b.statement.consentProof)))fail('RELEASE_ORIGINAL_CONFLICT');if(b.statement.operation!=='adopt'&&b.statement.review.lotId!==b.statement.lotId)fail('LOT_MISMATCH');if(a.statement.lotId!==b.statement.lotId||!shareSame(a.statement.after,b.statement.before)||BigInt(a.statement.acceptedAtKaiUPulse)>=BigInt(b.statement.acceptedAtKaiUPulse))fail('ANCESTRY_INVALID');}
 if(!chain.length)fail('UNRELATED_SOURCE');const head=chain.at(-1)!,value={headSourceSha256:head.head,statement:head.statement,state:head.statement.after,chain};chains.set(sourceHead,value);active.delete(sourceHead);return value;
 }
 const head=await readChain(packet.headSourceSha256);if(used.size!==blocks.size)fail('UNRELATED_SOURCE');const operations=new Map([...chains.values()].flatMap(c=>c.chain.map(op=>[op.head,op] as const)));
 return Object.freeze({...head,priorSources:[...priorPackets.values()],allOperations:[...operations.values()],openExact:(d:string)=>read(d).slice()});
}
/** Known native exits remain exact prior Originals when ordinary holdings are
 * adopted again. Their scope stays prior custody/exit; they never add current
 * quantity and never claim completeness of the intervening provider history.
 * Earlier exits may name another ordinary owner: current audited provider
 * ownership and fresh exact consent, rather than that historical recipient,
 * establish the new explicitly current-pulse adoption. */
export function nativeMarketSharePriorConsumptionDigests(review:NativeMarketShareReview):string[]{
 if(review.kind!=='deposit')return [];
 const raw=review.providerPosition?.metadataExactJson;if(typeof raw!=='string')fail('PRIOR_SOURCE_INVALID');const metadata=JSON.parse(raw) as Record<string,unknown>,listed=metadata.vaultMarketShareConsumedSources??[];
 if(!Array.isArray(listed)||listed.some(d=>!shareHex(d))||metadata.lastVaultConsumedSourceSha256!==undefined&&!shareHex(metadata.lastVaultConsumedSourceSha256))fail('PRIOR_SOURCE_INVALID');
 return [...new Set([...listed,...(typeof metadata.lastVaultConsumedSourceSha256==='string'?[metadata.lastVaultConsumedSourceSha256]:[])])].sort();
}
export type NativeMarketShareReadChain=Readonly<{headSourceSha256:string;statement:NativeMarketShareStatement;state:NativeMarketShareState;chain:readonly Readonly<{head:string;statement:NativeMarketShareStatement}>[]}>;
export async function verifyNativeMarketSharePriorSources(review:NativeMarketShareReview,refs:readonly NativeMarketSharePriorSource[],resolve:(head:string)=>Promise<NativeMarketShareReadChain>){
 const expected=nativeMarketSharePriorConsumptionDigests(review);if(!Array.isArray(refs)||refs.length!==expected.length||new Set(refs.map(r=>r.consumedSourceSha256)).size!==refs.length)fail('PRIOR_SOURCE_REQUIRED');
 const packets=new Map<string,NativeMarketShareReadChain>();
 for(const ref of refs){if(!shareClosed(ref,['consumedSourceSha256','headSourceSha256'])||!shareHex(ref.consumedSourceSha256)||!shareHex(ref.headSourceSha256)||!expected.includes(ref.consumedSourceSha256))fail('PRIOR_SOURCE_INVALID');
  const prior=await resolve(ref.headSourceSha256);
  if(!prior.chain.some(({statement:s})=>s.operation==='release'&&s.predecessorSourceSha256===ref.consumedSourceSha256&&s.review.request.marketItemId===review.request.marketItemId))fail('PRIOR_SOURCE_EXIT_REQUIRED');
  packets.set(prior.headSourceSha256,prior);
 }
 return [...packets.values()];
}
export async function readNativeMarketSharePublicWitness(input:unknown,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={}){
 if(!shareClosed(input,['sha256','exactBytesB64u'])||!shareHex(input.sha256)||typeof input.exactBytesB64u!=='string')fail('PUBLIC_SOURCE_INVALID');
 const bytes=base64UrlDecode(input.exactBytesB64u);if(base64UrlEncode(bytes)!==input.exactBytesB64u||await sha256Hex(bytes)!==input.sha256)fail('DIGEST_INVALID');const roots=options.roots??receizCurrentPinnedSignatureV4Roots(),{v,result}=await opened(bytes,roots);
 if(!shareClosed(v,['schema','domain','issuerRootKid','lotId','sourceHeadSha256','holderAccountId','recordedAtKaiUPulse','holdings','rootSignature'])||v.schema!=='receiz.market-share.public-witness.v1'||v.domain!==NATIVE_MARKET_SHARE_DOMAIN||!shareHex(v.lotId)||!shareHex(v.sourceHeadSha256)||typeof v.holderAccountId!=='string'||typeof v.recordedAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,39}$/u.test(v.recordedAtKaiUPulse)||!Array.isArray(v.holdings))fail('PUBLIC_SOURCE_INVALID');
 for(const h of v.holdings)if(!shareClosed(h,['accountId','ownerReceizId','positionId','marketItemId','assetId','title','quantityMicro'])||h.accountId!==v.holderAccountId||typeof h.quantityMicro!=='string'||!/^[1-9][0-9]{0,18}$/u.test(h.quantityMicro)||typeof h.ownerReceizId!=='string')fail('PUBLIC_SOURCE_INVALID');
 const record=result.verification.bundle?.nativeRecordSeal as Readonly<{ownerReceizId?:unknown;recordId?:unknown}>|null|undefined,{rootSignature,...payload}=v;if(!record||record.recordId!==`market-share:${await sha256Hex(jcsCanonicalize(payload))}`||v.holdings.some(h=>record.ownerReceizId!==h.ownerReceizId))fail('ENCLOSING_RECORD_MISMATCH');if(!await verifyRoot(payload,rootSignature,roots,v.recordedAtKaiUPulse)||String(result.verification.bundle?.kaiPulseEternal)!==(BigInt(v.recordedAtKaiUPulse)/1000000n).toString())fail('PUBLIC_SOURCE_INVALID');
 return v as unknown as NativeMarketSharePublicWitness;
}

export type NativeMarketShareCapacity=NativeMarketShareCapacityMetrics&Readonly<{schema:'receiz.market-share.capacity.v1';domain:typeof NATIVE_MARKET_SHARE_DOMAIN;issuerRootKid:string;reviewSha256:string;sourceHeadSha256:string;authorizations:readonly NativeMarketShareAuthorization[];priorSourceFamilies:readonly NativeMarketSharePriorSource[];issuedAtKaiUPulse:string;resultMaxBytes:number;reservedSourceBytes:number;rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export async function readNativeMarketShareCapacity(input:unknown,review:NativeMarketShareReview,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={}){
 if(!shareClosed(input,['sha256','exactBytesB64u'])||!shareHex(input.sha256)||typeof input.exactBytesB64u!=='string')fail('CAPACITY_REQUIRED');const bytes=base64UrlDecode(input.exactBytesB64u);if(base64UrlEncode(bytes)!==input.exactBytesB64u||await sha256Hex(bytes)!==input.sha256)fail('CAPACITY_DIGEST_INVALID');const roots=options.roots??receizCurrentPinnedSignatureV4Roots(),{v,result}=await opened(bytes,roots);
 if(!shareClosed(v,['schema','domain','issuerRootKid','reviewSha256','sourceHeadSha256','authorizations','priorSourceFamilies','issuedAtKaiUPulse','retainedSources','newOriginalMaxBytes','futureFamilyCount','preparedMaxBytes','providerExportMaxBytes','creditMaxBytes','statementPayloadMaxBytes','resultMaxBytes','reservedSourceBytes','rootSignature'])||v.schema!=='receiz.market-share.capacity.v1'||v.domain!==NATIVE_MARKET_SHARE_DOMAIN||v.reviewSha256!==await sha256Hex(jcsCanonicalize(review))||v.sourceHeadSha256!==review.request.sourceHeadSha256||typeof v.issuedAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,39}$/.test(v.issuedAtKaiUPulse))fail('CAPACITY_INVALID');const c=v as unknown as NativeMarketShareCapacity,expected=nativeMarketShareCapacityBudget(c),{rootSignature,...payload}=v,record=result.verification.bundle?.nativeRecordSeal as {ownerReceizId:string;recordId:string};if(!record||record.ownerReceizId!==review.actor.receizId||record.recordId!==`market-share:${await sha256Hex(jcsCanonicalize(payload))}`||!await verifyRoot(payload,rootSignature,roots,c.issuedAtKaiUPulse)||String(result.verification.bundle?.kaiPulseEternal)!==(BigInt(c.issuedAtKaiUPulse)/1000000n).toString()||!shareSame(expected,{resultMaxBytes:c.resultMaxBytes,reservedSourceBytes:c.reservedSourceBytes}))fail('CAPACITY_UNVERIFIED');return c;
}
