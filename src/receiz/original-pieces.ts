import type {ReceizIdentityLoginProof} from '@receiz/sdk';
import {BANK_APPLICATION_ID} from './config';
import {loadReceiz} from './client';
import {openCanonicalProofFile} from './proof-capture';
import {proofDigest,type ProofLibrary,type ProofSource} from './proof-library';
import {heldOriginalOwnerIds,holdsOriginalPieceDelivery,verifyOriginalPieceArchive,type OriginalPieceIdentity} from './original-piece-proof';
import {EXACT_BYTE_BLOCK_MAX_BYTES,parseExactByteBlockReference,writeExactByteBlocks,type ExactByteBlockReference} from '../../native/receiz/packages/receiz-sdk/src/exactByteBlocks';
import {canonicalOriginalByteRanges,digestOriginalPieceBytes,projectOriginalPieceOwnership,type OriginalByteRange} from '../../native/receiz/app/lib/profile/showcase/originalPieceRanges';
import {originalPieceChallenge,pieceCanonical,pieceDigest,readOriginalPieceCommand,selectedOriginalPieces,verifyOriginalPieceConsent,
  type OriginalPieceCommand,type OriginalPieceDelivery,type OriginalPieceKey} from './original-piece-runtime.js';
import {parseOriginalReceivingAddress} from '../../native/receiz/app/lib/profile/showcase/originalReceivingAddress';

export type OriginalPieceSelection=Readonly<{original:File|{heldProofDigest:string};recipient:string;ranges:readonly OriginalByteRange[]}>;
export type OriginalPieceReview=Readonly<{command:OriginalPieceCommand;filename:string;recipient:string;confirmationDigest:string}>;
export type HeldOriginalPiece=Readonly<{file:File;delivery:OriginalPieceDelivery;proofDigest:string}>;
export type SentOriginalPiece=HeldOriginalPiece&Readonly<{operationId:string;remainingProofDigest?:string;remaining:ReturnType<typeof projectOriginalPieceOwnership>}>;
export type OriginalPieceSummary=Readonly<{proofDigest:string;filename:string;originalSha256:string;headDigest:string;
  ownedBytes:number;totalBytes:number;percentage:string;ranges:readonly OriginalByteRange[]}>;
type Staged=Readonly<{root:ExactByteBlockReference;filename:string;mimeType:string}>;
type Point=Readonly<{schema:'bankeiz.original-piece.send.v1';command:OriginalPieceCommand;proof:ReceizIdentityLoginProof;
  original?:Staged;heldProofDigest?:string;resultDigest?:string;remainingProofDigest?:string}>;
const packetName='original-pieces.receizpieces',packetType='application/json';
const endpoint=`/api/connect/bank/original-pieces?applicationId=${BANK_APPLICATION_ID}`;
const fail=(code:string):never=>{throw Error(`BANK_ORIGINAL_PIECE_${code}`);};
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:fail('RESPONSE_INVALID');

export interface OriginalPieces {
  prepare(selection:OriginalPieceSelection):Promise<OriginalPieceReview>;
  send(review:OriginalPieceReview,confirmationDigest:string):Promise<SentOriginalPiece>;
  pending():Promise<{operationId:string;command:OriginalPieceCommand}|null>;
  resumePending():Promise<SentOriginalPiece|null>;
  inspect(file:File):Promise<OriginalPieceDelivery>;
  receive(file:File):Promise<HeldOriginalPiece>;
  reopen(proofDigest:string):Promise<HeldOriginalPiece>;
  list():Promise<readonly OriginalPieceSummary[]>;
}

export function createOriginalPieces(input:{binding:OriginalPieceIdentity&Pick<OriginalPieceKey,'alg'|'publicKeyRawB64u'>;assertOpen():void;
  request(body:Record<string,unknown>,path:string):Promise<unknown>;
  sign(challengeB64Url:string):Promise<ReceizIdentityLoginProof>;
  checkpoint:{read():Promise<unknown>;write(next:Point,expected:unknown):Promise<void>};
  proofLibrary():Promise<ProofLibrary>;archive(digest?:string):Promise<ProofSource[]>;
  readHeldOriginal?(digest:string):Promise<File|null>;
}):OriginalPieces {
  const {binding}=input, ownerIds=heldOriginalOwnerIds(binding);
  const senderKey={keyId:binding.keyId,alg:binding.alg,publicKeyRawB64u:binding.publicKeyRawB64u};
  const reviews=new WeakMap<OriginalPieceReview,{staged?:Staged;held:File|OriginalPieceDelivery;heldProofDigest?:string}>();
  const inspections=new WeakMap<File,Promise<OriginalPieceDelivery>>();
  async function request(body:Record<string,unknown>) {
    input.assertOpen();const response=record(await input.request(body,endpoint));input.assertOpen();return response;
  }
  async function readCheckpoint() {
    input.assertOpen();const raw=await input.checkpoint.read();input.assertOpen();if(raw===null)return null;
    const value=record(raw),command=readOriginalPieceCommand(value.command as OriginalPieceCommand),proof=value.proof as ReceizIdentityLoginProof;
    if(value.schema!=='bankeiz.original-piece.send.v1'||command.senderKeyId!==binding.keyId||!ownerIds.includes(command.senderReceizId)
      ||[value.heldProofDigest,value.resultDigest,value.remainingProofDigest].some(digest=>digest!==undefined&&!pieceDigest(digest)))fail('CHECKPOINT_INVALID');
    if(value.original) {
      const original=record(value.original);
      if(typeof original.filename!=='string'||typeof original.mimeType!=='string'
        ||parseExactByteBlockReference(original.root).contentByteLength!==command.byteLength)fail('CHECKPOINT_INVALID');
    }
    await verifyOriginalPieceConsent(command,proof,senderKey);input.assertOpen();return raw as Point;
  }
  async function readArchived(digest:string) {
    if(!pieceDigest(digest))fail('SOURCE_INVALID');
    const sources=await input.archive(digest);input.assertOpen();
    const source=sources.find(item=>item.kind==='original-piece');
    if(!source||await proofDigest(source.bytes)!==digest)return fail('SOURCE_NOT_HELD');
    const file=new File([new Uint8Array(source.bytes)],source.filename,{type:packetType});
    const {delivery}=await verifyOriginalPieceArchive(file,binding);input.assertOpen();return {file,delivery,proofDigest:digest};
  }
  function inspect(file:File) {
    input.assertOpen();let checked=inspections.get(file);
    if(!checked){checked=(async()=>{const {delivery,received}=await verifyOriginalPieceArchive(file,binding);input.assertOpen();if(!received)fail('OWNER_MISMATCH');return delivery;})();inspections.set(file,checked);}
    return checked;
  }
  async function retainPacket(file:File) {
    const library=await input.proofLibrary(), review=await library.inspect(file);input.assertOpen();
    if(review.items.length!==1||review.items[0].kind!=='original-piece')return fail('DELIVERY_INVALID');
    await library.retain(review);input.assertOpen();return review.items[0].digest;
  }
  async function readPacket(raw:unknown) {
    const packet=record(raw),digest=packet.digest,size=packet.byteLength;
    if(!pieceDigest(digest)||typeof size!=='number'||!Number.isSafeInteger(size)||size<1)return fail('DELIVERY_INVALID');
    const sdk=await loadReceiz(),parts:ArrayBuffer[]=[];
    for(let offset=0;offset<size;offset+=EXACT_BYTE_BLOCK_MAX_BYTES){
      const {bytes:encoded}=await request({operation:'read-delivery',digest,offset});
      const count=Math.min(EXACT_BYTE_BLOCK_MAX_BYTES,size-offset);
      if(typeof encoded!=='string'||encoded.length!==Math.ceil(count*4/3))return fail('DELIVERY_INVALID');
      const bytes=sdk.receizBase64UrlDecode(encoded);
      if(bytes.length!==count||sdk.receizBase64UrlEncode(bytes)!==encoded)return fail('DELIVERY_INVALID');
      parts.push(new Uint8Array(bytes).buffer);
    }
    const file=new File(parts,packetName,{type:packetType});
    if(await digestOriginalPieceBytes(file)!==digest)return fail('DELIVERY_INVALID');
    const {delivery}=await verifyOriginalPieceArchive(file,binding);input.assertOpen();return {file,delivery,proofDigest:digest};
  }
  async function retainRemaining(delivery:OriginalPieceDelivery, held:File|OriginalPieceDelivery, ownerReceizId:string) {
    const sdk=await loadReceiz(),pieces=[];
    for(const piece of delivery.head.layout.pieces){
      if(piece.ownerReceizId!==ownerReceizId)continue;
      const end=piece.offset+piece.byteLength;
      const previous=held instanceof File?undefined:held.pieces.find(value=>value.offset<=piece.offset&&value.offset+value.byteLength>=end);
      const exact=held instanceof File?held.slice(piece.offset,end):previous?.bytes.slice(piece.offset-previous.offset,end-previous.offset);
      if(exact)pieces.push({offset:piece.offset,bytes:sdk.receizBase64UrlEncode(new Uint8Array(await exact.arrayBuffer()))});
    }
    if(!pieces.length)return;
    const seals=await Promise.all(delivery.ancestry.map(async value=>sdk.receizBase64UrlEncode(new Uint8Array(await value.exactArtifact.arrayBuffer()))));
    const remainder=new File([pieceCanonical({schema:'receiz.original-piece.package.v1',ownerReceizId,head:seals.at(-1),pieces,
      ...(seals.length>1?{ancestorSeals:seals.slice(0,-1)}:{})})],packetName,{type:packetType});
    return retainPacket(remainder);
  }
  async function resolveCheckpoint(checkpoint:Point,held?:File|OriginalPieceDelivery):Promise<SentOriginalPiece> {
    const {command,proof,original,resultDigest}=checkpoint;
    const result=resultDigest?await readArchived(resultDigest):await readPacket((await request({operation:'execute',command,proof,
      ...(original?{original}:{}),delivery:'bounded'})).packet);
    const {delivery}=result;
    const expected=selectedOriginalPieces(delivery.head);
    if(pieceCanonical(delivery.head.command)!==pieceCanonical(command)||delivery.ownerReceizId!==command.recipientReceizId
      ||delivery.pieces.length!==expected.length||expected.some(piece=>!delivery.pieces.some(candidate=>
        candidate.offset===piece.offset&&candidate.byteLength===piece.byteLength&&candidate.sha256===piece.sha256)))return fail('DELIVERY_INVALID');
    let remainingProofDigest=checkpoint.remainingProofDigest;
    const remaining=projectOriginalPieceOwnership(delivery.head.layout,command.senderReceizId);
    if(!resultDigest){
      const retained=await retainPacket(result.file);if(retained!==result.proofDigest)return fail('DELIVERY_INVALID');
      // Reopen a selected source from device custody when this execution resumed after a reload.
      if(remaining.ownedBytes)try{
        if(!held&&checkpoint.heldProofDigest)held=(await readArchived(checkpoint.heldProofDigest)).delivery;
        if(!held&&checkpoint.original)held=await input.readHeldOriginal?.(command.originalSha256)??undefined;
        if(held)remainingProofDigest=await retainRemaining(delivery,held,command.senderReceizId);
      }catch{ /* The retained transfer stays available even if there is no reconstructable local remainder. */ }
      await input.checkpoint.write({...checkpoint,resultDigest:retained,...(remainingProofDigest?{remainingProofDigest}:{})},checkpoint);
      input.assertOpen();
    }
    return {...result,operationId:command.operationId,...(remainingProofDigest?{remainingProofDigest}:{}),remaining};
  }
  return Object.freeze({
    async prepare(selection:OriginalPieceSelection) {
      const address=parseOriginalReceivingAddress(selection.recipient);
      if(!address||address.keyId===binding.keyId)return fail('RECIPIENT_INVALID');
      const previous=await readCheckpoint();if(previous&&!previous.resultDigest)return fail('SEND_PENDING');
      const recipient=`${address.ownerReceizId}#${address.keyId}`;
      let sourceIdentity:string,originalSha256:string,filename:string,senderReceizId:string,byteLength:number,ranges:OriginalByteRange[];
      let original:Staged|undefined,heldSource:File|OriginalPieceDelivery;
      if(selection.original instanceof File){
        const file=selection.original;heldSource=file;
        const opened=(await openCanonicalProofFile(file)).sealedArtifact;
        const continuity=opened.verification.assetContinuity;
        if(opened.kind!=='receiz.native-record-seal'||continuity?.state!=='verified'||typeof continuity.artifactId!=='string'
          ||!ownerIds.includes(opened.continuity.ownerReceizId))return fail('SOURCE_INVALID');
        sourceIdentity=continuity.artifactId;originalSha256=opened.artifactSha256;senderReceizId=opened.continuity.ownerReceizId;
        filename=file.name;byteLength=file.size;ranges=canonicalOriginalByteRanges(selection.ranges,byteLength);
        const sdk=await loadReceiz();
        const root=await writeExactByteBlocks(file,async (reference,bytes)=>{
          const staged=await request({operation:'stage',digest:reference.sha256,bytes:sdk.receizBase64UrlEncode(bytes)});
          if(staged.digest!==reference.sha256)fail('STAGING_INVALID');
        });
        original={root,filename,mimeType:file.type||opened.mimeType};
      }else{
        const {delivery}=await readArchived(selection.original.heldProofDigest);heldSource=delivery;
        if(!holdsOriginalPieceDelivery(delivery,binding))return fail('OWNER_MISMATCH');
        ({sourceIdentity,originalSha256,byteLength}=delivery.head.command);senderReceizId=delivery.ownerReceizId;filename=delivery.head.filename;
        ranges=canonicalOriginalByteRanges(selection.ranges,byteLength);
        const held=[...delivery.pieces].sort((a,b)=>a.offset-b.offset);
        if(ranges.some(range=>{let next=range.offset;for(const piece of held){if(piece.offset>next)break;next=Math.max(next,piece.offset+piece.byteLength);}
          return next<range.offset+range.byteLength;}))return fail('SOURCE_RANGES_NOT_HELD');
      }
      const response=await request({operation:'prepare',senderReceizId,recipient,ranges,...(original?{original}:{originalSha256})});
      const command=readOriginalPieceCommand(response.command as OriginalPieceCommand);
      if(command.sourceIdentity!==sourceIdentity||command.originalSha256!==originalSha256||command.byteLength!==byteLength
        ||command.senderReceizId!==senderReceizId||command.senderKeyId!==binding.keyId||command.recipientReceizId!==address.ownerReceizId
        ||command.recipientKeyId!==address.keyId||pieceCanonical(command.ranges)!==pieceCanonical(ranges))return fail('REVIEW_MISMATCH');
      const confirmationDigest=await digestOriginalPieceBytes(new Blob([pieceCanonical(command)]));input.assertOpen();
      const review=Object.freeze({command:Object.freeze({...command,ranges:Object.freeze(command.ranges.map(range=>Object.freeze({...range})))}),
        filename,recipient,confirmationDigest});reviews.set(review,{staged:original,held:heldSource,...(!(selection.original instanceof File)?{heldProofDigest:selection.original.heldProofDigest}:{})});return review;
    },
    async send(review:OriginalPieceReview,confirmationDigest:string){
      const selected=reviews.get(review);
      if(!selected||review.confirmationDigest!==confirmationDigest)return fail('EXACT_CONFIRMATION_REQUIRED');
      const previous=await readCheckpoint();if(previous&&!previous.resultDigest)return fail('SEND_PENDING');
      const {staged,held,heldProofDigest}=selected;
      const {command}=review,proof=await input.sign(originalPieceChallenge(command));input.assertOpen();
      await verifyOriginalPieceConsent(command,proof,senderKey);
      const checkpoint:Point={schema:'bankeiz.original-piece.send.v1',command,proof,...(staged?{original:staged}:{}),...(heldProofDigest?{heldProofDigest}:{})};
      await input.checkpoint.write(checkpoint,previous);reviews.delete(review);input.assertOpen();return resolveCheckpoint(checkpoint,held);
    },
    async pending(){const checkpoint=await readCheckpoint();return checkpoint&&!checkpoint.resultDigest?{operationId:checkpoint.command.operationId,command:checkpoint.command}:null;},
    async resumePending(){const checkpoint=await readCheckpoint();return checkpoint?resolveCheckpoint(checkpoint):null;},
    inspect,
    async receive(file:File){const delivery=await inspect(file),digest=await retainPacket(file);return {file,delivery,proofDigest:digest};},
    async reopen(digest:string){const result=await readArchived(digest);if(!holdsOriginalPieceDelivery(result.delivery,binding))return fail('OWNER_MISMATCH');return result;},
    async list(){
      const sources=await input.archive(),facts=[] as HeldOriginalPiece[];
      for(const source of sources)if(source.kind==='original-piece'){
        const file=new File([new Uint8Array(source.bytes)],source.filename,{type:packetType});
        const {delivery}=await verifyOriginalPieceArchive(file,binding);facts.push({file,delivery,proofDigest:await proofDigest(source.bytes)});
      }
      const superseded=new Set(facts.flatMap(({delivery})=>delivery.ancestry.slice(0,-1).map(revision=>revision.headDigest)));
      const heads=new Map(facts.filter(({delivery})=>!superseded.has(delivery.headDigest)).map(({delivery})=>[delivery.headDigest,delivery]));
      const summaries=new Map<string,OriginalPieceSummary>();
      facts.sort((a,b)=>b.delivery.head.revision-a.delivery.head.revision);
      for(const {delivery,proofDigest} of facts){
        if(!holdsOriginalPieceDelivery(delivery,binding))continue;
        const successors=[...heads.values()].filter(candidate=>candidate.ancestry.some(revision=>revision.headDigest===delivery.headDigest));
        if(successors.length!==1)continue;
        const current=successors[0];
        const {totalBytes,ranges:owned}=projectOriginalPieceOwnership(current.head.layout,delivery.ownerReceizId);
        const ranges=owned.flatMap(range=>delivery.pieces.flatMap(piece=>{
          const offset=Math.max(piece.offset,range.offset),end=Math.min(piece.offset+piece.byteLength,range.offset+range.byteLength);
          return end>offset?[{offset,byteLength:end-offset}]:[];
        }));
        if(!ranges.length)continue;
        const ownedBytes=ranges.reduce((sum,range)=>sum+range.byteLength,0);
        const hundredths=BigInt(ownedBytes)*10_000n/BigInt(totalBytes);
        const decimals=(hundredths%100n).toString().padStart(2,'0').replace(/0+$/u,'');
        const percentage=hundredths===0n?'<0.01%':`${hundredths/100n}${decimals?'.'+decimals:''}%`;
        const key=`${current.headDigest}:${pieceCanonical(ranges)}`;
        if(!summaries.has(key))summaries.set(key,{proofDigest,filename:delivery.head.filename,originalSha256:delivery.head.command.originalSha256,
          headDigest:current.headDigest,ownedBytes,totalBytes,percentage,ranges});
      }
      input.assertOpen();return [...summaries.values()];
    },
  });
}
