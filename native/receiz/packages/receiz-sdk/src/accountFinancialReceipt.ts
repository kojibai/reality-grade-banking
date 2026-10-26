import{canonicalizeReceizV122 as canonical}from './v122Canonical.js';
import{receizBase64UrlDecode as decode,receizBase64UrlEncode as encode}from './identity.js';
import{receizCurrentPinnedSignatureV4Roots}from './verifier/roots.js';
import type{ReceizSignatureV4RootPublicKey}from './verifier/signatureV4.js';
import{microPulsesSinceGenesisEpochMsV124}from './v124KaiBridge.generated.js';
/** Existing protected financial-root context; schema and purpose remain signed.
 * A read-only receipt is never an allocation or a spendable Account Source. */
export const RECEIZ_ACCOUNT_FINANCIAL_ROOT_CONTEXT='receiz.bank.offline-reserve.v129';
type FinancialReceiptFacts=Readonly<{rights:'read-only';issuerRootKid:string;issuedAtMs:number;operationId:string;financialOriginalSha256:string;fundingSourceSha256:string;atKaiUPulse:string;ownerReceizId:string;effect:Readonly<Record<string,string>>;financialRootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>}>;
export type ReceizAccountFinancialReceipt=FinancialReceiptFacts&Readonly<{schema:'receiz.account-financial-receipt.v1';receivedAt?:never;receivedAtKaiUPulse?:never}|{schema:'receiz.account-financial-receipt.v2';receivedAt:string;receivedAtKaiUPulse:string}>;
const SHA=/^[a-f0-9]{64}$/u,UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u,ID=/^[-a-z0-9_]+\.receiz\.id$/u;
const common=['kind','settlementUsdCents','settlementPhiMicro','usdPerPhiMicrocents','settledUsdCents','ecosystemUsdCents'];
const fields=['schema','rights','issuerRootKid','issuedAtMs','operationId','financialOriginalSha256','fundingSourceSha256','atKaiUPulse','ownerReceizId','effect','financialRootSignature'];
function fail():never{throw Error('ACCOUNT_FINANCIAL_RECEIPT_INVALID');}
function exact(v:unknown,keys:readonly string[]){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||keys.some(k=>!Object.hasOwn(v,k)))fail();return v as Record<string,unknown>;}
export function accountFinancialPublicEffectFields(kind:string){if(kind==='send')return[...common,'recipientReceizId','amountUsdCents','amountPhiMicro'];if(kind==='buy'||kind==='sell')return[...common,'marketItemId','assetArtifactSha256','shareQuantityMicro','executionPriceUsdCents','notionalUsdCents','notionalPhiMicro','feeUsdCents','realizedCostBasisUsdCents','realizedCostBasisPhiMicro','realizedGainUsdCents'];return fail();}
/** Independently verifies a public financial-root statement. This returns
 * disclosure only, not financial Source custody or an incoming balance credit. */
export async function verifyReceizAccountFinancialReceipt(input:Uint8Array,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={}):Promise<ReceizAccountFinancialReceipt>{
 try{
  const raw=new TextDecoder('utf-8',{fatal:true}).decode(input.slice()),parsed=JSON.parse(raw),delivered=parsed?.schema==='receiz.account-financial-receipt.v2',body=exact(parsed,[...fields,...(delivered?['receivedAt','receivedAtKaiUPulse']:[])]);if(canonical(body)!==raw||!['receiz.account-financial-receipt.v1','receiz.account-financial-receipt.v2'].includes(String(body.schema))||body.rights!=='read-only'||typeof body.issuerRootKid!=='string'||typeof body.operationId!=='string'||!UUID.test(body.operationId)||typeof body.ownerReceizId!=='string'||!ID.test(body.ownerReceizId)||!Number.isSafeInteger(body.issuedAtMs)||Number(body.issuedAtMs)<=0)fail();
  for(const key of ['financialOriginalSha256','fundingSourceSha256'])if(typeof body[key]!=='string'||!SHA.test(body[key] as string))fail();
  if(typeof body.atKaiUPulse!=='string'||!/^[1-9][0-9]{0,18}$/u.test(body.atKaiUPulse))fail();
  const kind=(body.effect as Record<string,unknown>)?.kind;if(typeof kind!=='string')fail();const effect=exact(body.effect,accountFinancialPublicEffectFields(kind));
  for(const[key,value]of Object.entries(effect)){
   if(typeof value!=='string')fail();if(['kind','recipientReceizId','marketItemId','assetArtifactSha256'].includes(key))continue;
   if(!(key==='realizedGainUsdCents'?/^-?(0|[1-9][0-9]{0,18})$/u:/^(0|[1-9][0-9]{0,18})$/u).test(value))fail();
  }
  if(delivered){
   if(kind!=='send'||typeof body.receivedAtKaiUPulse!=='string'||!/^[1-9][0-9]{0,18}$/u.test(body.receivedAtKaiUPulse)||BigInt(body.receivedAtKaiUPulse)<BigInt(body.atKaiUPulse as string)||typeof body.receivedAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/u.test(body.receivedAt))fail();
   const ms=Date.parse(body.receivedAt);if(!Number.isSafeInteger(ms)||ms<=0)fail();
   // SQL retains microsecond timestamp precision; Date parses milliseconds.
   // Both use the existing exact bridge, with only that sub-ms interval allowed.
   const received=BigInt(body.receivedAtKaiUPulse),start=microPulsesSinceGenesisEpochMsV124(BigInt(ms)),end=microPulsesSinceGenesisEpochMsV124(BigInt(ms)+1n);
   if(received<start-1n||received>end+1n)fail();
  }
  if(kind==='send'){if(!ID.test(String(effect.recipientReceizId)))fail();}
  else if(!SHA.test(String(effect.assetArtifactSha256))||typeof effect.marketItemId!=='string'||effect.marketItemId.trim()!==effect.marketItemId||effect.marketItemId.length<3||effect.marketItemId.length>240||/[\u0000-\u001f]/u.test(effect.marketItemId))fail();
  const signature=exact(body.financialRootSignature,['kid','alg','sig']),root=(options.roots??receizCurrentPinnedSignatureV4Roots()).get(String(signature.kid)),pulse=microPulsesSinceGenesisEpochMsV124(BigInt(Number(body.issuedAtMs)))/1000000n;
  if(!root||root.alg!=='Ed25519'||signature.kid!==body.issuerRootKid||signature.alg!=='Ed25519'||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)||root.status==='retired'&&!root.retiredAtPulse||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))fail();
  const sig=decode(String(signature.sig)),key=decode(root.publicKeyRawB64u);if(sig.length!==64||key.length!==32||encode(sig)!==signature.sig||encode(key)!==root.publicKeyRawB64u)fail();
  const{financialRootSignature:_,...unsigned}=body;void _;const publicKey=await crypto.subtle.importKey('raw',key.slice().buffer,'Ed25519',false,['verify']);
  if(!await crypto.subtle.verify('Ed25519',publicKey,sig.slice().buffer,new TextEncoder().encode(RECEIZ_ACCOUNT_FINANCIAL_ROOT_CONTEXT+'\0'+canonical(unsigned))))fail();
  Object.freeze(effect);Object.freeze(signature);return Object.freeze(body)as ReceizAccountFinancialReceipt;
 }catch{fail();}
}
