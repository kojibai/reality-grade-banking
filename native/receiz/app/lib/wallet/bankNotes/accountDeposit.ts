import {verifyBankNoteRedemption,readBankNoteRedemption,packBankNoteRedemptionSource} from './redemption';
import {verifyBankReserveCreditArtifact,exportBankNoteDepositReceipt} from './credit';
import {packBankNoteBytes,unpackBankNoteBytes} from './compression';
import {encodeBankFundedSource,decodeBankFundedSource} from './sourceCodec';
import {receizBase64UrlDecode} from '../../../../packages/receiz-sdk/src/identity';
import {sha256ReceizBytes} from '../../../../packages/receiz-sdk/src/index';
import {receizCurrentPinnedSignatureV4Roots} from '../../../../packages/receiz-sdk/src/verifier/roots';
import {canonicalizeReceizConstitution as canonical} from '../../../../packages/receiz-sdk/src/constitution';
import type {ReceizSignatureV4RootPublicKey} from '../../../../packages/receiz-sdk/src/verifier/signatureV4';
import {readPngTextChunks,stripPngTextChunksByKeyword,insertPngTextChunks} from '../../../utils/pngChunks';

const key='receiz.bank.offline-note.v1';
export type BankNoteAccountDepositContext=Readonly<{receiverUserId:string;receiverKeyId:string;roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>;
const json=(bytes:Uint8Array)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
const png=(bytes:Uint8Array)=>bytes.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
const snapshotRoots=(roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>)=>new Map([...(roots??receizCurrentPinnedSignatureV4Roots())].map(([kid,key])=>[kid,structuredClone(key)]));
// Reusing an exact admitted original avoids repeating the complete funding and
// Groth16 graph for inspection, retention and display. Policy is part of the
// key; edited roots or bytes cannot reuse a previous admission. Rejected work
// is evicted, and no persistent/cache label grants financial authority.
const admissions=new Map<string,Promise<Awaited<ReturnType<typeof verifyBankNoteRedemption>>>>();
async function terminalAdmission(bytes:Uint8Array,context:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>){
 const roots=snapshotRoots(context.roots);
 const policy=canonical([...roots.entries()].sort(([a],[b])=>a.localeCompare(b)));
 const cacheKey=`${await sha256ReceizBytes(bytes)}:${await sha256ReceizBytes(new TextEncoder().encode(policy))}`;
 let held=admissions.get(cacheKey);
 if(!held){
  held=verifyBankNoteRedemption(bytes,{roots});admissions.set(cacheKey,held);
  void held.catch(()=>{if(admissions.get(cacheKey)===held)admissions.delete(cacheKey);});
  if(admissions.size>16)admissions.delete(admissions.keys().next().value!);
 }
 return held;
}

/** Transport inspection only: false means the existing held-Note format, never
 * that an unverified incoming Note has acquired account credit. */
export function isBankNoteAccountDeposit(input:Uint8Array):boolean{
 if(input.length>(png(input)?8:32)*1024*1024)throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
 if(png(input)){
  const chunks=readPngTextChunks(input,{keyword:key});if(chunks.length!==1)throw Error('BANK_COMPLETE_NOTE_IMAGE_REQUIRED');
  const body=json(new TextEncoder().encode(chunks[0]!.text));
  if(body?.schema==='receiz.bank.note-image-transport.v1')return false;
  if(body?.schema!=='receiz.bank.note-account-deposit-image.v1'||Object.keys(body).sort().join('|')!=='schema|terminalWire'||typeof body.terminalWire!=='string')throw Error('BANK_COMPLETE_NOTE_IMAGE_REQUIRED');
  return true;
 }
 const body=json(input);return ['receiz.bank.note-redemption-source.v1','receiz.bank.note-redemption-source.v2'].includes(body?.schema);
}

/** The existing v129 terminal proof supplies consumption. The recipient does
 * not consume again and needs no receiver authenticator. Retaining this source
 * is separate from the host's once-only credit of its funded account. */
export async function readBankNoteAccountDeposit(input:Uint8Array,context:Readonly<{roots?:ReadonlyMap<string,ReceizSignatureV4RootPublicKey>}>= {}){
 if(!input.length||input.length>(png(input)?8:32)*1024*1024)throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
 const roots=snapshotRoots(context.roots),bytes=input.slice();
 let terminalSourceBytes=bytes;
 if(png(bytes)){
  if(!isBankNoteAccountDeposit(bytes))throw Error('BANK_NOTE_TERMINAL_PROOF_REQUIRED');
  const body=JSON.parse(readPngTextChunks(bytes,{keyword:key})[0]!.text);
  terminalSourceBytes=await unpackBankNoteBytes(body.terminalWire);
 }
 const proof=await terminalAdmission(terminalSourceBytes,{roots});
 if(readBankNoteRedemption(proof).intent.schema==='receiz.bank.note-local-credit.v1')throw Error('BANK_LOCAL_CREDIT_RECONCILIATION_REQUIRED');
 return Object.freeze({rail:proof.rail,noteId:proof.noteId,amountPhiMicro:proof.amountPhiMicro,amountUsdCents:proof.amountUsdCents,
  receiverUserId:proof.receiverUserId,receiverKeyId:proof.receiverKeyId,redemptionDigest:proof.redemptionDigest,terminalArtifactSha256:proof.artifactSha256,
  terminalSourceBytes:terminalSourceBytes.slice()});
}

export async function openBankNoteAccountDeposit(input:Uint8Array,context:BankNoteAccountDepositContext){
 const {receiverUserId,receiverKeyId}=context;
 const proof=await readBankNoteAccountDeposit(input,context);
 if(proof.receiverUserId!==receiverUserId||proof.receiverKeyId!==receiverKeyId)throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');return proof;
}

/** Re-encode only the unsigned transport wrapper. Every original signed
 * artifact and funded source remains complete; the exact incoming container
 * stays retained locally. Redundant whitespace/base64 expansion must not turn
 * an otherwise admissible receipt into a permanently oversized API request. */
export async function prepareBankNoteAccountDepositSubmission(input:Uint8Array,context:BankNoteAccountDepositContext){
 const held=await openBankNoteAccountDeposit(input,context),source=json(held.terminalSourceBytes);
 const normalizeFunding=(value:unknown)=>encodeBankFundedSource(decodeBankFundedSource(value));
 const compact=source.schema==='receiz.bank.note-redemption-source.v2'
  ? new TextEncoder().encode(JSON.stringify({schema:source.schema,
    terminalArtifactWire:await packBankNoteBytes(await unpackBankNoteBytes(source.terminalArtifactWire)),
    fundedSourceWire:await packBankNoteBytes(new TextEncoder().encode(JSON.stringify(normalizeFunding(json(await unpackBankNoteBytes(source.fundedSourceWire))))))}))
  : await packBankNoteRedemptionSource(new TextEncoder().encode(JSON.stringify({...source,fundedSource:normalizeFunding(source.fundedSource)})));
 const body={terminalArtifactBytes:await packBankNoteBytes(compact)};
 if(new TextEncoder().encode(JSON.stringify(body)).length>4*1024*1024)throw Error('BANK_NOTE_TRANSPORT_CAPACITY');
 return body;
}

export async function exportBankNoteAccountDepositImage(terminal:Uint8Array,artwork:Uint8Array,context:BankNoteAccountDepositContext):Promise<Uint8Array>{
 const held=await openBankNoteAccountDeposit(terminal,context);
 const terminalWire=await packBankNoteBytes(held.terminalSourceBytes);
 const image=insertPngTextChunks(stripPngTextChunksByKeyword(artwork,key).pngBytes,[{keyword:key,text:JSON.stringify({schema:'receiz.bank.note-account-deposit-image.v1',terminalWire})}]);
 if(image.length>8*1024*1024)throw Error('BANK_NOTE_TRANSPORT_CAPACITY');return image;
}

export async function verifyBankNoteAccountDepositCredit(response:unknown,original:Uint8Array,context:BankNoteAccountDepositContext){
 const policy={receiverUserId:context.receiverUserId,receiverKeyId:context.receiverKeyId,roots:snapshotRoots(context.roots)};
 const held=await openBankNoteAccountDeposit(original,policy),value=structuredClone(response) as {artifactBytes?:unknown;privateCashSnapshot?:unknown};
 if(!value||typeof value.artifactBytes!=='string'||typeof value.privateCashSnapshot!=='string')throw Error('BANK_NOTE_DEPOSIT_PENDING');
 const credit=await verifyBankReserveCreditArtifact(receizBase64UrlDecode(value.artifactBytes),receizBase64UrlDecode(value.privateCashSnapshot),{roots:policy.roots,terminalSource:held.terminalSourceBytes});
 if(credit.credit.receiverUserId!==held.receiverUserId||credit.credit.receiverKeyId!==held.receiverKeyId||credit.credit.redemptionDigest!==held.redemptionDigest)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
 return {rail:credit.rail,noteId:held.noteId,amountPhiMicro:held.amountPhiMicro,amountUsdCents:held.amountUsdCents,
  walletAfterPhiMicro:credit.snapshot.walletAfterPhiMicro,reserveAfterUsdCents:credit.snapshot.reserveAfterUsdCents,proofBytes:await exportBankNoteDepositReceipt(credit)};
}
