import {bankNativeWalletValue} from './nativeWalletEconomics.js';
import {deflateSync} from 'fflate';
import {admitReceizAccountFinancialOperation,  readReceizAccountFinancialOperationCustody, type ReceizAccountFinancialCommit, type ReceizAccountFinancialOriginalStore, type ReceizVerifiedAccountFinancialOperation} from './accountFinancialCommit.js';
import {verifyReceizFinancialWalletCustodyBinding,verifyReceizFinancialWalletRecipientAcceptance,type ReceizFinancialWalletCustodyBinding} from './accountFinancialWalletCustody.js';
import type {ReceizAccountSendAction} from './accountFinancialExecution.js';
import {createReceizArtifactAdmissionEngine, readReceizIdentityPublicBinding} from './artifactAdmission.js';
import {verifyReceizArtifactWithCanonicalRoots} from './artifactVerification.js';
import {sha256ReceizBytes} from './artifacts.js';
import {RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA, receizBase64UrlDecode, receizBase64UrlEncode, deriveReceizIdentityKeyIdFromPublicKeyRawB64u, verifyReceizIdentityPublicKeyProjectionSignature, type ReceizIdentityKeyAlgorithm, type ReceizIdentityLoginProof} from './identity.js';
import {parseReceizPortableAssetDocument, extractReceizPortableAssetPayload} from './portableAsset.js';
import {canonicalizeReceizV122 as canonical, digestReceizCanonicalV122 as digest} from './v122Canonical.js';
import {receizCurrentPinnedSignatureV4Roots} from './verifier/roots.js';
import {inflateReceizBounded} from './verifier/boundedInflate.js';
import type {ReceizSignatureV4RootPublicKey} from './verifier/signatureV4.js';
import {compileBankOfflineMarketPricing, compileBankOfflineWalletValuation, inspectBankOfflineWalletLedger, type AccountExecutionWalletAmounts} from './accountFinancialMath.generated.js';

const SHA=/^[a-f0-9]{64}$/u, UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/u;
const MAX=(1n<<63n)-1n;
/** A distinct programme under the same signed allocation and owner contracts.
 * Earlier compatibility Sources retain their exact Send arithmetic. */
const NATIVE_RESERVE_PROGRAM='receiz.bank.offline-financial-program.v5';
const NATIVE_RESERVE_FAMILY='native-wallet-reserve';
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
 sourceFamily:'connected-wallet-share-market'|typeof NATIVE_RESERVE_FAMILY;wallet:AccountExecutionWalletAmounts;
}>;
// Only successful enclosing-original admission issues this custody. A copied
// projection or an arbitrary document seal cannot become a financial source.
/** Sign the exact receiver binding using the same account Identity proof
 * used for financial consent. The QR cannot nominate substitute device keys. */
export function receizAccountFinancialWalletReceiverChallenge(input: Readonly<{
 applicationId: string;
 recipientUserId: string;
 recipientOwnerReceizId: string;
 conversationId: string;
 custodian: unknown;
}>) {
 return 'receiz.account-financial.wallet-receiver.v1\0'+canonical(input);
}

type WalletRecipient = Readonly<{
 userId: string;
 ownerReceizId: string;
 identity: Record<string,unknown>;
 custodian: Record<string,unknown>;
 binding: ReceizFinancialWalletCustodyBinding;
}>;
export const WALLET_RECIPIENT_ACCOUNT_DOMAIN = 'receiz.bank.wallet-recipient-account.v1';
const admitted = new WeakMap<ReceizAccountFinancialSource,Readonly<{
 bytes: Uint8Array;
 body: Record<string,unknown>;
 walletCustody?: ReceizFinancialWalletCustodyBinding;
 walletRecipients: ReadonlyMap<string,WalletRecipient>;
 roots: ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;
 usedWalletCredentials: ReadonlySet<string>;
 walletLineage?: ReceizAccountFinancialWalletProof;
 walletOpening?: Readonly<{allocationId:string;sourceArtifactSha256:string;amountUsdCents:string;conversationId:string}>;
 valuation: ReturnType<typeof compileBankOfflineWalletValuation>;
 marketPricing: ReadonlyMap<string,ReturnType<typeof compileBankOfflineMarketPricing>>;
}>>();
const scanned = new WeakMap<ReceizAccountFinancialSource,WeakMap<object,{at:string;command:string;recipient:WalletRecipient}>>();
type WalletDestination = Pick<WalletRecipient,'userId'|'ownerReceizId'>;
const destinations = new WeakMap<ReceizAccountFinancialSource,WeakMap<object,{at:string;command:string;recipient:WalletDestination}>>();
export function readReceizScannedWalletRecipient(source:ReceizAccountFinancialSource,action:ReceizAccountSendAction,at:string){
 const saved=scanned.get(source)?.get(action);
 return saved?.at===at&&saved.command===canonical(action)?saved.recipient:null;
}
export function readReceizWalletDestination(source:ReceizAccountFinancialSource,action:ReceizAccountSendAction,at:string):WalletDestination|null{
 if(action.nearby===true)return readReceizScannedWalletRecipient(source,action,at);
 const saved=destinations.get(source)?.get(action);
 return saved?.at===at&&saved.command===canonical(action)?saved.recipient:null;
}

async function verifyWalletRecipientAccount(account:Record<string,unknown>,payload:Record<string,unknown>,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>,at:string){
 const issued=BigInt(positive(payload.issuedAtKaiUPulse)),pulse=issued/1_000_000n;
 const signature=object(account.signature,['kid','alg','sig','signedAtMs']);
 const root=roots.get(string(signature.kid));
 if(issued>BigInt(at)||!root||root.alg!=='Ed25519'||signature.alg!=='Ed25519'||root.status!=='active'&&root.status!=='retired'
  ||!Number.isSafeInteger(signature.signedAtMs)||Number(signature.signedAtMs)<=0
  ||root.status==='retired'&&!root.retiredAtPulse||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)
  ||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))fail('WALLET_RECIPIENT');
 const publicKey=await crypto.subtle.importKey('raw',bytes(root.publicKeyRawB64u,32).slice().buffer,'Ed25519',false,['verify']);
 if(!await crypto.subtle.verify('Ed25519',publicKey,bytes(signature.sig,64).slice().buffer,
  new TextEncoder().encode(WALLET_RECIPIENT_ACCOUNT_DOMAIN+'\0'+canonical(payload))))fail('WALLET_RECIPIENT');
}

/** Admit the Receiz-signed account/device binding and the holder's exact
 * receive assertion before exposing the recipient to the Wallet reducer. */
export async function prepareReceizScannedWalletRecipient(source:ReceizAccountFinancialSource,action:ReceizAccountSendAction,at:string,priorRecipients?:ReadonlySet<string>){
 const held=admitted.get(source),program=held?.body.program as Record<string,unknown>|undefined;
 if(!held?.walletCustody||program?.walletRecipientMode!=='scan-time'||action.recipientUserId===source.accountUserId
  ||!UUID.test(action.recipientUserId)||!UUID.test(action.conversationId))fail('WALLET_RECIPIENT');
 const snapshot=structuredClone(action),command=canonical(snapshot);
 if(snapshot.nearby!==true){
  if(program.walletConnectedPayments!==true)fail('WALLET_RECIPIENT');
  const row=object(snapshot.scannedRecipient,['account']);
  const account=object(row.account,['payload','signature']);
  const payload=object(account.payload,['applicationId','accountUserId','ownerReceizId','keyId','issuedAtKaiUPulse']);
  const ownerReceizId=string(payload.ownerReceizId);
  hash(payload.keyId);
  if(payload.applicationId!==program.applicationId||payload.accountUserId!==snapshot.recipientUserId
   ||ownerReceizId===source.ownerReceizId||!/^[-a-z0-9_]+\.receiz\.id$/u.test(ownerReceizId))fail('WALLET_RECIPIENT');
  await verifyWalletRecipientAccount(account,payload,held.roots,at);
  const entries=destinations.get(source)??new WeakMap();
  entries.set(action,{at,command,recipient:freeze({userId:snapshot.recipientUserId,ownerReceizId})});
  destinations.set(source,entries);
  return [];
 }
 const shared=program.walletCounterMode==='device';
 const row=object(snapshot.scannedRecipient,['account','identity','custodian','ownerConsent','assertion',...(shared?['signCount']:[])]);
 const account=object(row.account,['payload','signature']);
 const p=object(account.payload,['applicationId','accountUserId','ownerReceizId','keyId','credentialCertificateDigest','recordSignerPublicKey','issuedAtKaiUPulse']);
 const identity=object(row.identity,['keyId','alg','publicKeyRawB64u']);
 const custodian=object(row.custodian,['kind','publicKeyRawB64u','walletWebAuthn']);
 const ownerReceizId=string(p.ownerReceizId),applicationId=string(p.applicationId),keyId=hash(p.keyId);
 if(applicationId!==program.applicationId||p.accountUserId!==snapshot.recipientUserId||ownerReceizId===source.ownerReceizId
  ||!/^[-a-z0-9_]+\.receiz\.id$/u.test(ownerReceizId)||identity.keyId!==keyId
  ||!['Ed25519','P-256'].includes(string(identity.alg))||custodian.kind!=='existing-sdk-record-signer'
  ||p.recordSignerPublicKey!==custodian.publicKeyRawB64u||BigInt(positive(p.issuedAtKaiUPulse))>BigInt(at))fail('WALLET_RECIPIENT');
 bytes(custodian.publicKeyRawB64u,32);
 await verifyWalletRecipientAccount(account,p,held.roots,at);
 const credential=await verifyReceizFinancialWalletCustodyBinding(custodian.walletWebAuthn,{roots:held.roots,fundedAtKaiUPulse:string(p.issuedAtKaiUPulse)});
 const credentialKeys=[credential.credentialIdB64u,credential.custodyPublicKeyRawB64u];
 if(credential.certificateDigest!==p.credentialCertificateDigest||credential.origin!==held.walletCustody.origin||credential.rpId!==held.walletCustody.rpId
  ||credential.credentialIdB64u===held.walletCustody.credentialIdB64u||credential.custodyPublicKeyRawB64u===held.walletCustody.custodyPublicKeyRawB64u
  ||!shared&&credentialKeys.some(key=>held.usedWalletCredentials.has(key)||priorRecipients?.has(key)))fail('WALLET_RECIPIENT');
 const binding=await verifyReceizFinancialWalletRecipientAcceptance({binding:credential,
  offer:{applicationId,sourceArtifactSha256:source.artifactSha256,allocationId:source.allocationId,recipientUserId:snapshot.recipientUserId,
   conversationId:snapshot.conversationId,recipientKeyId:keyId,recipientCredentialCertificateDigest:credential.certificateDigest,
   recipientRecordSignerPublicKey:string(custodian.publicKeyRawB64u),amountUsdCents:snapshot.amountUsdCents},
  identity:{keyId,alg:identity.alg as ReceizIdentityKeyAlgorithm,publicKeyRawB64u:string(identity.publicKeyRawB64u)},
  ownerConsent:row.ownerConsent as ReceizIdentityLoginProof,assertion:row.assertion,
  ...(shared?{signCount:string(row.signCount)}:{}),
 });
 const consumedKeys=shared?credentialKeys.map(key=>key+':'+binding.initialSignCount):credentialKeys;
 if(shared&&consumedKeys.some(key=>held.usedWalletCredentials.has(key)||priorRecipients?.has(key)))fail('WALLET_RECIPIENT');
 const entries=scanned.get(source)??new WeakMap();
 entries.set(action,{at,command,recipient:freeze({userId:snapshot.recipientUserId,ownerReceizId,identity,custodian,binding})});
 scanned.set(source,entries);
 return consumedKeys;
}
function freeze<T>(value:T):T{if(value&&typeof value==='object'){for(const nested of Object.values(value))freeze(nested);Object.freeze(value);}return value;}

/** Internal composition only; no projection can fabricate admitted custody. */
export function readReceizAccountFinancialSourceCustody(source:ReceizAccountFinancialSource) {
 const held = admitted.get(source);
 if(!held)fail('CUSTODY_REQUIRED');
 return Object.freeze({
  body: held.body,
  walletCustody: held.walletCustody,
  sharedWalletCounter: (held.body.program as Record<string,unknown>).walletCounterMode==='device',
  receivedWallet: held.walletLineage!==undefined,
  walletOpening: held.walletOpening,
  hasWalletRecipient: (accountId:string,conversationId:string) => held.walletRecipients.has(accountId+':'+conversationId),
  valuation: held.valuation,
  marketPricingAt: (id:string,delta:string,flow:Parameters<ReturnType<typeof compileBankOfflineMarketPricing>['at']>[1],at:string) =>
   held.marketPricing.get(id)?.at(delta,flow,at)??null,
  artifactBytes: () => held.bytes.slice(),
 });
}

async function validateSourceOpenings(
 input:unknown,
 roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>,
 enclosedByVerifiedFunding:boolean,
){
 const body=object(input,['funding','program','initialState','inventory','ownerConsent','identityArtifact']);
 const admit=createReceizArtifactAdmissionEngine({canonicalSignatureV4RootPublicKeys:roots});
  const f=object(body.funding,['schema','allocationId','applicationId','accountUserId','ownerReceizId','receizKeyId','sourceAccountArtifactSha256','sourceInventorySha256','executionProgramSha256','initialStateSha256','receivingCustodyCommitmentDigest','fundedAtKaiUPulse']);
  if(f.schema!=='receiz.bank.offline-financial-allocation.v1'||!UUID.test(string(f.accountUserId))||!/^[a-zA-Z0-9_.:-]{3,240}$/u.test(string(f.applicationId))||!/^[-a-z0-9_]+\.receiz\.id$/u.test(string(f.ownerReceizId)))fail('FUNDING');
  for(const key of ['allocationId','receizKeyId','sourceAccountArtifactSha256','sourceInventorySha256','executionProgramSha256','initialStateSha256','receivingCustodyCommitmentDigest'])hash(f[key]);
  const at=positive(f.fundedAtKaiUPulse);
  for(const [key,value]of [['executionProgramSha256',body.program],['initialStateSha256',body.initialState],['sourceInventorySha256',body.inventory]]as const)if(await digest(value)!==f[key])fail('OPENING');
  const programVersion=(body.program as Record<string,unknown>)?.schema,nativeReserve=programVersion===NATIVE_RESERVE_PROGRAM,orderProgram=programVersion==='receiz.bank.offline-financial-program.v4',quantityBudget=orderProgram||programVersion==='receiz.bank.offline-financial-program.v3',dynamic=quantityBudget||programVersion==='receiz.bank.offline-financial-program.v2';
  const publicIdentityOpening=nativeReserve&&Object.hasOwn(body.program as object,'identityOpening');
  const allWalletRails=nativeReserve&&Object.hasOwn(body.program as object,'walletRails');
  const scanTime=Object.hasOwn(body.program as object,'walletRecipientMode');
  const partial=Object.hasOwn(body.program as object,'walletPartialPayments');
  const shared=Object.hasOwn(body.program as object,'walletCounterMode');
  const connected=Object.hasOwn(body.program as object,'walletConnectedPayments');
  const setAside=Object.hasOwn(body.program as object,'walletFunding');
  const p=object(body.program,['schema','sourceFamily','applicationId','accountUserId','ownerReceizId','nativeValueEnabled','usdPerPhiMicrocents','validFromKaiUPulse','expiresAtKaiUPulse','walletValuation','marketTerms','identity','custodian',...(dynamic?['marketPricing']:[]),...(Object.hasOwn(body.program as object,'recipientBindings')?['recipientBindings']:[]),...(orderProgram?['orderPolicy']:[]),...(nativeReserve?['sourceWalletHead']:[]),...(publicIdentityOpening?['identityOpening']:[]),...(allWalletRails?['walletRails']:[]),...(scanTime?['walletRecipientMode']:[]),...(partial?['walletPartialPayments']:[]),...(shared?['walletCounterMode']:[]),...(connected?['walletConnectedPayments']:[]),...(setAside?['walletFunding']:[])]);
  if(!['receiz.bank.offline-financial-program.v1','receiz.bank.offline-financial-program.v2','receiz.bank.offline-financial-program.v3','receiz.bank.offline-financial-program.v4',NATIVE_RESERVE_PROGRAM].includes(string(p.schema))||p.sourceFamily!==(nativeReserve?NATIVE_RESERVE_FAMILY:'connected-wallet-share-market')||p.applicationId!==f.applicationId||p.accountUserId!==f.accountUserId||p.ownerReceizId!==f.ownerReceizId||p.validFromKaiUPulse!==at||BigInt(positive(p.expiresAtKaiUPulse))<=BigInt(at))fail('PROGRAM');
  if(allWalletRails&&p.walletRails!=='all'||partial&&(!scanTime||p.walletPartialPayments!==true)||shared&&(!partial||p.walletCounterMode!=='device'))fail('PROGRAM');
  if(connected&&(!shared||p.walletConnectedPayments!==true))fail('PROGRAM');
  if(setAside&&(!shared||connected||p.walletFunding!=='set-aside'))fail('PROGRAM');
  if(scanTime&&(!nativeReserve||!publicIdentityOpening||!allWalletRails||p.walletRecipientMode!=='scan-time'||array(p.recipientBindings).length))fail('PROGRAM');
  if(orderProgram){const policy=object(p.orderPolicy,['schema','origin','priceRule','remainder','fillAuthority']);if(policy.schema!=='receiz.bank.account-market-order-policy.v1'||policy.origin!=='offline'||policy.priceRule!=='approved-bound'||policy.remainder!=='keep-open'||policy.fillAuthority!=='source-financial-root')fail('ORDER_POLICY');}
  const identity=object(p.identity,['keyId','alg','publicKeyRawB64u']);if(identity.keyId!==f.receizKeyId||!['Ed25519','P-256'].includes(string(identity.alg)))fail('IDENTITY');
  const hasWalletCustody=nativeReserve&&!!p.custodian&&Object.hasOwn(p.custodian,'walletWebAuthn');
  const custodian=object(p.custodian,['kind','publicKeyRawB64u',...(hasWalletCustody?['walletWebAuthn']:[])]);
  if(custodian.kind!=='existing-sdk-record-signer'||await digest(custodian)!==f.receivingCustodyCommitmentDigest)fail('CUSTODY');bytes(custodian.publicKeyRawB64u,32);
  if(publicIdentityOpening&&(p.identityOpening!=='public-commitment'||!hasWalletCustody))fail('CUSTODY');
  const walletCustody=hasWalletCustody?await verifyReceizFinancialWalletCustodyBinding(custodian.walletWebAuthn,{roots,fundedAtKaiUPulse:at}):undefined;
  if(shared&&!walletCustody)fail('PROGRAM');
  const walletRecipients = new Map<string,WalletRecipient>();
  if(p.recipientBindings!==undefined){
   const coordinates: string[] = [];
   const credentials = new Set(walletCustody ? [walletCustody.credentialIdB64u] : []);
   const credentialKeys = new Set(walletCustody ? [walletCustody.custodyPublicKeyRawB64u] : []);
   for(const value of array(p.recipientBindings)){
    const hasRecipientWallet = !!value && typeof value === 'object' && Object.hasOwn(value,'wallet');
    const r = object(value,['recipientUserId','recipientOwnerReceizId','conversationId','sourceAccountArtifactSha256',...(hasRecipientWallet?['wallet']:[])]);
    const userId = string(r.recipientUserId), ownerReceizId = string(r.recipientOwnerReceizId), conversationId = string(r.conversationId);
    if(!UUID.test(userId)||userId===f.accountUserId||!UUID.test(conversationId)||!/^[-a-z0-9_]+\.receiz\.id$/u.test(ownerReceizId))fail('RECIPIENT');
    hash(r.sourceAccountArtifactSha256);
    const coordinate = userId+':'+conversationId;
    coordinates.push(coordinate);
    if(hasRecipientWallet){
     if(!publicIdentityOpening||!walletCustody)fail('WALLET_RECIPIENT');
     const recipient = object(r.wallet,['identity','custodian','ownerConsent']);
     const identity = object(recipient.identity,['keyId','alg','publicKeyRawB64u']);
     const alg = string(identity.alg), keyId = hash(identity.keyId);
     if(!['Ed25519','P-256'].includes(alg)||keyId===f.receizKeyId
      ||await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(string(identity.publicKeyRawB64u),alg as ReceizIdentityKeyAlgorithm)!==keyId)fail('WALLET_RECIPIENT');
     const custodian = object(recipient.custodian,['kind','publicKeyRawB64u','walletWebAuthn']);
     if(custodian.kind!=='existing-sdk-record-signer')fail('WALLET_RECIPIENT');
     bytes(custodian.publicKeyRawB64u,32);
     const proof = object(recipient.ownerConsent,['schema','keyId','alg','challengeB64Url','signatureB64Url']);
     const challenge = receizAccountFinancialWalletReceiverChallenge({
      applicationId:string(p.applicationId),recipientUserId:userId,recipientOwnerReceizId:ownerReceizId,conversationId,custodian,
     });
     if(proof.schema!==RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA||proof.keyId!==keyId||proof.alg!==alg
      ||proof.challengeB64Url!==receizBase64UrlEncode(new TextEncoder().encode(challenge))
      ||!await verifyReceizIdentityPublicKeyProjectionSignature({
       keyId,alg:alg as ReceizIdentityKeyAlgorithm,publicKeyRawB64u:string(identity.publicKeyRawB64u),
       challengeB64Url:string(proof.challengeB64Url),signatureB64Url:string(proof.signatureB64Url),
      }))fail('WALLET_RECIPIENT');
     const binding = await verifyReceizFinancialWalletCustodyBinding(custodian.walletWebAuthn,{roots,fundedAtKaiUPulse:at});
     if(binding.origin!==walletCustody.origin||binding.rpId!==walletCustody.rpId||credentials.has(binding.credentialIdB64u)||credentialKeys.has(binding.custodyPublicKeyRawB64u))fail('WALLET_RECIPIENT');
     credentials.add(binding.credentialIdB64u);
     credentialKeys.add(binding.custodyPublicKeyRawB64u);
     walletRecipients.set(coordinate,{userId,ownerReceizId,identity,custodian,binding});
    }
   }
   ordered(coordinates);
  }
  const identityCommitmentOnly=publicIdentityOpening&&enclosedByVerifiedFunding;
  const carried=object(body.identityArtifact,identityCommitmentOnly?['artifactSha256']:['artifactSha256','exactBytesB64u']);
  if(carried.artifactSha256!==f.sourceAccountArtifactSha256)fail('IDENTITY');
  const consent=object(body.ownerConsent,['schema','keyId','alg','challengeB64Url','signatureB64Url']) as ReceizIdentityLoginProof;
  const challenge='receiz.account-execution-consent.v1\0'+canonical(f);
  if(identityCommitmentOnly){
   // Portable Wallet Sources bind this exact public key and the retained
   // Identity Original digest through the enclosing financial-root signature.
   if(consent.schema!==RECEIZ_IDENTITY_LOGIN_PROOF_SCHEMA||consent.keyId!==identity.keyId||consent.alg!==identity.alg
    ||consent.challengeB64Url!==receizBase64UrlEncode(new TextEncoder().encode(challenge))
    ||!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:consent.keyId,alg:consent.alg,
     publicKeyRawB64u:string(identity.publicKeyRawB64u),challengeB64Url:consent.challengeB64Url,signatureB64Url:consent.signatureB64Url}))fail('CONSENT');
  }else{
   const identityBytes=bytes(carried.exactBytesB64u);
   if(await sha256ReceizBytes(identityBytes)!==f.sourceAccountArtifactSha256)fail('IDENTITY');
   const owner=await admit(await verifyReceizArtifactWithCanonicalRoots(identityBytes,roots),{profile:'identity',identityProof:consent,identityExactChallenge:challenge});
   if('code'in owner||owner.profile!=='identity'||owner.verdict!=='canonical-identity')fail('CONSENT');
   const binding=await readReceizIdentityPublicBinding(owner);
   if(binding.artifactOwnerReceizId!==f.ownerReceizId||binding.keyId!==identity.keyId||binding.alg!==identity.alg||binding.publicKeyRawB64u!==identity.publicKeyRawB64u)fail('IDENTITY');
  }
  const inventory=object(body.inventory,['schema','accountUserId','walletAccount','rawSettledUsdCents','principalArtifactIds','ledgerKnownKaiHead','ledgerExactJson','positionsExactJson','walletLedger','profileSeed','positions']);
  if(inventory.schema!=='receiz.bank.offline-financial-capture.v1'||inventory.accountUserId!==f.accountUserId)fail('INVENTORY');
  const ledger=inspectBankOfflineWalletLedger(inventory.walletLedger),account=object(inventory.walletAccount,['balancePhiMicro','membershipRevision']);
  uint(account.membershipRevision);same(account.balancePhiMicro,ledger.accountBalancePhiMicro);same(inventory.rawSettledUsdCents,ledger.settledUsdCents);
  if(inventory.ledgerKnownKaiHead!==null&&BigInt(uint(inventory.ledgerKnownKaiHead))>BigInt(at))fail('INVENTORY');
  // These exact originals remain carried for financial adoption. Arithmetic
  // openings are signed by the existing financial root, never rediscovered.
  for(const field of ['ledgerExactJson','positionsExactJson']){
   const rows=array(JSON.parse(string(inventory[field])));
   if(publicIdentityOpening&&rows.length)fail('INVENTORY');
  }
  const seed=object(inventory.profileSeed,['amountPhiMicro','amountUsdCents']);Object.values(seed).forEach(uint);
  const valuation=object(p.walletValuation,['schema','creationSigilBenefitsEnabled','publicGlyphs','lawfulActionPhiMicro','profileSeedPhiMicro','profileSeedUsdCents','membershipDigest','projectorDigest']);
  same(valuation.profileSeedPhiMicro,seed.amountPhiMicro);same(valuation.profileSeedUsdCents,seed.amountUsdCents);
  // Existing lawful-action sources need their own custody handoff. A scalar
  // projection cannot silently delegate an independently spendable original.
  if(valuation.lawfulActionPhiMicro!=='0')fail('UNQUALIFIED_LAWFUL_ACTION_CUSTODY');
  const ids=array(inventory.principalArtifactIds).map(v=>{const id=string(v);if(!UUID.test(id))fail('INVENTORY');return id;});ordered(ids);
  same(ids,array(valuation.publicGlyphs).map(g=>string((g as Record<string,unknown>).id)).sort());
  const compiledValuation=compileBankOfflineWalletValuation(valuation,at);
  const state=object(body.initialState,['schema','allocationId','accountUserId','sequence','lastKaiUPulse','wallet','walletLedger','positions','marketCapacity',...(dynamic?['marketActivity']:[]),...(orderProgram?['orderEscrows']:[]),...(allWalletRails?['reserveBackingPhiMicro']:[])]);
  if(orderProgram)same(state.orderEscrows,[]);
  if(state.schema!=='receiz.account-financial-state.v1'||state.allocationId!==f.allocationId||state.accountUserId!==f.accountUserId||state.sequence!=='0'||state.lastKaiUPulse!==at)fail('STATE');
  let projected:ReturnType<typeof compiledValuation.at>;
  if(nativeReserve){
   hash(p.sourceWalletHead);
   // A native Reserve allocation carries only its exclusive original Reserve
   // backing. The normal quote and other hosted balances supply no capacity.
   if(p.nativeValueEnabled!==false||valuation.creationSigilBenefitsEnabled!==false||seed.amountPhiMicro!=='0'||seed.amountUsdCents!=='0'||
    ledger.accountBalancePhiMicro!==ledger.totalCreditPhiMicro||ledger.totalDebitPhiMicro!=='0'||ledger.totalDebitUsdCents!=='0'||
    array(p.marketTerms).length||array(state.positions).length||!scanTime&&!array(p.recipientBindings).length)fail('NATIVE_RESERVE');
   const balancePhiMicro=positive(ledger.accountBalancePhiMicro),usdPerPhiMicrocents=positive(p.usdPerPhiMicrocents);
   const availableUsdCents=allWalletRails?positive(bankNativeWalletValue({
    balancePhiMicro,reserveUsdCents:ledger.settledUsdCents,reserveBackingPhiMicro:uint(state.reserveBackingPhiMicro),
   },usdPerPhiMicrocents).totalUsdCents):positive(ledger.settledUsdCents);
   same(availableUsdCents,ledger.totalCreditUsdCents);
   projected={wallet:{balancePhiMicro,availableUsdCents,settledUsdCents:ledger.settledUsdCents},
    usdPerPhiMicrocents,nativeValueEnabled:false,marketAvailableUsdCents:'0'};
  }else{
   projected=compiledValuation.at(ledger,string(f.accountUserId),at);
   same(projected.nativeValueEnabled,p.nativeValueEnabled);same(projected.usdPerPhiMicrocents,positive(p.usdPerPhiMicrocents));
  }
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
 const sourceFamily:ReceizAccountFinancialSource['sourceFamily']=nativeReserve?NATIVE_RESERVE_FAMILY:'connected-wallet-share-market';
 return{compiledValuation,compiledMarketPricing,projected,sourceFamily,walletCustody,walletRecipients};
}

/** Preparation requires the actual Identity Original. The public commitment is
 * accepted only inside the already verified funding and enclosing Original. */
export async function validateReceizAccountFinancialSourceOpenings(input:unknown,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={}){
 return validateSourceOpenings(input,options.roots??receizCurrentPinnedSignatureV4Roots(),false);
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
  const {compiledValuation,compiledMarketPricing,projected,sourceFamily,walletCustody,walletRecipients}=await validateSourceOpenings(openings,roots,true);
  const accepted=Object.freeze({artifactSha256:source.artifactSha256,allocationId:string(f.allocationId),accountUserId:string(f.accountUserId),ownerReceizId:string(f.ownerReceizId),sourceFamily,wallet:Object.freeze({...projected.wallet})});
  admitted.set(accepted,{bytes:original,body:freeze(body),...(walletCustody?{walletCustody}:{}),walletRecipients,roots,usedWalletCredentials:new Set(walletCustody?[walletCustody.credentialIdB64u,walletCustody.custodyPublicKeyRawB64u]:[]),
   valuation:compiledValuation,marketPricing:compiledMarketPricing});return accepted;
 }catch(error){if(error instanceof Error&&error.message.startsWith('ACCOUNT_FINANCIAL_SOURCE_'))throw error;fail('INVALID');}
}


export type ReceizAccountFinancialWalletProof = Readonly<{
 sourceOriginal: Uint8Array;
 paymentOriginals: readonly Uint8Array[];
}>;
const MAX_WALLET_PROOF_BYTES = 4 * 1024 * 1024;
const MAX_WALLET_PROOF_WIRE_BYTES = 8 * 1024 * 1024;
const MAX_WALLET_PAYMENTS = 64;

export function readReceizAccountFinancialWalletProof(encoded: Uint8Array): ReceizAccountFinancialWalletProof {
 if(!encoded.byteLength||encoded.byteLength>MAX_WALLET_PROOF_WIRE_BYTES)fail('WALLET_PROOF_CAPACITY');
 const unpacked = inflateReceizBounded(encoded,MAX_WALLET_PROOF_BYTES,MAX_WALLET_PROOF_WIRE_BYTES);
 const text = new TextDecoder('utf-8',{fatal:true}).decode(unpacked);
 const payload = object(JSON.parse(text),['schema','sourceOriginalB64u','paymentOriginalsB64u']);
 const payments = array(payload.paymentOriginalsB64u);
 if(payload.schema!=='receiz.account-financial.wallet-proof.v1'||!payments.length
  ||payments.length>MAX_WALLET_PAYMENTS||canonical(payload)!==text)fail('WALLET_PROOF');
 return {sourceOriginal:bytes(payload.sourceOriginalB64u),paymentOriginals:payments.map(value=>bytes(value))};
}

/** Reserve room for the exact carried Originals before device authorization.
 * Base64url adds at most 4/3 bytes. The ASCII envelope has fixed keys,
 * quoted elements, and one comma between each of the prior payment entries. */
export function assertReceizAccountFinancialWalletProofCapacity(
 source: ReceizAccountFinancialSource,
 nextOriginalBytes: number,
 preceding: readonly Uint8Array[] = [],
) {
 const held = admitted.get(source);
 if(!held)fail('CUSTODY_REQUIRED');
 const previous = held.walletLineage;
 const root = previous?.sourceOriginal??held.bytes;
 const prior = [...(previous?.paymentOriginals??[]),...preceding];
 if(prior.length>=MAX_WALLET_PAYMENTS||!Number.isSafeInteger(nextOriginalBytes)||nextOriginalBytes<1)fail('WALLET_PROOF_CAPACITY');
 const base64Length = (size:number) => Math.ceil(size*4/3);
 const emptyEnvelope = canonical({schema:'receiz.account-financial.wallet-proof.v1',sourceOriginalB64u:'',paymentOriginalsB64u:['']});
 const size = prior.reduce((sum,original)=>sum+3+base64Length(original.byteLength),
  emptyEnvelope.length+base64Length(root.byteLength)+base64Length(nextOriginalBytes));
 if(size>MAX_WALLET_PROOF_BYTES)fail('WALLET_PROOF_CAPACITY');
}

/** Export exact public Wallet funding and accepted spends for the optical or
 * local transport. A candidate signature or private Source cannot be shared. */
export function exportReceizAccountFinancialWalletProof(
 source: ReceizAccountFinancialSource,
 commit: ReceizAccountFinancialCommit,
): Uint8Array {
 return encodeAcceptedWalletOperation(source,commit.operation);
}

function encodeAcceptedWalletOperation(source:ReceizAccountFinancialSource,operation:ReceizVerifiedAccountFinancialOperation){
 const held = admitted.get(source);
 if(!held||(!held.walletRecipients.size&&(operation.action.kind!=='send'||!readReceizScannedWalletRecipient(source,operation.action,operation.atKaiUPulse)))||readReceizAccountFinancialOperationCustody(operation).sourceSha256!==source.artifactSha256
  ||operation.action.kind!=='send'||operation.action.nearby!==true)fail('WALLET_PROOF');
 const previous = held.walletLineage;
 const original = readReceizAccountFinancialOperationCustody(operation).artifactBytes();
 const preceding=readReceizAccountFinancialOperationCustody(operation).precedingOriginals();
 assertReceizAccountFinancialWalletProofCapacity(source,original.byteLength,preceding);
 return encodeWalletProof(previous?.sourceOriginal??held.bytes,[...(previous?.paymentOriginals??[]),...preceding,original]);
}
export function measureReceizAccountFinancialWalletProof(source:ReceizAccountFinancialSource,operation:ReceizVerifiedAccountFinancialOperation){
 return encodeAcceptedWalletOperation(source,operation).byteLength;
}
function encodeWalletProof(root:Uint8Array,payments:readonly Uint8Array[]){
 const encoded = new TextEncoder().encode(canonical({
  schema:'receiz.account-financial.wallet-proof.v1',
  sourceOriginalB64u:receizBase64UrlEncode(root),
  paymentOriginalsB64u:payments.map(receizBase64UrlEncode),
 }));
 return deflateSync(encoded);
}

async function openWalletProof(input:ReceizAccountFinancialWalletProof,roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>){
 if(input.paymentOriginals.length<1||input.paymentOriginals.length>MAX_WALLET_PAYMENTS
  ||input.paymentOriginals.reduce((size,bytes)=>size+bytes.byteLength,input.sourceOriginal.byteLength)>MAX_WALLET_PROOF_BYTES)
  fail('WALLET_PROOF_CAPACITY');
 const rootOriginal = input.sourceOriginal.slice();
 const paymentOriginals = input.paymentOriginals.map(original=>original.slice());
 let source = await admitReceizAccountFinancialSource(rootOriginal,roots?{roots}:{});
 const ancestry: Array<Readonly<{artifactSha256:string;bytes:Uint8Array}>> = [{artifactSha256:source.artifactSha256,bytes:rootOriginal}];
 const operations:ReceizVerifiedAccountFinancialOperation[]=[];
 const payers:ReceizAccountFinancialSource[]=[];
 let preceding:Uint8Array[]=[];
 let parent:ReceizVerifiedAccountFinancialOperation|null=null;
 for(const original of paymentOriginals){
  // The encoded Source coordinate is only a locator. A previous accepted
  // original must create the next Source before the next action can open.
  const wire=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(original)) as {sourceArtifactSha256?:unknown};
  if(wire?.sourceArtifactSha256!==source.artifactSha256&&parent){
   source=receiveWalletPayment(source,parent,rootOriginal,preceding);
   preceding=[];parent=null;
  }
  parent=await admitReceizAccountFinancialOperation(original,{source,predecessor:parent});
  operations.push(parent);
  payers.push(source);
  preceding.push(original);
  ancestry.push({artifactSha256:parent.artifactSha256,bytes:original});
 }
 if(!parent)fail('WALLET_RECIPIENT');
 source=receiveWalletPayment(source,parent,rootOriginal,preceding);
 return {source,operations,ancestry,payers};
}

/** An already signed payment can be carried by its exact payer or recipient. */
export async function inspectReceizAccountFinancialWalletPaymentParties(
 proof:ReceizAccountFinancialWalletProof,options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={},
){
 const {source,payers}=await openWalletProof(proof,options.roots);
 const payer=payers.at(-1);
 if(!payer)fail('WALLET_RECIPIENT');
 const payerProgram=readReceizAccountFinancialSourceCustody(payer).body.program as {identity:{keyId:string}};
 const receiverProgram=readReceizAccountFinancialSourceCustody(source).body.program as {identity:{keyId:string}};
 return Object.freeze({payer,payerKeyId:payerProgram.identity.keyId,recipient:source,recipientKeyId:receiverProgram.identity.keyId});
}

/** Re-export only the authenticated holder's recoverable prefix. Later
 * payments in a carried chain may belong to unrelated accounts. */
export async function readReceizAccountFinancialWalletRecoveryProof(
 proof:ReceizAccountFinancialWalletProof,
 owner:Readonly<{applicationId:string;accountUserId:string;ownerReceizId:string;keyId:string;sourceArtifactSha256:string}>,
 options:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>={},
){
 const {operations,payers,ancestry}=await openWalletProof(proof,options.roots);
 for(let index=operations.length-1;index>=0;index--){
  const payer=payers[index]!,operation=operations[index]!;
  if(payer.artifactSha256!==owner.sourceArtifactSha256||payer.accountUserId!==owner.accountUserId||payer.ownerReceizId!==owner.ownerReceizId
    ||operation.action.kind!=='send'||operation.action.nearby!==true)continue;
  const program=readReceizAccountFinancialSourceCustody(payer).body.program as {applicationId:string;identity:{keyId:string}};
  if(program.applicationId!==owner.applicationId||program.identity.keyId!==owner.keyId)return null;
  return Object.freeze({sequence:operation.sequence,bytes:encodeWalletProof(ancestry[0]!.bytes,ancestry.slice(1,index+2).map(row=>row.bytes))});
 }
 return null;
}

/** Recover only exact Wallet spends belonging to the held Source. The full
 * peer proof is admitted before it can supply any of those Originals. */
export async function walletRecoveryOriginals(source:ReceizAccountFinancialSource,encoded:Uint8Array){
 const held=admitted.get(source);
 if(!held?.walletCustody)fail('CUSTODY_REQUIRED');
 const proof=readReceizAccountFinancialWalletProof(encoded);
 const root=held.walletLineage?.sourceOriginal??held.bytes;
 if(await sha256ReceizBytes(proof.sourceOriginal)!==await sha256ReceizBytes(root))return [];
 const {operations}=await openWalletProof(proof,held.roots);
 return operations.map(readReceizAccountFinancialOperationCustody)
  .filter(operation=>operation.sourceSha256===source.artifactSha256)
  .map(operation=>operation.artifactBytes());
}

/** Reopen each exact signed spend from the enclosing funded Wallet Source.
 * Each accepted send consumes its input and carries one fixed recipient. The
 * same incoming Original always leads to the same recipient allocation. */
export async function receiveReceizAccountFinancialWalletProof(
 input: ReceizAccountFinancialWalletProof & Readonly<{accountUserId:string;ownerKeyId:string}>,
 options: Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>;originals:ReceizAccountFinancialOriginalStore}>,
): Promise<ReceizAccountFinancialSource> {
 const {source,ancestry}=await openWalletProof(input,options.roots);
 const {accountUserId,ownerKeyId}=input;
 const program = readReceizAccountFinancialSourceCustody(source).body.program as {identity:{keyId:string}};
 if(source.accountUserId!==accountUserId||program.identity.keyId!==ownerKeyId)fail('WALLET_RECIPIENT');
 for(const original of ancestry){
  await options.originals.retain(original.artifactSha256,original.bytes.slice());
  const retained = await options.originals.read(original.artifactSha256);
  if(!retained||await sha256ReceizBytes(retained)!==original.artifactSha256)fail('ORIGINAL_RETENTION_REQUIRED');
 }
 return source;
}

function receiveWalletPayment(
 source: ReceizAccountFinancialSource,
 payment: ReceizVerifiedAccountFinancialOperation,
 rootOriginal: Uint8Array,
 currentSourceOriginals: readonly Uint8Array[],
) {
 const held = admitted.get(source);
 const paymentCustody = readReceizAccountFinancialOperationCustody(payment);
 if(!held||paymentCustody.sourceSha256!==source.artifactSha256||payment.action.kind!=='send'
  ||payment.action.nearby!==true||payment.effect.kind!=='send')fail('WALLET_RECIPIENT');
 const {effect} = payment;
 const recipient = readReceizScannedWalletRecipient(source,payment.action,payment.atKaiUPulse)
  ?? held.walletRecipients.get(effect.recipientUserId+':'+effect.conversationId);
 if(!recipient||effect.recipientOwnerReceizId!==recipient.ownerReceizId)fail('WALLET_RECIPIENT');
 const funding = effect.nativeWalletMovement?.fundingParts;
 const settledUsdCents = funding?.reserve.amountUsdCents??effect.amountUsdCents;
 const wallet = Object.freeze({balancePhiMicro:effect.amountPhiMicro,availableUsdCents:effect.amountUsdCents,settledUsdCents});
 // A signature may have more than one valid representation. Reuse the
 // verified signed command's stable identity and keep the first admitted bytes.
 const allocationId = paymentCustody.commandDigest;
 const walletLedger = {
  accountBalancePhiMicro:effect.amountPhiMicro,totalCreditPhiMicro:effect.amountPhiMicro,totalDebitPhiMicro:'0',
  totalCreditUsdCents:effect.amountUsdCents,totalDebitUsdCents:'0',settledUsdCents,
 };
 const accountUserId = recipient.userId, ownerReceizId = recipient.ownerReceizId;
 const initialState = {schema:'receiz.account-financial-state.v1',allocationId,accountUserId,sequence:'0',
  lastKaiUPulse:payment.atKaiUPulse,wallet,walletLedger,positions:[],marketCapacity:[],...(funding?{reserveBackingPhiMicro:funding.reserve.amountPhiMicro}:{})};
 const previous = held.body.program as Record<string,unknown>;
 const recipientBindings = (previous.recipientBindings as ReadonlyArray<{recipientUserId:string}>).filter(row=>row.recipientUserId!==accountUserId);
 const program = {...previous,accountUserId,ownerReceizId,recipientBindings,identity:recipient.identity,custodian:recipient.custodian,validFromKaiUPulse:payment.atKaiUPulse};
 const walletRecipients = new Map([...held.walletRecipients].filter(([,row])=>row.userId!==accountUserId));
 const next = Object.freeze({artifactSha256:payment.artifactSha256,allocationId,accountUserId,ownerReceizId,sourceFamily:NATIVE_RESERVE_FAMILY,wallet});
 // The incoming, protected debit is this Source's exact opening. Its accepted
 // bytes and funded ancestry are retained, with no new seal or issuer.
 const walletLineage = {sourceOriginal:rootOriginal,paymentOriginals:[...(held.walletLineage?.paymentOriginals??[]),...currentSourceOriginals]};
 const walletOpening = Object.freeze({allocationId:source.allocationId,sourceArtifactSha256:source.artifactSha256,
  amountUsdCents:effect.amountUsdCents,conversationId:payment.action.conversationId});
 admitted.set(next,{...held,bytes:paymentCustody.artifactBytes(),walletCustody:recipient.binding,walletRecipients,walletLineage,walletOpening,
  usedWalletCredentials:new Set([...held.usedWalletCredentials,...paymentCustody.walletRecipientCredentials(),recipient.binding.credentialIdB64u,recipient.binding.custodyPublicKeyRawB64u]),
  body:freeze({funding:held.body.funding,program,initialState})});
 return next;
}
