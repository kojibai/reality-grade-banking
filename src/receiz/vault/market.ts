import {canonicalizeReceizV122 as jcsCanonicalize,receizBase64UrlEncode as base64UrlEncode,receizBase64UrlDecode as base64UrlDecode,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof} from '@receiz/sdk';
import {createReceizClient} from '@receiz/sdk';
import {receizCurrentPinnedSignatureV4Roots} from '../../../native/receiz/packages/receiz-sdk/src/verifier/roots';
import type {ReceizSignatureV4RootPublicKey} from '../../../native/receiz/packages/receiz-sdk/src/verifier/signatureV4';
import {parseExactByteBlockReference,reconstructExactByteBlocks,type ExactByteBlockReference} from '../../../native/receiz/packages/receiz-sdk/src/exactByteBlocks';
import {BANK_APPLICATION_ID} from '../config';
import {vaultBase64,vaultBytes,vaultCanonical,vaultDigest,vaultObject} from './encoding';
const sha256Hex=(value:string|Uint8Array)=>vaultDigest(typeof value==='string'?new TextEncoder().encode(value):value);

// The browser reader uses the identical native Market request, reducer and
// source schema. Canonical enclosing verification and the existing financial
// issuer roots establish admission; no HTTP status or cached amount does so.

/** This module calculates an in-kind effect and encodes an exact consent
 * request. Neither a position-shaped value nor this calculation is admitted
 * custody. A native writer must verify complete source, fence legacy writers,
 * verify account authority/consent and retain its accepted enclosing successor
 * before any result can be presented as a transfer. */
export type VaultMarketSharePrincipal = Readonly<{userId: string; applicationId: string}>;
export type VaultMarketShareTransferRequest = Readonly<{
  schema: "receiz.vault.market-share-transfer.v1";
  applicationId: string; requestId: string; sourceAccountId: string;
  recipientAccountId: string; positionId: string; marketItemId: string;
  sourceHeadSha256: string; quantityMicro: string;
}>;
export type VaultMarketShareAmounts = Readonly<{
  shareQuantityMicro: string; costBasisUsdCents: string; costBasisPhiMicro: string;
}>;
export type VaultMarketSharePosition = VaultMarketShareAmounts & Readonly<{
  positionId: string; accountId: string; sourceHeadSha256: string;
  marketItemId: string; marketType: "asset";
  marketSource: "venture" | "assetseal" | "profile" | "starter";
  assetId: string | null; title: string; summary: string;
  verifyHref: string | null; externalHref: string | null;
  visibility: "public" | "private";
  lastPriceUsdCents: string; quoteUsdPerPhiMicrocents: string;
}>;
const MAX = 9_223_372_036_854_775_807n;
const uuid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u.test(v);
const digest = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/u.test(v);
const integer = (v: unknown, positive = false): v is string => typeof v === "string" && /^(0|[1-9][0-9]{0,18})$/u.test(v) && BigInt(v) <= MAX && (!positive || v !== "0");
const text = (v: unknown, max: number, empty = false): v is string => typeof v === "string" && (empty || v.length > 0) && v.length <= max && !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(v);
const itemId = (v: unknown): v is string => text(v, 240) && v.length >= 3 && v.trim() === v && !/[\x00-\x1f\x7f]/u.test(v);
function record(v: unknown, fields: readonly string[], code: string): Record<string, unknown> {
  if (!v || typeof v !== "object" || Array.isArray(v) || Object.keys(v).length !== fields.length || !fields.every(k => Object.hasOwn(v, k))) throw Error(code);
  return v as Record<string, unknown>;
}
export function inspectVaultMarketShareTransferRequest(input: unknown, principal: VaultMarketSharePrincipal): VaultMarketShareTransferRequest {
  const v = record(input, ["schema", "applicationId", "requestId", "sourceAccountId", "recipientAccountId", "positionId", "marketItemId", "sourceHeadSha256", "quantityMicro"], "VAULT_MARKET_SHARE_CLOSED_REQUEST");
  if (v.schema !== "receiz.vault.market-share-transfer.v1" || typeof v.applicationId !== "string" || !/^rc_[A-Za-z0-9_-]{1,128}$/u.test(v.applicationId) || typeof v.requestId !== "string" || !/^[A-Za-z0-9._:-]{8,120}$/u.test(v.requestId) || !uuid(v.sourceAccountId) || !uuid(v.recipientAccountId) || v.sourceAccountId === v.recipientAccountId || !uuid(v.positionId) || !itemId(v.marketItemId) || !digest(v.sourceHeadSha256) || !integer(v.quantityMicro, true)) throw Error("VAULT_MARKET_SHARE_REQUEST_INVALID");
  if (v.applicationId !== principal.applicationId || v.sourceAccountId !== principal.userId) throw Error("VAULT_MARKET_SHARE_ACCESS_DENIED");
  return Object.freeze(structuredClone(v)) as VaultMarketShareTransferRequest;
}
export function vaultMarketShareTransferChallenge(input: unknown, principal: VaultMarketSharePrincipal): string {
  return base64UrlEncode(new TextEncoder().encode(jcsCanonicalize({schema: "receiz.vault.market-share-transfer-consent.v1", request: inspectVaultMarketShareTransferRequest(input, principal)})));
}
function position(input: unknown): VaultMarketSharePosition {
  const v = record(input, ["positionId", "accountId", "sourceHeadSha256", "marketItemId", "marketType", "marketSource", "assetId", "title", "summary", "verifyHref", "externalHref", "visibility", "shareQuantityMicro", "costBasisUsdCents", "costBasisPhiMicro", "lastPriceUsdCents", "quoteUsdPerPhiMicrocents"], "VAULT_MARKET_SHARE_POSITION_INVALID");
  if (!uuid(v.positionId) || !uuid(v.accountId) || !digest(v.sourceHeadSha256) || !itemId(v.marketItemId) || v.marketType !== "asset" || !["venture", "assetseal", "profile", "starter"].includes(String(v.marketSource)) || v.assetId !== null && !text(v.assetId, 512) || !text(v.title, 240) || !text(v.summary, 100000, true) || v.verifyHref !== null && !text(v.verifyHref, 8192) || v.externalHref !== null && !text(v.externalHref, 8192) || !["public", "private"].includes(String(v.visibility)) || !["shareQuantityMicro", "costBasisUsdCents", "costBasisPhiMicro", "lastPriceUsdCents", "quoteUsdPerPhiMicrocents"].every(k => integer(v[k])) || v.shareQuantityMicro === "0" && (v.costBasisUsdCents !== "0" || v.costBasisPhiMicro !== "0")) throw Error("VAULT_MARKET_SHARE_POSITION_INVALID");
  return structuredClone(v) as VaultMarketSharePosition;
}
/** The split uses the existing native certificate export/import half-up
 * cost allocation. A full transfer takes the exact remaining basis. BigInt
 * intermediates avoid the PostgreSQL bigint multiplication overflow while
 * every stored result remains within its existing integer denomination. */
export function deriveVaultMarketShareTransfer(input: Readonly<{
  principal: VaultMarketSharePrincipal; request: unknown; source: VaultMarketSharePosition;
  recipient: VaultMarketSharePosition | null; recipientPositionId: string;
}>) {
  const request = inspectVaultMarketShareTransferRequest(input.request, input.principal), source = position(input.source);
  if (source.accountId !== request.sourceAccountId || source.positionId !== request.positionId || source.marketItemId !== request.marketItemId || source.sourceHeadSha256 !== request.sourceHeadSha256) throw Error("VAULT_MARKET_SHARE_SOURCE_MISMATCH");
  if (!uuid(input.recipientPositionId) || input.recipientPositionId === source.positionId) throw Error("VAULT_MARKET_SHARE_RECIPIENT_MISMATCH");
  const recipient = input.recipient === null ? {...source, positionId: input.recipientPositionId, accountId: request.recipientAccountId, shareQuantityMicro: "0", costBasisUsdCents: "0", costBasisPhiMicro: "0"} : position(input.recipient);
  const terms = ["marketItemId", "marketType", "marketSource", "assetId", "title", "summary", "verifyHref", "externalHref", "visibility"] as const;
  if (recipient.positionId !== input.recipientPositionId || recipient.accountId !== request.recipientAccountId || terms.some(k => recipient[k] !== source[k])) throw Error("VAULT_MARKET_SHARE_RECIPIENT_MISMATCH");
  const owned = BigInt(source.shareQuantityMicro), quantity = BigInt(request.quantityMicro);
  if (quantity > owned) throw Error("VAULT_MARKET_SHARE_INSUFFICIENT_SHARES");
  const split = (v: string) => (quantity === owned ? BigInt(v) : (BigInt(v) * quantity + owned / 2n) / owned).toString();
  const moved = {shareQuantityMicro: quantity.toString(), costBasisUsdCents: split(source.costBasisUsdCents), costBasisPhiMicro: split(source.costBasisPhiMicro)};
  const sourceAfter = {...source}, recipientAfter = {...recipient};
  for (const k of ["shareQuantityMicro", "costBasisUsdCents", "costBasisPhiMicro"] as const) {
    sourceAfter[k] = (BigInt(source[k]) - BigInt(moved[k])).toString();
    const credited = BigInt(recipient[k]) + BigInt(moved[k]);
    if (credited > MAX) throw Error("VAULT_MARKET_SHARE_CAPACITY");
    recipientAfter[k] = credited.toString();
  }
  return Object.freeze({request, moved: Object.freeze(moved), sourceAfter: Object.freeze(sourceAfter), recipientAfter: Object.freeze(recipientAfter)});
}
export type NativeMarketShareVerification=Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;open?(bytes:Uint8Array,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>):Promise<{payloadBytes:Uint8Array;kaiPulse:string;ownerReceizId:string;recordId:string}>}>;
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
async function openNativeMarketOriginal(bytes:Uint8Array,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>,reader?:NativeMarketShareVerification['open']){
 return reader?await reader(bytes,roots):await(async()=>{const value=await createReceizClient().artifacts.verifyAndOpen(new File([new Uint8Array(bytes)],'market-share.receizbundle',{type:'application/vnd.receiz.bundle+json'}));if(value.sealedArtifact.kind!=='receiz.native-record-seal'||value.verifiedPayload.mimeType!=='application/json')fail('ENCLOSING_SOURCE_UNVERIFIED');return{payloadBytes:value.verifiedPayload.bytes,kaiPulse:String(value.verification.bundle?.kaiPulseEternal),ownerReceizId:value.sealedArtifact.continuity.ownerReceizId,recordId:value.sealedArtifact.continuity.recordId};})();
}
async function opened(bytes:Uint8Array,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>,reader?:NativeMarketShareVerification['open']){
 const o=await openNativeMarketOriginal(bytes,roots,reader);
 const raw=new TextDecoder('utf-8',{fatal:true}).decode(o.payloadBytes),v=JSON.parse(raw);if(jcsCanonicalize(v)!==raw)fail('NONCANONICAL');return{v,result:{verification:{bundle:{kaiPulseEternal:o.kaiPulse,nativeRecordSeal:{ownerReceizId:o.ownerReceizId,recordId:o.recordId}}}}};
}

/** Independent financial-source reader: exact enclosing Sources, existing
 * financial issuer admission, predecessor closure, original actor consent and
 * deterministic conservation. Captured account originals are retained and
 * digest-bound by that issuer admission. This reader does not semantically
 * replay each internal account effect; the server complete-source reader does.
 * No server/database/session or old-head currentness claim is required. */
export async function readNativeMarketShareFamily(input:unknown,options:NativeMarketShareVerification={}){
 const packet=structuredClone(input) as NativeMarketShareFamily,roots=options.roots??receizCurrentPinnedSignatureV4Roots();
 if(!shareClosed(packet,['schema','headSourceSha256','sources'])||packet.schema!=='receiz.market-share.source-family.v1'||!shareHex(packet.headSourceSha256)||!Array.isArray(packet.sources))fail('FAMILY_INVALID');
 const blocks=new Map<string,Uint8Array>();for(const source of packet.sources){if(!shareClosed(source,['sha256','exactBytesB64u'])||!shareHex(source.sha256)||typeof source.exactBytesB64u!=='string'||blocks.has(source.sha256))fail('FAMILY_INVALID');const bytes=base64UrlDecode(source.exactBytesB64u);if(base64UrlEncode(bytes)!==source.exactBytesB64u||await sha256Hex(bytes)!==source.sha256)fail('DIGEST_INVALID');blocks.set(source.sha256,bytes);}
 const priorPackets=new Map<string,NativeMarketShareReadChain>(),chains=new Map<string,NativeMarketShareReadChain>(),active=new Set<string>();
 const used=new Set<string>(),read=(d:string)=>{const b=blocks.get(d);if(!b)fail('COMPLETE_SOURCE_REQUIRED');used.add(d);return b!;};
 async function readChain(sourceHead:string):Promise<NativeMarketShareReadChain>{
 const cached=chains.get(sourceHead);if(cached)return cached;if(active.has(sourceHead))fail('SOURCE_CYCLE');active.add(sourceHead);
 const chain:Readonly<{head:string;statement:NativeMarketShareStatement}>[]=[];
 let cursor:string|null=sourceHead;const seen=new Set<string>();
 while(cursor){if(seen.has(cursor))fail('SOURCE_CYCLE');seen.add(cursor);const {v,result}=await opened(read(cursor),roots,options.open);
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
export async function readNativeMarketSharePublicWitness(input:unknown,options:NativeMarketShareVerification={}){
 if(!shareClosed(input,['sha256','exactBytesB64u'])||!shareHex(input.sha256)||typeof input.exactBytesB64u!=='string')fail('PUBLIC_SOURCE_INVALID');
 const bytes=base64UrlDecode(input.exactBytesB64u);if(base64UrlEncode(bytes)!==input.exactBytesB64u||await sha256Hex(bytes)!==input.sha256)fail('DIGEST_INVALID');const roots=options.roots??receizCurrentPinnedSignatureV4Roots(),{v,result}=await opened(bytes,roots,options.open);
 if(!shareClosed(v,['schema','domain','issuerRootKid','lotId','sourceHeadSha256','holderAccountId','recordedAtKaiUPulse','holdings','rootSignature'])||v.schema!=='receiz.market-share.public-witness.v1'||v.domain!==NATIVE_MARKET_SHARE_DOMAIN||!shareHex(v.lotId)||!shareHex(v.sourceHeadSha256)||typeof v.holderAccountId!=='string'||typeof v.recordedAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,39}$/u.test(v.recordedAtKaiUPulse)||!Array.isArray(v.holdings))fail('PUBLIC_SOURCE_INVALID');
 for(const h of v.holdings)if(!shareClosed(h,['accountId','ownerReceizId','positionId','marketItemId','assetId','title','quantityMicro'])||h.accountId!==v.holderAccountId||typeof h.quantityMicro!=='string'||!/^[1-9][0-9]{0,18}$/u.test(h.quantityMicro)||typeof h.ownerReceizId!=='string')fail('PUBLIC_SOURCE_INVALID');
 const record=result.verification.bundle?.nativeRecordSeal as Readonly<{ownerReceizId?:unknown;recordId?:unknown}>|null|undefined,{rootSignature,...payload}=v;if(!record||record.recordId!==`market-share:${await sha256Hex(jcsCanonicalize(payload))}`||v.holdings.some(h=>record.ownerReceizId!==h.ownerReceizId))fail('ENCLOSING_RECORD_MISMATCH');if(!await verifyRoot(payload,rootSignature,roots,v.recordedAtKaiUPulse)||String(result.verification.bundle?.kaiPulseEternal)!==(BigInt(v.recordedAtKaiUPulse)/1000000n).toString())fail('PUBLIC_SOURCE_INVALID');
 return v as unknown as NativeMarketSharePublicWitness;
}

export type VaultMarketIntent=Readonly<{id:string;kind:'deposit'|'send'|'return';positionId:string;marketItemId:string;quantityMicro:string;sourceHead?:string;recipientAccountId?:string}>;
export type VaultMarketPrepared=Readonly<{review:NativeMarketShareReview;challengeB64Url:string}>;
type MarketResult=Readonly<{schema:'receiz.market-share.result.v1';status:'committed'|'pending';originalRequest:VaultMarketShareTransferRequest;source:NativeMarketShareFamily;publicWitness:Readonly<{sha256:string;exactBytesB64u:string}>}>;
type MarketOperation={intent:VaultMarketIntent;actor:'owner'|'vault';prepared:VaultMarketPrepared;consentProof:ReceizIdentityLoginProof;phase:'prepared'|'submitted'|'pending'|'committed';resultRef:string|null;capacityRef:string};
type MarketLot={lotId:string;sourceRef:string;witnessRef:string};
export type VaultMarketState={schema:'bank.vault.market.v1';vaultId:string;operations:MarketOperation[];lots:MarketLot[]};
export type VaultMarketProjection=Readonly<{lotId:string;positionId:string;marketItemId:string;assetId:string|null;title:string;quantityMicro:string;costBasisUsdCents:string;costBasisPhiMicro:string;sourceHead:string;atKaiUPulse:string;recorded:true;operationPending:boolean;publicWitness:MarketResult['publicWitness']}>;
export type VaultMarketPorts=Readonly<{
 vaultId:string;ownerReceizId:string;ownerAccountId:string;ownerKeyId:string;custodyAccountId:string;custodyKeyId:string;
 verification?:NativeMarketShareVerification;
 assertCapacity(reservedSourceBytes:number):Promise<void>;assertOpen():void;lock<T>(work:()=>Promise<T>):Promise<T>;read():Promise<unknown>;write(next:VaultMarketState,previous:unknown):Promise<void>;
 retain(bytes:Uint8Array):Promise<string>;restore(ref:string):Promise<Uint8Array>;
 approve(intent:VaultMarketIntent,reviewDigest:string,review?:NativeMarketShareReview):Promise<void>;backupAndReopen(expected:VaultMarketState):Promise<VaultMarketState>;
 sign(actor:'owner'|'vault',challengeB64Url:string):Promise<ReceizIdentityLoginProof>;
 request(actor:'owner'|'vault',action:'prepare'|'execute'|'recover'|'source',body:Record<string,unknown>):Promise<unknown>;
}>;
const marketJson=(v:unknown)=>new TextEncoder().encode(vaultCanonical(v));
function marketFail(code:string):never{throw Error('VAULT_MARKET_'+code);}
const marketAlias=(v:unknown):v is string=>typeof v==='string'&&/^[a-z0-9][a-z0-9_-]{0,63}\.receiz\.id$/.test(v);
const marketRecipientMatches=(locator:unknown,r:NativeMarketShareReview)=>r.recipient.accountId===r.request.recipientAccountId&&(uuid(locator)?locator===r.request.recipientAccountId:marketAlias(locator)&&(locator===r.recipient.receizId||r.recipient.custody&&locator===`vault-${r.recipient.accountId}.receiz.id`));
function marketIntent(value:unknown):VaultMarketIntent{
 const v=value as VaultMarketIntent;
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['id','kind','positionId','marketItemId','quantityMicro','sourceHead','recipientAccountId'].includes(k))||typeof v.id!=='string'||!/^[A-Za-z0-9._:-]{8,120}$/.test(v.id)||!['deposit','send','return'].includes(v.kind)||!uuid(v.positionId)||!itemId(v.marketItemId)||!integer(v.quantityMicro,true)||v.kind==='deposit'&&v.sourceHead!==undefined||v.kind!=='deposit'&&!shareHex(v.sourceHead)||v.kind==='send'&&!uuid(v.recipientAccountId)&&!marketAlias(v.recipientAccountId)||v.kind!=='send'&&v.recipientAccountId!==undefined)marketFail('INTENT_INVALID');
 return structuredClone(v);
}
function marketPrepared(value:unknown):VaultMarketPrepared{
 const v=vaultObject(value,['review','challengeB64Url']),review=inspectNativeMarketShareReview(v.review);if(v.challengeB64Url!==nativeMarketShareChallenge(review))marketFail('REVIEW_INVALID');return{review,challengeB64Url:v.challengeB64Url as string};
}
export function readVaultMarketState(value:unknown):VaultMarketState{
 const v=vaultObject(value,['schema','vaultId','operations','lots']);if(v.schema!=='bank.vault.market.v1'||typeof v.vaultId!=='string'||!Array.isArray(v.operations)||v.operations.length>512||!Array.isArray(v.lots)||v.lots.length>512)marketFail('STATE_INVALID');
 const ids=new Set<string>(),lots=new Set<string>();let pending=0;
 for(const raw of v.operations){const row=vaultObject(raw,['intent','actor','prepared','consentProof','phase','resultRef','capacityRef']),i=marketIntent(row.intent),p=marketPrepared(row.prepared),r=p.review.request;
  if(!shareHex(row.capacityRef)||ids.has(i.id)||!['owner','vault'].includes(String(row.actor))||!['prepared','submitted','pending','committed'].includes(String(row.phase))||row.resultRef!==null&&!shareHex(row.resultRef)||r.requestId!==i.id||r.positionId!==i.positionId||r.marketItemId!==i.marketItemId||r.quantityMicro!==i.quantityMicro||row.actor!==(i.kind==='deposit'?'owner':'vault')||p.review.kind!==(i.kind==='deposit'?'deposit':'send')||i.kind!=='deposit'&&r.sourceHeadSha256!==i.sourceHead||!shareClosed(row.consentProof,['schema','keyId','alg','challengeB64Url','signatureB64Url'])||row.consentProof.challengeB64Url!==p.challengeB64Url||['pending','committed'].includes(String(row.phase))&&row.resultRef===null||['prepared','submitted'].includes(String(row.phase))&&row.resultRef!==null)marketFail('STATE_INVALID');ids.add(i.id);if(row.phase!=='committed')pending++;
 }
 const operations=v.operations;if(pending>1||operations.some((r,index)=>(r as MarketOperation).phase!=='committed'&&index!==operations.length-1))marketFail('OPERATION_PENDING');
 for(const raw of v.lots){const l=vaultObject(raw,['lotId','sourceRef','witnessRef']);if(![l.lotId,l.sourceRef,l.witnessRef].every(shareHex)||lots.has(String(l.lotId)))marketFail('STATE_INVALID');lots.add(String(l.lotId));}
 return structuredClone(v) as unknown as VaultMarketState;
}
async function verifyMarketResultWithReaders(value:unknown,review:NativeMarketShareReview,consentProof:ReceizIdentityLoginProof,readFamily:(value:unknown)=>ReturnType<typeof readNativeMarketShareFamily>,readWitness:(value:unknown)=>ReturnType<typeof readNativeMarketSharePublicWitness>){
 const v=vaultObject(value,['schema','status','originalRequest','source','publicWitness']);if(v.schema!=='receiz.market-share.result.v1'||!['committed','pending'].includes(String(v.status))||!shareSame(v.originalRequest,review.request))marketFail('RESULT_MISMATCH');
 const source=await readFamily(v.source),s=source.statement,witness=await readWitness(v.publicWitness);
 if(!shareSame(s.review,review)||!shareSame(s.consentProof,consentProof)||v.status!==(s.operation==='release-pending'?'pending':'committed')||review.kind==='deposit'&&s.operation!=='adopt'||review.kind==='send'&&!['send','release-pending','release'].includes(s.operation))marketFail('RESULT_MISMATCH');
 const holder=review.kind==='deposit'?review.recipient.accountId:review.actor.accountId,expected=s.after.holdings.filter(h=>h.accountId===holder).map(h=>({accountId:h.accountId,ownerReceizId:h.ownerReceizId,positionId:h.positionId,marketItemId:h.marketItemId,assetId:h.assetId,title:h.title,quantityMicro:h.shareQuantityMicro}));
 if(witness.sourceHeadSha256!==source.headSourceSha256||witness.lotId!==s.lotId||witness.holderAccountId!==holder||witness.recordedAtKaiUPulse!==s.acceptedAtKaiUPulse||!shareSame(witness.holdings,expected))marketFail('PUBLIC_WITNESS_MISMATCH');
 return{result:structuredClone(v) as unknown as MarketResult,source,witness};
}
export async function verifyVaultMarketResult(value:unknown,review:NativeMarketShareReview,consentProof:ReceizIdentityLoginProof,options:VaultMarketPorts['verification']={}){return verifyMarketResultWithReaders(value,review,consentProof,v=>readNativeMarketShareFamily(v,options),v=>readNativeMarketSharePublicWitness(v,options));}
/** All retained financial originals are flat exact-byte blocks. The descriptors
 * below reconstruct complete native packets; descriptors grant no authority. */
export function createVaultMarket(input:VaultMarketPorts){
 // Cache only enclosing verification of immutable exact bytes under the same
 // complete trust-root set. Every retained block is restored and hash-checked
 // before lookup. Complete family admission also keys all exact packet bytes
 // and roots; current state/owner selection is checked fresh on every read.
 const enclosing=new Map<string,Promise<Awaited<ReturnType<typeof openNativeMarketOriginal>>>>(),baseVerification=input.verification??{},verification:NativeMarketShareVerification={...baseVerification,async open(bytes,roots){const key=await vaultDigest(bytes)+'|'+await vaultDigest(marketJson([...roots].sort(([a],[b])=>a.localeCompare(b))));let found=enclosing.get(key);if(!found){found=openNativeMarketOriginal(bytes,roots,baseVerification.open);enclosing.set(key,found);void found.catch(()=>enclosing.delete(key));}return structuredClone(await found);}};

 const familyAdmissions=new Map<string,ReturnType<typeof readNativeMarketShareFamily>>(),witnessAdmissions=new Map<string,ReturnType<typeof readNativeMarketSharePublicWitness>>();
 async function admissionKey(value:unknown){return await vaultDigest(marketJson(value))+'|'+await vaultDigest(marketJson([...(verification.roots??receizCurrentPinnedSignatureV4Roots())].sort(([a],[b])=>a.localeCompare(b))));}
 async function admittedFamily(value:unknown){const key=await admissionKey(value);let admitted=familyAdmissions.get(key);if(!admitted){admitted=readNativeMarketShareFamily(value,verification);familyAdmissions.set(key,admitted);void admitted.catch(()=>familyAdmissions.delete(key));}return admitted;}
 async function admittedWitness(value:unknown){const key=await admissionKey(value);let admitted=witnessAdmissions.get(key);if(!admitted){admitted=readNativeMarketSharePublicWitness(value,verification);witnessAdmissions.set(key,admitted);void admitted.catch(()=>witnessAdmissions.delete(key));}return admitted;}
 const admittedResult=(value:unknown,review:NativeMarketShareReview,proof:ReceizIdentityLoginProof)=>verifyMarketResultWithReaders(value,review,proof,admittedFamily,admittedWitness);
 async function retain(bytes:Uint8Array){const exact=new Uint8Array(bytes),d=await input.retain(exact);input.assertOpen();if(await vaultDigest(exact)!==d)marketFail('SOURCE_CHANGED');return d;}
 async function restore(d:string){const exact=new Uint8Array(await input.restore(d));input.assertOpen();if(await vaultDigest(exact)!==d)marketFail('SOURCE_CHANGED');return exact;}
 const decode=(b:Uint8Array)=>{const text=new TextDecoder('utf-8',{fatal:true}).decode(b),v=JSON.parse(text);if(vaultCanonical(v)!==text)marketFail('NONCANONICAL');return v;};
 function check(row:MarketOperation){const r=row.prepared.review,keyId=row.actor==='owner'?r.actor.keyId:input.custodyKeyId,actor=row.actor==='owner'?input.ownerAccountId:input.custodyAccountId,recipient=row.intent.kind==='deposit'?input.custodyAccountId:row.intent.kind==='return'?input.ownerAccountId:row.intent.recipientAccountId;
  if(r.actor.accountId!==actor||r.actor.receizId!==input.ownerReceizId||r.actor.keyId!==keyId||r.request.applicationId!==BANK_APPLICATION_ID||!marketRecipientMatches(recipient,r)||r.request.sourceAccountId!==actor||row.consentProof.keyId!==keyId||row.intent.kind==='deposit'&&!r.recipient.custody||row.intent.kind==='return'&&r.recipient.custody)marketFail('CUSTODY_MISMATCH');return r;
 }
 async function saveFamily(packet:NativeMarketShareFamily){for(const block of packet.sources){const d=await retain(vaultBytes(block.exactBytesB64u,23*1024*1024));if(d!==block.sha256)marketFail('SOURCE_CHANGED');}return retain(marketJson({schema:'bank.vault.market-source.v1',headSourceSha256:packet.headSourceSha256,sources:packet.sources.map(b=>b.sha256)}));}
 async function openFamily(ref:string){const v=vaultObject(decode(await restore(ref)),['schema','headSourceSha256','sources']);if(v.schema!=='bank.vault.market-source.v1'||!shareHex(v.headSourceSha256)||!Array.isArray(v.sources)||!v.sources.every(shareHex)||new Set(v.sources).size!==v.sources.length)marketFail('SOURCE_INVALID');return{schema:'receiz.market-share.source-family.v1' as const,headSourceSha256:v.headSourceSha256,sources:await Promise.all(v.sources.map(async d=>({sha256:d as string,exactBytesB64u:vaultBase64(await restore(d as string))})))};}
 async function saveResult(result:MarketResult){const sourceRef=await saveFamily(result.source),witnessRef=await retain(vaultBytes(result.publicWitness.exactBytesB64u,23*1024*1024));if(witnessRef!==result.publicWitness.sha256)marketFail('SOURCE_CHANGED');const ref=await retain(marketJson({schema:'bank.vault.market-result.v1',status:result.status,originalRequest:result.originalRequest,sourceRef,witnessRef}));return{ref,sourceRef,witnessRef};}
 async function openResult(ref:string){const v=vaultObject(decode(await restore(ref)),['schema','status','originalRequest','sourceRef','witnessRef']);if(v.schema!=='bank.vault.market-result.v1'||![v.sourceRef,v.witnessRef].every(shareHex))marketFail('SOURCE_INVALID');return{schema:'receiz.market-share.result.v1' as const,status:v.status,originalRequest:v.originalRequest,source:await openFamily(v.sourceRef as string),publicWitness:{sha256:v.witnessRef,exactBytesB64u:vaultBase64(await restore(v.witnessRef as string))}};}
 async function load(){input.assertOpen();const previous=await input.read();input.assertOpen();const state=previous===null?{schema:'bank.vault.market.v1' as const,vaultId:input.vaultId,operations:[],lots:[]}:readVaultMarketState(previous);if(state.vaultId!==input.vaultId)marketFail('CUSTODY_MISMATCH');return{state,previous};}
 async function admission(state:VaultMarketState){
  const admittedLots=new Map<string,Awaited<ReturnType<typeof readNativeMarketShareFamily>>>(),witnesses=new Map<string,MarketResult['publicWitness']>();
  for(const lot of state.lots){const packet=await openFamily(lot.sourceRef),source=await admittedFamily(packet),publicWitness={sha256:lot.witnessRef,exactBytesB64u:vaultBase64(await restore(lot.witnessRef))},w=await admittedWitness(publicWitness);
   if(source.statement.lotId!==lot.lotId||w.lotId!==lot.lotId||w.sourceHeadSha256!==source.headSourceSha256||w.holderAccountId!==input.custodyAccountId||w.recordedAtKaiUPulse!==source.statement.acceptedAtKaiUPulse||w.holdings.some(h=>h.ownerReceizId!==input.ownerReceizId)||!shareSame(w.holdings,source.state.holdings.filter(h=>h.accountId===input.custodyAccountId).map(h=>({accountId:h.accountId,ownerReceizId:h.ownerReceizId,positionId:h.positionId,marketItemId:h.marketItemId,assetId:h.assetId,title:h.title,quantityMicro:h.shareQuantityMicro}))))marketFail('SOURCE_MISMATCH');
   for(const h of source.state.holdings)if(h.accountId===input.custodyAccountId&&h.ownerReceizId!==input.ownerReceizId)marketFail('OWNER_MISMATCH');admittedLots.set(lot.lotId,source);witnesses.set(lot.lotId,publicWitness);
  }
  for(const source of admittedLots.values())for(const op of source.allOperations){const selected=admittedLots.get(op.statement.lotId);if(selected&&!selected.chain.some(s=>s.head===op.head))marketFail('KNOWN_SOURCE_CONSUMPTION_CONFLICT');}
  for(const row of state.operations){const review=check(row);await readNativeMarketShareCapacity(await capacityOriginal(row),review,verification);await verifyNativeMarketShareConsent(review,row.consentProof);if(!row.resultRef)continue;const accepted=await admittedResult(await openResult(row.resultRef),review,row.consentProof);checkCapacityBinding(accepted.source,row);const lot=admittedLots.get(accepted.source.statement.lotId);if(accepted.result.status!==row.phase||!lot||!lot.chain.some(s=>s.head===accepted.source.headSourceSha256))marketFail('SOURCE_ANCESTRY_CONFLICT');}
  input.assertOpen();return{admittedLots,witnesses};
 }
 async function expand(response:unknown,row:MarketOperation):Promise<unknown>{
  if((response as {schema?:unknown})?.schema!=='receiz.market-share.result-source.v1')return response;
  const d=vaultObject(response,['schema','requestId','resultSha256','root','status','originalRequest','publicWitness','exactBytesB64u']);if(d.requestId!==row.intent.id||!shareHex(d.resultSha256)||d.exactBytesB64u!==null||!shareSame(d.originalRequest,row.prepared.review.request))marketFail('RESULT_MISMATCH');const root=parseExactByteBlockReference(d.root);
  const bytes=await reconstructExactByteBlocks(root,async(reference:ExactByteBlockReference)=>{input.assertOpen();const b=vaultObject(await input.request(row.actor,'source',{requestId:row.intent.id,block:reference}),['schema','requestId','resultSha256','root','status','originalRequest','publicWitness','exactBytesB64u','block']);input.assertOpen();if(b.schema!==d.schema||b.requestId!==d.requestId||b.resultSha256!==d.resultSha256||!shareSame(b.root,d.root)||!shareSame(b.block,reference))marketFail('SOURCE_CHANGED');return vaultBytes(b.exactBytesB64u,1024*1024);},{component:'bank-vault-market-recovery',maxContentBytes:32*1024*1024,maxBlockReads:4096});input.assertOpen();if(await vaultDigest(bytes)!==d.resultSha256)marketFail('SOURCE_CHANGED');return decode(bytes);
 }
 function checkCapacityBinding(source:Awaited<ReturnType<typeof readNativeMarketShareFamily>>,row:MarketOperation){const same=source.chain.filter(o=>shareSame(o.statement.review,row.prepared.review));if(!same.length||same.some(o=>!o.statement.evidence.includes(row.capacityRef)))marketFail('CAPACITY_SOURCE_MISMATCH');}
 async function capacityOriginal(row:MarketOperation){return{sha256:row.capacityRef,exactBytesB64u:vaultBase64(await restore(row.capacityRef))};}
 async function reserved(row:MarketOperation){return readNativeMarketShareCapacity(await capacityOriginal(row),row.prepared.review,verification);}
 async function run(request?:VaultMarketIntent){
  let held=await load();await admission(held.state);let row=held.state.operations.at(-1);
  const save=async()=>{const selected=row?.intent.id;await input.write(held.state,held.previous);input.assertOpen();held=await load();if(selected)row=held.state.operations.find(o=>o.intent.id===selected);};
  if(request){request=marketIntent(request);const old=held.state.operations.find(o=>o.intent.id===request!.id);if(old){if(!shareSame(old.intent,request))marketFail('EXACT_RESUME_REQUIRED');row=old;}else{
   if(row&&row.phase!=='committed')marketFail('OPERATION_PENDING');const actor=request.kind==='deposit'?'owner':'vault',recipientAccountId=request.kind==='deposit'?input.custodyAccountId:request.kind==='return'?input.ownerAccountId:request.recipientAccountId!,body={kind:request.kind==='deposit'?'deposit':'send',requestId:request.id,positionId:request.positionId,marketItemId:request.marketItemId,quantityMicro:request.quantityMicro,recipientAccountId,...(request.kind==='deposit'?{}:{sourceHeadSha256:request.sourceHead})};
   if(actor==='vault'){const admitted=await admission(held.state);if(![...admitted.admittedLots.values()].some(s=>s.headSourceSha256===request!.sourceHead&&s.state.holdings.some(h=>h.accountId===input.custodyAccountId&&h.positionId===request!.positionId&&h.marketItemId===request!.marketItemId&&BigInt(h.shareQuantityMicro)>=BigInt(request!.quantityMicro))))marketFail('CURRENT_SOURCE_REQUIRED');}
   await input.assertCapacity(marketJson(body).length);input.assertOpen();const preparedResponse=vaultObject(await input.request(actor,'prepare',body),['review','challengeB64Url','reservation']),prepared=marketPrepared({review:preparedResponse.review,challengeB64Url:preparedResponse.challengeB64Url});input.assertOpen();const capacity=await readNativeMarketShareCapacity(preparedResponse.reservation,prepared.review,verification);await input.assertCapacity(capacity.reservedSourceBytes);input.assertOpen();const maximumBody={review:prepared.review,consentProof:{schema:'receiz.identity.login_proof.v1',keyId:prepared.review.actor.keyId,alg:prepared.review.actor.alg,challengeB64Url:prepared.challengeB64Url,signatureB64Url:'a'.repeat(86)},reservation:preparedResponse.reservation};if(marketJson(maximumBody).length>MARKET_SHARE_EXECUTE_MAX_BYTES)marketFail('REQUEST_CAPACITY');const r=prepared.review.request;if(r.requestId!==body.requestId||r.positionId!==body.positionId||r.marketItemId!==body.marketItemId||r.quantityMicro!==body.quantityMicro||!marketRecipientMatches(recipientAccountId,prepared.review)||prepared.review.kind!==body.kind||request.kind!=='deposit'&&r.sourceHeadSha256!==request.sourceHead)marketFail('REVIEW_INVALID');
   if(prepared.review.actor.accountId!==(actor==='owner'?input.ownerAccountId:input.custodyAccountId)||prepared.review.actor.receizId!==input.ownerReceizId||prepared.review.actor.keyId!==(actor==='owner'?input.ownerKeyId:input.custodyKeyId)||r.sourceAccountId!==prepared.review.actor.accountId||r.applicationId!==BANK_APPLICATION_ID||request.kind==='deposit'&&!prepared.review.recipient.custody||request.kind==='return'&&prepared.review.recipient.custody)marketFail('REVIEW_INVALID');
   await input.approve(request,await vaultDigest(marketJson(prepared.review)),prepared.review);input.assertOpen();const consentProof=structuredClone(await input.sign(actor,prepared.challengeB64Url));input.assertOpen();const reservation=vaultObject(preparedResponse.reservation,['sha256','exactBytesB64u']),capacityRef=await retain(vaultBytes(reservation.exactBytesB64u,23*1024*1024));if(capacityRef!==reservation.sha256)marketFail('CAPACITY_CHANGED');row={intent:request,actor,prepared,consentProof,phase:'prepared',resultRef:null,capacityRef};check(row);await verifyNativeMarketShareConsent(prepared.review,consentProof);held.state.operations.push(row);await save();
  }}
  if(!row)return null;const selected=row.intent.id,review=check(row);if(row.phase==='committed')return{status:'committed' as const,operationId:selected};
  async function reopen(){const reopened=readVaultMarketState(await input.backupAndReopen(structuredClone(held.state)));input.assertOpen();if(!shareSame(reopened,held.state))marketFail('EXACT_ORIGINAL_REQUIRED');}
  async function execute(){await input.assertCapacity((await reserved(row!)).reservedSourceBytes);input.assertOpen();let response:unknown;try{response=await input.request(row!.actor,'execute',{review:row!.prepared.review,consentProof:row!.consentProof,reservation:await capacityOriginal(row!)});}catch{input.assertOpen();return{status:'unknown' as const,operationId:selected};}return accept(response);}
  if(row.phase==='prepared'){await reopen();row.phase='submitted';await save();row=held.state.operations.find(o=>o.intent.id===selected)!;return execute();}
  await input.assertCapacity((await reserved(row)).reservedSourceBytes);input.assertOpen();let recovered:unknown;try{recovered=await input.request(row.actor,'recover',{requestId:selected});}catch{input.assertOpen();return{status:'unknown' as const,operationId:selected};}input.assertOpen();if(shareClosed(recovered,['schema','status'])&&recovered.schema==='receiz.market-share.result.v1'&&recovered.status==='unknown'){await reopen();return execute();}return accept(recovered);
  async function accept(response:unknown){input.assertOpen();const expanded=await expand(response,row!);if(marketJson(expanded).length>(await reserved(row!)).resultMaxBytes)marketFail('SOURCE_CAPACITY');const accepted=await admittedResult(expanded,review,row!.consentProof);checkCapacityBinding(accepted.source,row!);input.assertOpen();const saved=await saveResult(accepted.result),lotId=accepted.source.statement.lotId,old=held.state.lots.find(l=>l.lotId===lotId);if(old){const predecessor=await admittedFamily(await openFamily(old.sourceRef));if(!accepted.source.chain.some(s=>s.head===predecessor.headSourceSha256))marketFail('SOURCE_ANCESTRY_CONFLICT');}
   row=held.state.operations.find(o=>o.intent.id===selected)!;row.phase=accepted.result.status;row.resultRef=saved.ref;held.state.lots=held.state.lots.filter(l=>l.lotId!==lotId);held.state.lots.push({lotId,sourceRef:saved.sourceRef,witnessRef:saved.witnessRef});await save();return{status:accepted.result.status,operationId:selected};}
 }
 return Object.freeze({move:(request:VaultMarketIntent)=>input.lock(()=>run(request)),resume:()=>input.lock(()=>run()),async holdings(){const held=await load(),admitted=await admission(held.state),projections:VaultMarketProjection[]=[],operationPending=held.state.operations.some(o=>o.phase!=='committed');for(const[lotId,s]of admitted.admittedLots)for(const h of s.state.holdings)if(h.accountId===input.custodyAccountId)projections.push({lotId,positionId:h.positionId,marketItemId:h.marketItemId,assetId:h.assetId,title:h.title,quantityMicro:h.shareQuantityMicro,costBasisUsdCents:h.costBasisUsdCents,costBasisPhiMicro:h.costBasisPhiMicro,sourceHead:s.headSourceSha256,atKaiUPulse:s.statement.acceptedAtKaiUPulse,recorded:true,operationPending,publicWitness:admitted.witnesses.get(lotId)!});return projections;},async admit(){const held=await load();await admission(held.state);return structuredClone(held.state);}});
}

/** Exact immutable closure lengths plus maxima of CLOSED accepted successor
 * fields. No buffers or placeholder arrays proportional to a budget exist. */
export const MARKET_SHARE_EXECUTE_MAX_BYTES=2*1024*1024;
export const MARKET_SHARE_PRIVATE_MAX_BYTES=32*1024*1024;
export const MARKET_SHARE_METADATA_MAX_BYTES=65536+128;
export type NativeMarketShareCapacityMetrics=Readonly<{retainedSources:readonly Readonly<{sha256:string;byteLength:number}>[];newOriginalMaxBytes:readonly number[];futureFamilyCount:number;preparedMaxBytes:number;providerExportMaxBytes:number;creditMaxBytes:number;statementPayloadMaxBytes:number}>;
const capacitySize=(v:unknown)=>new TextEncoder().encode(jcsCanonicalize(v)).length,capacityHash='f'.repeat(64),capacityB64=(n:number)=>Math.ceil(n*4/3),capacityBlock=(n:number)=>capacityB64(n)+capacitySize({sha256:capacityHash,exactBytesB64u:''})+1;
export function nativeMarketShareCapacityBudget(m:NativeMarketShareCapacityMetrics){
 if(!Array.isArray(m.retainedSources)||new Set(m.retainedSources.map(s=>s.sha256)).size!==m.retainedSources.length||m.retainedSources.some(s=>!/^[a-f0-9]{64}$/.test(s.sha256)||!Number.isSafeInteger(s.byteLength)||s.byteLength<=0)||!Array.isArray(m.newOriginalMaxBytes)||!m.newOriginalMaxBytes.length||m.newOriginalMaxBytes.length>6||![1,2].includes(m.futureFamilyCount)||![m.preparedMaxBytes,m.providerExportMaxBytes,m.creditMaxBytes,m.statementPayloadMaxBytes,...m.newOriginalMaxBytes].every(n=>Number.isSafeInteger(n)&&n>=0)||m.newOriginalMaxBytes.some(n=>n<=0||n>23*1024*1024))throw Error('NATIVE_MARKET_SHARE_CAPACITY_INVALID');
 const closure=m.retainedSources.reduce((sum,s)=>sum+capacityBlock(s.byteLength),0),future=m.newOriginalMaxBytes.reduce((sum,n)=>sum+capacityBlock(n),0),count=m.retainedSources.length+m.newOriginalMaxBytes.length;
 const familyDescriptor=capacitySize({schema:'bank.vault.market-source.v1',headSourceSha256:capacityHash,sources:[]})+count*(capacitySize(capacityHash)+1),requestDescriptor=capacitySize({schema:'bank.vault.market-result.v1',status:'committed',originalRequest:{schema:'receiz.vault.market-share-transfer.v1',applicationId:'r'.repeat(131),requestId:'r'.repeat(120),sourceAccountId:'r'.repeat(36),recipientAccountId:'r'.repeat(36),positionId:'r'.repeat(36),marketItemId:'\0'.repeat(240),sourceHeadSha256:capacityHash,quantityMicro:'9'.repeat(19)},sourceRef:capacityHash,witnessRef:capacityHash});
 const resultMaxBytes=closure+future+capacityB64(m.newOriginalMaxBytes.at(-1)!)+requestDescriptor;
 const reservedSourceBytes=closure+future+m.futureFamilyCount*(capacityBlock(familyDescriptor)+capacityBlock(requestDescriptor))+m.preparedMaxBytes+capacitySize({lotId:capacityHash,sourceRef:capacityHash,witnessRef:capacityHash})+4;
 if(!Number.isSafeInteger(reservedSourceBytes)||resultMaxBytes>MARKET_SHARE_PRIVATE_MAX_BYTES||reservedSourceBytes>MARKET_SHARE_PRIVATE_MAX_BYTES)throw Error('NATIVE_MARKET_SHARE_SOURCE_CAPACITY');return{resultMaxBytes,reservedSourceBytes};
}

export type NativeMarketShareCapacity=NativeMarketShareCapacityMetrics&Readonly<{schema:'receiz.market-share.capacity.v1';domain:typeof NATIVE_MARKET_SHARE_DOMAIN;issuerRootKid:string;reviewSha256:string;sourceHeadSha256:string;authorizations:readonly NativeMarketShareAuthorization[];priorSourceFamilies:readonly NativeMarketSharePriorSource[];issuedAtKaiUPulse:string;resultMaxBytes:number;reservedSourceBytes:number;rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export async function readNativeMarketShareCapacity(input:unknown,review:NativeMarketShareReview,options:NativeMarketShareVerification={}){
 if(!shareClosed(input,['sha256','exactBytesB64u'])||!shareHex(input.sha256)||typeof input.exactBytesB64u!=='string')fail('CAPACITY_REQUIRED');const bytes=base64UrlDecode(input.exactBytesB64u);if(base64UrlEncode(bytes)!==input.exactBytesB64u||await sha256Hex(bytes)!==input.sha256)fail('CAPACITY_DIGEST_INVALID');const roots=options.roots??receizCurrentPinnedSignatureV4Roots(),{v,result}=await opened(bytes,roots,options.open);
 if(!shareClosed(v,['schema','domain','issuerRootKid','reviewSha256','sourceHeadSha256','authorizations','priorSourceFamilies','issuedAtKaiUPulse','retainedSources','newOriginalMaxBytes','futureFamilyCount','preparedMaxBytes','providerExportMaxBytes','creditMaxBytes','statementPayloadMaxBytes','resultMaxBytes','reservedSourceBytes','rootSignature'])||v.schema!=='receiz.market-share.capacity.v1'||v.domain!==NATIVE_MARKET_SHARE_DOMAIN||v.reviewSha256!==await sha256Hex(jcsCanonicalize(review))||v.sourceHeadSha256!==review.request.sourceHeadSha256||typeof v.issuedAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,39}$/.test(v.issuedAtKaiUPulse))fail('CAPACITY_INVALID');const c=v as unknown as NativeMarketShareCapacity,expected=nativeMarketShareCapacityBudget(c),{rootSignature,...payload}=v,record=result.verification.bundle?.nativeRecordSeal as {ownerReceizId:string;recordId:string};if(!record||record.ownerReceizId!==review.actor.receizId||record.recordId!==`market-share:${await sha256Hex(jcsCanonicalize(payload))}`||!await verifyRoot(payload,rootSignature,roots,c.issuedAtKaiUPulse)||String(result.verification.bundle?.kaiPulseEternal)!==(BigInt(c.issuedAtKaiUPulse)/1000000n).toString()||!shareSame(expected,{resultMaxBytes:c.resultMaxBytes,reservedSourceBytes:c.reservedSourceBytes}))fail('CAPACITY_UNVERIFIED');return c;
}
