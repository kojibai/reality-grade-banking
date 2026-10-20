import type {ReceizKeyFile} from '@receiz/sdk';
import type {BankNoteDeposit,BankNoteInspection,BankNoteRail} from './offline-notes';
import {createConnectedNoteRuntime,type ConnectedNotePorts} from './connected-note-runtime';

type Json=Record<string,any>;
type Projection=BankNoteInspection&{rail:BankNoteRail;kind:'funding'|'handover';funding:Json;receiverUserId?:string;receiverKeyId?:string;redemptionDigest?:string;terminalArtifactSha256:string;terminalSourceBytes:Uint8Array};
export interface ConnectedNoteModule{
 isBankConnectedNoteImage(bytes:Uint8Array):Promise<boolean>;
 isBankConnectedNoteSource(bytes:Uint8Array):Promise<boolean>;
 readBankConnectedNoteImage(bytes:Uint8Array):Promise<Projection>;
 readBankConnectedNoteSource(bytes:Uint8Array):Promise<Projection>;
 exportBankConnectedNoteImage(source:Uint8Array,artwork:Uint8Array):Promise<Uint8Array>;
 createBankConnectedNoteIssue(input:Json):Promise<Json>;
 createBankConnectedNoteCancellation(input:Json):Promise<Json>;
 createBankConnectedNoteHandover(input:Json):Promise<Uint8Array>;
 createBankConnectedNoteClaim(input:Json):Promise<Json>;
 verifyBankConnectedNoteFunding(source:Uint8Array,opening:Uint8Array):Promise<Projection&{accountAfter:Json}>;
 verifyBankConnectedNoteCredit(source:Uint8Array,opening:Uint8Array):Promise<Projection&{credit:Json;accountAfter:Json;proofBytes:Uint8Array}>;
 verifyBankConnectedNoteCancellation(source:Uint8Array,opening:Uint8Array):Promise<{noteId:string;operationId:string;proofBytes:Uint8Array}>;
}
type Context={uid:string;identity:ReceizKeyFile;passphrase:string;request(path:string,options:{method:'GET'|'POST';body?:Record<string,unknown>}):Promise<unknown>;wallet():Promise<unknown>};
const obj=(v:unknown):Json=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('BANK_NOTE_RESPONSE_INVALID');return v as Json;};
const json=(v:unknown)=>new TextEncoder().encode(JSON.stringify(v));
const parse=(v:Uint8Array)=>obj(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(v)));
const path=()=>`/api/connect/offline-notes/connected?origin=${encodeURIComponent(location.origin)}`;
const fields=(response:unknown,decode:(v:string)=>Uint8Array)=>{const v=obj(response);if(v.ok!==true||typeof v.source!=='string'||typeof v.privateAccountOpening!=='string')throw Error('BANK_NOTE_RESULT_PENDING');return{source:decode(v.source),opening:decode(v.privateAccountOpening),cancelled:v.cancelled===true};};
/** Browser composition only. All financial source admission, signed authority,
 * conservation and once-only consumption remain in Receiz v129. */
export function createConnectedNoteApplication(input:Omit<ConnectedNotePorts,'prepare'|'issue'|'cancel'|'prepareCancellation'|'inspect'|'handover'|'image'>&{
 module():Promise<ConnectedNoteModule>;context():Promise<Context>;
 sdk:{createReceizIdentityKeyFile(input:{owner:{uid:string}}):Promise<{keyFile:ReceizKeyFile}>;serializeReceizIdentityArtifact(key:ReceizKeyFile):string;parseReceizIdentityArtifactText(text:string):ReceizKeyFile;receizBase64UrlEncode(bytes:Uint8Array):string;receizBase64UrlDecode(text:string):Uint8Array;receizKaiNow():{pulse:number}};
 artwork(amount:string,id:string,compact?:boolean,rail?:BankNoteRail):Promise<Uint8Array>;
}){
 const decode=input.sdk.receizBase64UrlDecode;
 return createConnectedNoteRuntime({...input,
  async prepare(amountUsdCents,rail){
   if(navigator.onLine===false)throw Error('BANK_NOTE_OFFLINE_CREATION_REQUIRES_CONNECTION');
   const module=await input.module(),context=await input.context();input.assertOpen();if(context.uid!==input.uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');
   const response=obj(await context.request(`${path()}&intent=quote`,{method:'GET'})),quote=obj(response.quote),rate=quote.usdPerPhiMicrocents;
   if(response.ok!==true||typeof rate!=='string'||!(/^[1-9]\d{0,18}$/).test(rate)||typeof quote.quotePulse!=='string'||!/^\d{1,18}$/.test(quote.quotePulse)||!Number.isSafeInteger(quote.issuedAtMs)||!Number.isSafeInteger(quote.expiresAtMs)||quote.expiresAtMs-quote.issuedAtMs!==300000||!['reserveUsdCents','balancePhiMicro','settlementPhiMicro'].every(k=>typeof quote[k]==='string'&&/^(0|[1-9]\d{0,18})$/.test(quote[k])))throw Error('BANK_NOTE_QUOTE_INVALID');
   const amountPhiMicro=(BigInt(amountUsdCents)*1000000000000n+BigInt(rate)/2n)/BigInt(rate);
   const noteIdentity=(await input.sdk.createReceizIdentityKeyFile({owner:{uid:crypto.randomUUID()}})).keyFile;
   const authorization=await module.createBankConnectedNoteIssue({identity:context.identity,passphrase:context.passphrase,accountUserId:input.uid,noteIdentity,rail,amountUsdCents,...(rail==='settlement'?{amountPhiMicro:amountPhiMicro.toString()}:{}),quotePulse:quote.quotePulse,nowMs:quote.issuedAtMs,usdPerPhiMicrocents:rate,expectedReserveBeforeUsdCents:quote.reserveUsdCents,expectedWalletBeforePhiMicro:quote.balancePhiMicro});
   input.assertOpen();return{noteId:authorization.noteId,operationId:authorization.operationId,amountUsdCents,rail,authorization,noteIdentityBytes:new TextEncoder().encode(input.sdk.serializeReceizIdentityArtifact(noteIdentity))};
  },
  async issue(authorization,operationId,recoverFirst,allowSubmit=true){
   const module=await input.module(),context=await input.context(),a=obj(authorization);input.assertOpen();if(context.uid!==input.uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');
   let response:unknown=recoverFirst?await context.request(`${path()}&allocationId=${operationId}`,{method:'GET'}):{found:false};
   if(obj(response).found===false){if(!allowSubmit)throw Error('BANK_NOTE_CANCELLATION_PENDING');response=await context.request(path(),{method:'POST',body:{action:'issue',authorization}});}
   const wire=fields(response,decode);if(wire.cancelled)throw Error('BANK_NOTE_CANCELLED');
   const proof=await module.verifyBankConnectedNoteFunding(wire.source,wire.opening),f=proof.funding;
   if(f.operationId!==operationId||f.noteId!==a.noteId||f.accountUserId!==input.uid||f.issuer?.keyId!==input.keyId||f.noteAuthority?.keyId!==a.noteAuthority?.keyId||f.rail!==a.rail||f.amountUsdCents!==a.amountUsdCents||a.rail==='settlement'&&(f.amountPhiMicro!==a.amountPhiMicro||f.usdPerPhiMicrocents!==a.usdPerPhiMicrocents))throw Error('BANK_NOTE_EXACT_RESUME_REQUIRED');
   return{...proof,sourceBytes:wire.source,privateOpeningBytes:wire.opening};
  },
  async prepareCancellation(authorization){const module=await input.module(),context=await input.context();if(context.uid!==input.uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');return json(await module.createBankConnectedNoteCancellation({authorization,identity:context.identity,passphrase:context.passphrase}));},
  async cancel(authorization,preparedRequest){
   const module=await input.module(),context=await input.context(),a=obj(authorization);if(context.uid!==input.uid)throw Error('BANK_NOTE_IDENTITY_CHANGED');
   if(!preparedRequest)throw Error('BANK_NOTE_SOURCE_REQUIRED');const signed=parse(preparedRequest);
   const response=fields(await context.request(path(),{method:'POST',body:{action:'cancel',authorization:signed}}),decode),proof=await module.verifyBankConnectedNoteCancellation(response.source,response.opening);
   if(!response.cancelled||proof.operationId!==a.operationId||proof.noteId!==a.noteId)throw Error('BANK_NOTE_EXACT_RESUME_REQUIRED');return proof.proofBytes;
  },
  inspect:async source=>(await input.module()).readBankConnectedNoteSource(source),
  async handover(source,receivingRequestBytes,noteIdentityBytes){const module=await input.module();return module.createBankConnectedNoteHandover({fundingSourceBytes:source,receivingRequestBytes,noteIdentity:input.sdk.parseReceizIdentityArtifactText(new TextDecoder('utf-8',{fatal:true}).decode(noteIdentityBytes)),kai:String(input.sdk.receizKaiNow().pulse)});},
  async image(source,note){return(await input.module()).exportBankConnectedNoteImage(source,await input.artwork(note.amountUsdCents,note.noteId,false,note.rail));},
 });
}
export async function openConnectedAccountNote(module:ConnectedNoteModule,bytes:Uint8Array,context:{receiverUserId:string;receiverKeyId:string}){
 const held=await readConnectedNote(module,bytes);
 if(held.kind!=='handover'||held.receiverUserId!==context.receiverUserId||held.receiverKeyId!==context.receiverKeyId||!held.redemptionDigest)throw Error('BANK_NOTE_IDENTITY_BINDING_REQUIRED');
 return{...held,receiverUserId:held.receiverUserId,receiverKeyId:held.receiverKeyId,redemptionDigest:held.redemptionDigest};
}
/** Format routing only; the following source read remains mandatory. The
 * receiving vault stores the exact expanded source, rather than its PNG. */
export async function isConnectedNote(module:ConnectedNoteModule,bytes:Uint8Array){return await module.isBankConnectedNoteImage(bytes)||await module.isBankConnectedNoteSource(bytes);}
export async function readConnectedNote(module:ConnectedNoteModule,bytes:Uint8Array){return await module.isBankConnectedNoteImage(bytes)?module.readBankConnectedNoteImage(bytes):module.readBankConnectedNoteSource(bytes);}
export async function prepareConnectedAccountNoteClaim(input:{module:ConnectedNoteModule;bytes:Uint8Array;context:Context;encode(bytes:Uint8Array):string}){
 const held=await openConnectedAccountNote(input.module,input.bytes,{receiverUserId:input.context.uid,receiverKeyId:input.context.identity.keyId});
 const claim=await input.module.createBankConnectedNoteClaim({sourceBytes:held.terminalSourceBytes,identity:input.context.identity,passphrase:input.context.passphrase,accountUserId:input.context.uid});
 const body=json({action:'claim',claim,source:input.encode(held.terminalSourceBytes)});if(body.length>4*1024*1024)throw Error('BANK_NOTE_TRANSPORT_CAPACITY');return body;
}
export async function submitConnectedAccountNoteClaim(input:{module:ConnectedNoteModule;bytes:Uint8Array;prepared:Uint8Array;recoverFirst:boolean;context:Context;decode(text:string):Uint8Array}):Promise<BankNoteDeposit>{
 const held=await openConnectedAccountNote(input.module,input.bytes,{receiverUserId:input.context.uid,receiverKeyId:input.context.identity.keyId}),body=parse(input.prepared);
 if(body.action!=='claim'||body.claim?.sourceSha256!==held.terminalArtifactSha256||body.claim?.noteId!==held.noteId||body.claim?.receiverUserId!==input.context.uid||body.claim?.receiver?.keyId!==input.context.identity.keyId)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
 let response:unknown=input.recoverFirst?await input.context.request(`${path()}&noteId=${held.noteId}`,{method:'GET'}):{found:false};
 if(obj(response).found===false)response=await input.context.request(path(),{method:'POST',body});
 const wire=fields(response,input.decode),credit=await input.module.verifyBankConnectedNoteCredit(wire.source,wire.opening);
 if(credit.noteId!==held.noteId||credit.credit.receiverUserId!==input.context.uid||credit.credit.receiverKeyId!==input.context.identity.keyId||credit.credit.terminalSourceSha256!==held.terminalArtifactSha256||credit.credit.redemptionDigest!==body.claim.claimDigest)throw Error('BANK_NOTE_DEPOSIT_BINDING_MISMATCH');
 return{rail:credit.rail,noteId:credit.noteId,amountUsdCents:credit.amountUsdCents,amountPhiMicro:credit.amountPhiMicro,walletAfterPhiMicro:credit.accountAfter.balancePhiMicro,reserveAfterUsdCents:credit.accountAfter.reserveUsdCents,proofBytes:credit.proofBytes};
}
