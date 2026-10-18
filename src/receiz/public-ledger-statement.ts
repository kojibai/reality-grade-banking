import {canonicalizeReceizV122,digestReceizCanonicalV122,deriveReceizIdentityKeyIdFromPublicKeyRawB64u,receizBase64UrlEncode,verifyReceizIdentityPublicKeyProjectionSignature} from '@receiz/sdk';
import type {ReceizSignatureV4RootPublicKey} from '../../native/receiz/packages/receiz-sdk/src/verifier/signatureV4';
export const PUBLIC_LEDGER_DOMAIN='receiz.public-action-ledger.root-signature.v1';
export const PUBLIC_LEDGER_MAX_BYTES=16*1024*1024;
export type PublicLedgerRecord=Readonly<{id:string;sequence:number;kind:string;kaiUpulse:string;entryHash:string;previousHash:string;amountUsdCents:string|null}>;
export type PublicLedgerSnapshot=Readonly<{
 schema:'receiz.public-action-ledger.v1';domain:typeof PUBLIC_LEDGER_DOMAIN;issuerRootKid:string;ledgerId:string;
 scope:'public-action-history';baseline:'native'|'observed';financialAdmission:false;
 sourceBaseline:string;sourceHead:string;sourceHistory:readonly string[];kaiUpulse:string;
 recordsRoot:string;records:readonly PublicLedgerRecord[];
 rootSignature:Readonly<{kid:string;alg:'Ed25519';sig:string}>;
}>;
export type PublicLedgerSource=Readonly<{schema:'receiz.sealed-artifact-bytes.v124';exactBytesB64u:string;filename:string;mimeType:string;artifactSha256:string;payloadSha256:string}>;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const exact=(v:Record<string,unknown>,keys:readonly string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uint=(v:unknown):v is string=>typeof v==='string'&&/^(0|[1-9][0-9]{0,39})$/.test(v);
function fail():never{throw Error('PUBLIC_LEDGER_STATEMENT_INVALID');}
/** Shape is display preparation, never a verifier verdict. */
export function inspectPublicLedgerStatement(input:unknown):PublicLedgerSnapshot{
 const v:unknown=structuredClone(input);
 if(!object(v)||!exact(v,['schema','domain','issuerRootKid','ledgerId','scope','baseline','financialAdmission','sourceBaseline','sourceHead','sourceHistory','kaiUpulse','recordsRoot','records','rootSignature'])
  ||v.schema!=='receiz.public-action-ledger.v1'||v.domain!==PUBLIC_LEDGER_DOMAIN||v.scope!=='public-action-history'||v.financialAdmission!==false
  ||!['native','observed'].includes(String(v.baseline))||typeof v.issuerRootKid!=='string'||!/^[a-zA-Z0-9._:-]{3,64}$/.test(v.issuerRootKid)
  ||!hex(v.ledgerId)||!hex(v.sourceBaseline)||!hex(v.sourceHead)||!hex(v.recordsRoot)||!uint(v.kaiUpulse)
  ||!Array.isArray(v.sourceHistory)||!v.sourceHistory.length||v.sourceHistory.length>100_000||!v.sourceHistory.every(hex)
  ||new Set(v.sourceHistory).size!==v.sourceHistory.length||v.sourceHistory[0]!==v.sourceBaseline||v.sourceHistory.at(-1)!==v.sourceHead
  ||!Array.isArray(v.records)||v.records.length>100_000||!object(v.rootSignature)||!exact(v.rootSignature,['kid','alg','sig'])
  ||v.rootSignature.kid!==v.issuerRootKid||v.rootSignature.alg!=='Ed25519'||typeof v.rootSignature.sig!=='string'||!/^[A-Za-z0-9_-]{86}$/.test(v.rootSignature.sig))fail();
 const ids=new Set<string>(),hashes=new Set<string>();let seq=0;
 for(const row of v.records){
  if(!object(row)||!exact(row,['id','sequence','kind','kaiUpulse','entryHash','previousHash','amountUsdCents'])
   ||typeof row.id!=='string'||!row.id||row.id.length>128||ids.has(row.id)||!Number.isSafeInteger(row.sequence)||(row.sequence as number)<=seq
   ||typeof row.kind!=='string'||!/^[a-z0-9._:-]{3,120}$/.test(row.kind)||!uint(row.kaiUpulse)||BigInt(row.kaiUpulse)>BigInt(v.kaiUpulse)
   ||!hex(row.entryHash)||!hex(row.previousHash)||hashes.has(row.entryHash)||row.amountUsdCents!==null&&!uint(row.amountUsdCents))fail();
  seq=row.sequence as number;ids.add(row.id);hashes.add(row.entryHash);Object.freeze(row);
 }
 Object.freeze(v.records);Object.freeze(v.sourceHistory);Object.freeze(v.rootSignature);return Object.freeze(v) as PublicLedgerSnapshot;
}
/** Domain read beneath canonical artifact verification. The existing native
 * writer attests only this public-safe view of its admitted Action Ledger.
 * It does not attest ownership, balances, or spending rights of uploaded rows. */
export async function verifyPublicLedgerStatement(input:unknown,roots:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>):Promise<PublicLedgerSnapshot|null>{
 try{
  const s=inspectPublicLedgerStatement(input),root=roots.get(s.issuerRootKid),pulse=BigInt(s.kaiUpulse)/1_000_000n;
  if(!root||root.kid!==s.issuerRootKid||root.alg!=='Ed25519'||root.status!=='active'&&root.status!=='retired'
   ||root.status==='retired'&&!root.retiredAtPulse||root.activeFromPulse&&pulse<BigInt(root.activeFromPulse)||root.retiredAtPulse&&pulse>BigInt(root.retiredAtPulse))return null;
  if(await digestReceizCanonicalV122({scope:s.scope,sourceBaseline:s.sourceBaseline})!==s.ledgerId||await digestReceizCanonicalV122(s.records)!==s.recordsRoot)return null;
  const {rootSignature,...payload}=s;
  if(!await verifyReceizIdentityPublicKeyProjectionSignature({keyId:await deriveReceizIdentityKeyIdFromPublicKeyRawB64u(root.publicKeyRawB64u,'Ed25519'),alg:'Ed25519',publicKeyRawB64u:root.publicKeyRawB64u,
   challengeB64Url:receizBase64UrlEncode(new TextEncoder().encode(canonicalizeReceizV122(payload))),signatureB64Url:rootSignature.sig}))return null;
  return s;
 }catch{return null;}
}
/** Whole supported history, never the visible list window. Old same-prefix
 * snapshots are harmless; a changed settled row or unrelated source is refused. */
export function publicLedgerContinuation(held:PublicLedgerSnapshot,incoming:PublicLedgerSnapshot):'same'|'older'|'extends'{
 if(held.ledgerId!==incoming.ledgerId||held.sourceBaseline!==incoming.sourceBaseline||held.baseline!==incoming.baseline)throw Error('PUBLIC_LEDGER_IDENTITY_MISMATCH');
 const common=Math.min(held.sourceHistory.length,incoming.sourceHistory.length);
 for(let i=0;i<common;i++)if(held.sourceHistory[i]!==incoming.sourceHistory[i])throw Error('PUBLIC_LEDGER_HISTORY_CONFLICT');
 const rows=Math.min(held.records.length,incoming.records.length);
 for(let i=0;i<rows;i++)if(canonicalizeReceizV122(held.records[i])!==canonicalizeReceizV122(incoming.records[i]))throw Error('PUBLIC_LEDGER_HISTORY_CONFLICT');
 if(incoming.sourceHistory.length===held.sourceHistory.length){if(incoming.records.length!==held.records.length||incoming.kaiUpulse!==held.kaiUpulse)throw Error('PUBLIC_LEDGER_HISTORY_CONFLICT');return 'same';}
 if(incoming.sourceHistory.length<held.sourceHistory.length){if(incoming.records.length>held.records.length||BigInt(incoming.kaiUpulse)>BigInt(held.kaiUpulse))throw Error('PUBLIC_LEDGER_HISTORY_CONFLICT');return 'older';}
 if(incoming.records.length<held.records.length||BigInt(incoming.kaiUpulse)<BigInt(held.kaiUpulse))throw Error('PUBLIC_LEDGER_HISTORY_CONFLICT');return 'extends';
}
