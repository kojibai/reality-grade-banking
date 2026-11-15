import {sha256ReceizBytes} from './artifacts.js';
import {receizBase64UrlDecode as decode,receizBase64UrlEncode as encode,verifyReceizIdentityPublicKeyProjectionSignature,type ReceizIdentityLoginProof} from './identity.js';
import {canonicalizeReceizV122 as canonical} from './v122Canonical.js';
import {readReceizAccountFinancialSourceCustody,type ReceizAccountFinancialSource} from './accountFinancialSource.js';
import {readReceizAccountFinancialOperationCustody,type ReceizVerifiedAccountFinancialOperation} from './accountFinancialCommit.js';
import {accountFinancialMarketPositionDelta,type ReceizAccountFinancialState,type ReceizAccountMarketAction} from './accountFinancialExecution.js';
import {marketNotionalPhiMicroFromUsdCents,marketShareSellPreviewFromBudgetUsdCentsAtBid} from './accountFinancialMath.generated.js';

type RecordValue=Record<string,unknown>;
type Reservation=Readonly<{kind:'money';amountUsdCents:string}>|Readonly<{kind:'shares';shareQuantityMicro:string}>;
type Parent=Readonly<{source:ReceizAccountFinancialSource;predecessor?:ReceizVerifiedAccountFinancialOperation|null}>;
type Command=Readonly<{
 schema:'receiz.account-market-order-request.v1';orderId:string;
 sourceArtifactSha256:string;allocationId:string;applicationId:string;
 accountUserId:string;ownerReceizId:string;predecessorArtifactSha256:string;
 predecessorOperationId:string|null;orderKaiUPulse:string;action:ReceizAccountMarketAction;
 assetArtifactSha256:string;limitExecutionPriceUsdCents:string;reservation:Reservation;
}>;
export type ReceizVerifiedAccountMarketOrderRequest=Command&Readonly<{status:'verified-market-order-request';artifactSha256:string}>;
const originals=new WeakMap<ReceizVerifiedAccountMarketOrderRequest,Uint8Array>();
const utf8=new TextEncoder(),MAX=(1n<<63n)-1n,UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
const fields=['schema','orderId','sourceArtifactSha256','allocationId','applicationId','accountUserId','ownerReceizId','predecessorArtifactSha256','predecessorOperationId','orderKaiUPulse','action','assetArtifactSha256','limitExecutionPriceUsdCents','reservation']as const;
function fail(code:string):never{throw new TypeError('ORDER_REQUEST_'+code);}
function exact(value:unknown,keys:readonly string[]):RecordValue{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))fail('FIELDS');
 return value as RecordValue;
}
function uint(value:unknown,positive=false){if(typeof value!=='string'||!/^(0|[1-9][0-9]{0,18})$/u.test(value))fail('INTEGER');const n=BigInt(value);if(n>MAX||n<(positive?1n:0n))fail('INTEGER');return n;}
function b64(value:unknown,length?:number){if(typeof value!=='string')fail('ENCODING');const bytes=decode(value);if(encode(bytes)!==value||length!==undefined&&bytes.length!==length)fail('ENCODING');return bytes;}
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const nested of Object.values(value))freeze(nested);Object.freeze(value);}return value;}
const ownerChallenge=(command:Command)=>'receiz.account-market-order-request.owner.v1\0'+canonical(command);
const recordChallenge=(command:Command,ownerConsent:ReceizIdentityLoginProof)=>utf8.encode('receiz.account-market-order-request.custody.v1\0'+canonical({command,ownerConsent}));

/** A request binds an intention, not a financial effect. Actual reservation and
 * fills must independently consume their funded predecessor under the native
 * financial writer. This function neither grants funds nor accepts an order. */
function commandFor(input:Parent&Readonly<{orderId:string;action:ReceizAccountMarketAction;orderKaiUPulse:string}>):Command{
 const{source,predecessor}=input,custody=readReceizAccountFinancialSourceCustody(source);
 if(predecessor&&readReceizAccountFinancialOperationCustody(predecessor).sourceSha256!==source.artifactSha256)fail('PARENT');
 const state=predecessor?.nextState??custody.body.initialState as ReceizAccountFinancialState;
 const program=custody.body.program as {applicationId:string;validFromKaiUPulse:string;expiresAtKaiUPulse:string;marketTerms:readonly{marketItemId:string;sourceArtifactSha256:string}[]};
 const at=uint(input.orderKaiUPulse,true);
 if(at<=uint(state.lastKaiUPulse)||at<uint(program.validFromKaiUPulse,true)||at>uint(program.expiresAtKaiUPulse,true))fail('PULSE');
 if(typeof input.orderId!=='string'||!UUID.test(input.orderId))fail('ID');
 const action=structuredClone(input.action);
 if(!action||!['buy','sell'].includes(action.kind)||typeof action.marketItemId!=='string'||(action.amountUsdCents===undefined)===(action.shareQuantityMicro===undefined)||action.kind==='buy'&&action.amountUsdCents===undefined)fail('ACTION');
 exact(action,['kind','marketItemId',...(action.amountUsdCents!==undefined?['amountUsdCents']:['shareQuantityMicro'])]);
 const term=program.marketTerms.find(row=>row.marketItemId===action.marketItemId);if(!term)fail('PRICING_REQUIRED');
 const position=state.positions.find(row=>row.marketItemId===action.marketItemId),held=uint(position?.shareQuantityMicro??'0');
 const quote=custody.marketPricingAt(action.marketItemId,accountFinancialMarketPositionDelta(source,state,action.marketItemId),state.marketActivity?.find(row=>row.marketItemId===action.marketItemId)?.trades??[],input.orderKaiUPulse);
 if(!quote)fail('PRICING_REQUIRED');
 let reservation:Reservation;
 if(action.kind==='buy'){
  const budget=uint(action.amountUsdCents,true),wallet=custody.valuation.at(state.walletLedger,source.accountUserId,input.orderKaiUPulse);
  if(budget>uint(wallet.marketAvailableUsdCents)||marketNotionalPhiMicroFromUsdCents(budget,uint(wallet.usdPerPhiMicrocents,true))<=0n)fail('FUNDING');
  reservation={kind:'money',amountUsdCents:String(budget)};
 }else{
  const quantity=action.shareQuantityMicro!==undefined?uint(action.shareQuantityMicro,true):marketShareSellPreviewFromBudgetUsdCentsAtBid(uint(action.amountUsdCents,true),quote.bidPriceUsdCents,quote.referenceMidUsdCents,held).shareQuantityMicro;
  if(quantity<=0n||quantity>held)fail('OWNERSHIP');
  reservation={kind:'shares',shareQuantityMicro:String(quantity)};
 }
 return freeze({schema:'receiz.account-market-order-request.v1',orderId:input.orderId,sourceArtifactSha256:source.artifactSha256,allocationId:source.allocationId,applicationId:program.applicationId,accountUserId:source.accountUserId,ownerReceizId:source.ownerReceizId,predecessorArtifactSha256:predecessor?.artifactSha256??source.artifactSha256,predecessorOperationId:predecessor?.operationId??null,orderKaiUPulse:input.orderKaiUPulse,action,assetArtifactSha256:term.sourceArtifactSha256,limitExecutionPriceUsdCents:String(action.kind==='buy'?quote.askPriceUsdCents:quote.bidPriceUsdCents),reservation});
}

/** Historical request verification is independent of the current clock. Its
 * original Kai is retained; future fills have their own execution coordinates.
 * A verified request still supplies no reservation, fill or accepted balance. */
export async function admitReceizAccountMarketOrderRequest(input:Uint8Array,options:Parent):Promise<ReceizVerifiedAccountMarketOrderRequest>{
 const custody=readReceizAccountFinancialSourceCustody(options.source);
 if(!(input instanceof Uint8Array)||input.length<1||input.length>65536)fail('BYTES');
 const bytes=input.slice(),raw=new TextDecoder('utf-8',{fatal:true}).decode(bytes),body=exact(JSON.parse(raw),[...fields,'ownerConsent','custodianSignature']);
 if(canonical(body)!==raw)fail('CANONICAL');
 if(body.predecessorArtifactSha256!==(options.predecessor?.artifactSha256??options.source.artifactSha256)||body.predecessorOperationId!==(options.predecessor?.operationId??null))fail('PARENT');
 const command=commandFor({...options,orderId:body.orderId as string,action:body.action as ReceizAccountMarketAction,orderKaiUPulse:body.orderKaiUPulse as string});
 if(canonical(Object.fromEntries(fields.map(key=>[key,body[key]])))!==canonical(command))fail('BOUND');
 const program=custody.body.program as {identity:{keyId:string;alg:'Ed25519'|'P-256';publicKeyRawB64u:string};custodian:{publicKeyRawB64u:string}};
 const proof=exact(body.ownerConsent,['schema','keyId','alg','challengeB64Url','signatureB64Url'])as ReceizIdentityLoginProof;
 if(proof.schema!=='receiz.identity.login_proof.v1'||proof.keyId!==program.identity.keyId||proof.alg!==program.identity.alg||proof.challengeB64Url!==encode(utf8.encode(ownerChallenge(command)))||!await verifyReceizIdentityPublicKeyProjectionSignature({...program.identity,challengeB64Url:proof.challengeB64Url,signatureB64Url:proof.signatureB64Url}))fail('OWNER_CONSENT');
 const key=await crypto.subtle.importKey('raw',b64(program.custodian.publicKeyRawB64u,32).slice().buffer,'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',key,b64(body.custodianSignature,64).slice().buffer,recordChallenge(command,proof)))fail('RECORD_SIGNER');
 const accepted=freeze({...command,status:'verified-market-order-request'as const,artifactSha256:await sha256ReceizBytes(bytes)});
 originals.set(accepted,bytes);return accepted;
}

export async function createReceizAccountMarketOrderRequest(input:Parent&Readonly<{orderId:string;action:ReceizAccountMarketAction;orderKaiUPulse:string;signOwner(challenge:string):Promise<ReceizIdentityLoginProof>;signRecord(bytes:Uint8Array):Promise<Uint8Array>}>):Promise<ReceizVerifiedAccountMarketOrderRequest>{
 const parent={source:input.source,predecessor:input.predecessor??null},command=commandFor({...parent,orderId:input.orderId,action:input.action,orderKaiUPulse:input.orderKaiUPulse});
 const{signOwner,signRecord}=input;
 const ownerConsent=await signOwner(ownerChallenge(command));
 const custodianSignature=encode(await signRecord(recordChallenge(command,ownerConsent)));
 return admitReceizAccountMarketOrderRequest(utf8.encode(canonical({...command,ownerConsent,custodianSignature})),parent);
}

export function exportReceizAccountMarketOrderRequest(request:ReceizVerifiedAccountMarketOrderRequest):Uint8Array{
 const bytes=originals.get(request);if(!bytes)fail('CUSTODY_REQUIRED');return bytes.slice();
}
