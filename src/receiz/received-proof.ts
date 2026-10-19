import type {ReceizOpenedArtifact,ReceizSealedArtifact} from '@receiz/sdk';
import {loadReceiz} from './client';
import type {ProofSource} from './proof-library';
export type ReceivedProofReview=Readonly<{digest:string;filename:string;title:string;size:number;owner:string;kind:'hold'|'claim'}>;
type Wire={digest:string;filename:string;mimeType:string;bytesB64u:string};
type Checkpoint={status:'unknown'|'claimed'|'held';source:Wire;result?:Wire};
export type ReceivedProofState={schema:'bank.received-proof.v1';owner:string;current:Checkpoint;history:{sourceDigest:string;resultDigest:string}[]};
export type ReceivedProofStatus={status:Checkpoint['status'];digest:string;filename:string};
const MAX=3*1024*1024,MAX_OWNED=32*1024*1024;
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v:object,allowed:string[])=>Object.keys(v).every(key=>allowed.includes(key));
const name=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=240&&!/[\x00-\x1f\x7f/\\]/.test(v);
function fail(code:string):never{throw Error(`PROOF_RECEIVE_${code}`);}
const sourceFile=(wire:Wire,bytes:Uint8Array)=>new File([new Uint8Array(bytes)],wire.filename,{type:wire.mimeType});
async function unpack(wire:Wire){
 if(!wire||Object.keys(wire).sort().join('|')!=='bytesB64u|digest|filename|mimeType'||!hex(wire.digest)||!name(wire.filename)||typeof wire.mimeType!=='string'||wire.mimeType.length>160||typeof wire.bytesB64u!=='string'||wire.bytesB64u.length>Math.ceil(MAX_OWNED*4/3))fail('CHECKPOINT_INVALID');
 const sdk=await loadReceiz(),bytes=sdk.receizBase64UrlDecode(wire.bytesB64u);
 if(!bytes.length||bytes.length>MAX_OWNED||sdk.receizBase64UrlEncode(bytes)!==wire.bytesB64u||await sdk.sha256ReceizBytes(bytes)!==wire.digest)fail('CHECKPOINT_INVALID');return bytes;
}
export async function readReceivedProofState(raw:unknown,owner?:string):Promise<ReceivedProofState|null>{
 if(raw===null||raw===undefined)return null;const state=raw as ReceivedProofState;
 if(!object(state)||!keys(state,['schema','owner','current','history'])||state.schema!=='bank.received-proof.v1'||typeof state.owner!=='string'||!state.owner.endsWith('.receiz.id')||state.owner.length>240||owner!==undefined&&state.owner!==owner||!object(state.current)||!keys(state.current,['status','source','result'])||!['unknown','claimed','held'].includes(state.current.status)||!Array.isArray(state.history)||state.history.length>1000||state.history.some(item=>!object(item)||!keys(item,['sourceDigest','resultDigest'])||!hex(item.sourceDigest)||!hex(item.resultDigest)))fail('CHECKPOINT_INVALID');
 await unpack(state.current.source);if(state.current.status==='unknown'&&state.current.result)fail('CHECKPOINT_INVALID');if(state.current.status!=='unknown'&&!state.current.result)fail('CHECKPOINT_INVALID');if(state.current.result)await unpack(state.current.result);return state;
}
/** Receipt/claim choreography only. Receiz's canonical verifier and existing
 * source-coordinated bearer claim own the ownership effect. No cash credit. */
export function createReceivedProof(input:{owner:string;assertOpen():void;open(file:File):Promise<ReceizOpenedArtifact>;claim(input:{artifact:ReceizOpenedArtifact['sealedArtifact']}):Promise<ReceizSealedArtifact>;retain(sources:ProofSource[],opened:ReceizOpenedArtifact):Promise<unknown>;store:{read():Promise<unknown>;write(next:ReceivedProofState,expected:unknown):Promise<void>};lock<T>(run:()=>Promise<T>):Promise<T>}){
 const reviews=new WeakMap<ReceivedProofReview,{opened:ReceizOpenedArtifact;source:Wire}>();
 const assert=()=>input.assertOpen();let latestHeld:Wire|undefined;
 const pack=async(file:File)=>{if(!name(file.name)||!file.size||file.size>MAX_OWNED)fail('SOURCE_CAPACITY');const sdk=await loadReceiz(),bytes=new Uint8Array(await file.arrayBuffer());if(bytes.length!==file.size)fail('SOURCE_INVALID');return {digest:await sdk.sha256ReceizBytes(bytes),filename:file.name,mimeType:file.type||'application/octet-stream',bytesB64u:sdk.receizBase64UrlEncode(bytes)};};
 async function openSource(source:Wire){const bytes=await unpack(source);assert();const opened=await input.open(sourceFile(source,bytes));assert();if(opened.sealedArtifact.artifactSha256!==source.digest)fail('SOURCE_INVALID');return opened;}
 async function portable(opened:ReceizOpenedArtifact){
  let raw:unknown;try{raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(opened.verifiedPayload.bytes));}catch{return null;}
  if((raw as {schema?:unknown})?.schema!=='receiz.portable_asset.v1')return null;
  const sdk=await loadReceiz(),document=await sdk.parseReceizPortableAssetDocument(raw);
  if(document.assetType==='wallet_note')fail('DEDICATED_NOTE_PATH_REQUIRED');if(document.assetType==='reserve_funding')fail('DEDICATED_FUNDING_PATH_REQUIRED');return document;
 }
 async function validateClaim(source:ReceizOpenedArtifact,result:ReceizOpenedArtifact){
  const sdk=await loadReceiz(),original=await portable(source),document=await portable(result),before=source.verification.assetContinuity,after=result.verification.assetContinuity,append=document?.provenance.appends.at(-1);
  if(!original||!document||result.sealedArtifact.kind!=='receiz.native-record-seal'||result.sealedArtifact.continuity.ownerReceizId!==input.owner||document.ownership.ownerReceizId!==input.owner||before?.state!=='verified'||after?.state!=='verified'||!hex(before.artifactId)||before.artifactId!==after.artifactId||after.ownerReceizId!==input.owner||after.headReference!==result.sealedArtifact.continuity.claimId
   ||document.assetType!==original.assetType||document.payload.sha256!==original.payload.sha256||document.provenance.root!==original.provenance.root||document.provenance.appends.length!==original.provenance.appends.length+1
   ||original.provenance.appends.some((value,index)=>sdk.canonicalizeReceizV122(value)!==sdk.canonicalizeReceizV122(document.provenance.appends[index]))
   ||append?.type!=='receiz.ownership.bearer-claim.v108'||append.sourceArtifactSha256!==source.sealedArtifact.artifactSha256||append.fromOwnerReceizId!==original.ownership.ownerReceizId||append.toOwnerReceizId!==input.owner||append.priorHeadReference!==source.sealedArtifact.continuity.claimId)fail('SUCCESSOR_MISMATCH');
 }
 async function state(){assert();const value=await readReceivedProofState(await input.store.read(),input.owner);assert();return value;}
 async function hold(value:ReceivedProofState,source?:ReceizOpenedArtifact,verifiedResult?:ReceizOpenedArtifact):Promise<ReceivedProofStatus>{
  const current=value.current;if(!current.result)fail('SUCCESSOR_REQUIRED');const original=source??await openSource(current.source),result=verifiedResult??await openSource(current.result);
  if(!verifiedResult&&current.source.digest!==current.result.digest)await validateClaim(original,result);
  else if(result.sealedArtifact.continuity.ownerReceizId!==input.owner)fail('SUCCESSOR_MISMATCH');
  assert();await input.retain([...(current.source.digest===current.result.digest?[]:[{kind:'received-original' as const,filename:current.source.filename,bytes:await unpack(current.source)}]),{kind:'owned-source',filename:current.result.filename,bytes:await unpack(current.result)}],result);assert();
  await input.store.write({...value,current:{...current,status:'held'}},value);assert();latestHeld=current.result;return {status:'held',digest:current.source.digest,filename:current.result.filename};
 }
 async function claim(value:ReceivedProofState,source?:ReceizOpenedArtifact){
  const original=source??await openSource(value.current.source);const document=await portable(original);
  if(!document||document.ownership.custody!=='bearer'||document.ownership.ownerReceizId===input.owner)fail('OWNERSHIP_SOURCE_REQUIRED');
  assert();let artifact:ReceizSealedArtifact;
  try{artifact=await input.claim({artifact:original.sealedArtifact});}catch{assert();return {status:'unknown' as const,digest:value.current.source.digest,filename:value.current.source.filename};}
  assert();const result=await pack(new File([artifact.artifact],artifact.filename,{type:artifact.mimeType}));
  const opened=await openSource(result);await validateClaim(original,opened);assert();
  const next:ReceivedProofState={...value,current:{...value.current,status:'claimed',result}};await input.store.write(next,value);assert();return hold(next,original,opened);
 }
 return Object.freeze({
  async inspect(file:File):Promise<ReceivedProofReview>{assert();const source=await pack(file),opened=await input.open(file);assert();if(opened.sealedArtifact.artifactSha256!==source.digest)fail('SOURCE_INVALID');const document=await portable(opened),owner=opened.sealedArtifact.continuity.ownerReceizId;
   if(owner!==input.owner&&(!document||document.ownership.custody!=='bearer'||document.ownership.ownerReceizId!==owner||opened.verification.assetContinuity?.state!=='verified'||opened.verification.assetContinuity.carrier!=='portable_asset'))fail('OWNERSHIP_SOURCE_REQUIRED');
   if(owner!==input.owner&&file.size>MAX)fail('CLAIM_CAPACITY');
   const review=Object.freeze({digest:source.digest,filename:source.filename,title:opened.verifiedPayload.filename,size:file.size,owner,kind:owner===input.owner?'hold' as const:'claim' as const});reviews.set(review,{opened,source});assert();return review;
  },
  async receive(review:ReceivedProofReview,confirmation:string){return input.lock(async()=>{assert();const held=reviews.get(review);if(!held)fail('REVIEW_REQUIRED');if(confirmation!==review.digest)fail('EXACT_CONFIRMATION_REQUIRED');
   const prior=await state();if(prior&&prior.current.status!=='held')fail('PENDING');
   if(review.kind==='hold'){await input.retain([{kind:'owned-source',filename:held.source.filename,bytes:await unpack(held.source)}],held.opened);assert();latestHeld=held.source;reviews.delete(review);return {status:'held' as const,digest:held.source.digest,filename:held.source.filename};}
   const history=prior?[...prior.history,{sourceDigest:prior.current.source.digest,resultDigest:prior.current.result!.digest}]:[];if(history.length>1000)fail('CAPACITY');
   const value:ReceivedProofState={schema:'bank.received-proof.v1',owner:input.owner,current:{status:'unknown',source:held.source},history};
   await input.store.write(value,prior);assert();reviews.delete(review);return claim(value,held.opened);
  });},
  async status(){const value=await state();return value?{status:value.current.status,digest:value.current.source.digest,filename:value.current.result?.filename??value.current.source.filename}:null;},
  async resume(confirmation:string){return input.lock(async()=>{const value=await state();if(!value)return null;if(confirmation!==value.current.source.digest)fail('EXACT_CONFIRMATION_REQUIRED');return value.current.status==='unknown'?claim(value):value.current.status==='claimed'?hold(value):{status:'held' as const,digest:value.current.source.digest,filename:value.current.result!.filename};});},
  async exportHeld(){assert();const value=latestHeld??(await state())?.current.result;if(!value)fail('SUCCESSOR_REQUIRED');const bytes=await unpack(value);assert();return sourceFile(value,bytes);},
  discard(review:ReceivedProofReview){reviews.delete(review);},
 });
}
export type ReceivedProof=ReturnType<typeof createReceivedProof>;
