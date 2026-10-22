import type {AssetPublicationReceipt} from './asset-publication';
export type BackedPublicationSource={digest:string;filename:string;mimeType:string;reference?:unknown};
export type BackedPublicationState={schema:'bank.backed-asset-publication.v1';ownerReceizId:string;intentDigest:string;intent:unknown;source:BackedPublicationSource;stage:'source-held'|'funding-pending'|'funded'|'publication-pending'|'published';operationId?:string;fundingStarted?:true;assetId?:string;issuanceSourceSha256?:string;package?:BackedPublicationSource;receipt?:AssetPublicationReceipt};
type Funding={status:string;assetId?:string;headSourceSha256?:string};
type Dependencies={ownerReceizId:string;assertOpen():void;lock<T>(run:()=>Promise<T>):Promise<T>;read():Promise<unknown>;write(next:BackedPublicationState|null,previous:unknown):Promise<void>;prepareSource(intent:unknown):Promise<BackedPublicationSource>;prepareFunding(intent:unknown,source:BackedPublicationSource):Promise<unknown>;executeFunding(review:unknown,approval:string):Promise<Funding>;recoverFunding(operationId:string):Promise<Funding|null>;makePackage(state:BackedPublicationState):Promise<BackedPublicationSource>;publish(source:BackedPublicationSource):Promise<AssetPublicationReceipt>};
const hex=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const canonical=(v:unknown):string=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.entries(v).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>JSON.stringify(k)+':'+canonical(v)).join(',')+'}':JSON.stringify(v);
const digest=async(v:unknown)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(v))))].map(b=>b.toString(16).padStart(2,'0')).join('');
export function readBackedPublicationState(value:unknown,owner?:string):BackedPublicationState|null{
 if(value==null)return null;const s=value as BackedPublicationState;
 const source=(v:BackedPublicationSource|undefined)=>v&&hex(v.digest)&&typeof v.filename==='string'&&v.filename.length>0&&typeof v.mimeType==='string';
 if(s.schema!=='bank.backed-asset-publication.v1'||!s.ownerReceizId||owner&&s.ownerReceizId!==owner||!hex(s.intentDigest)||!source(s.source)||!['source-held','funding-pending','funded','publication-pending','published'].includes(s.stage)||s.stage!=='source-held'&&!s.operationId||['funded','publication-pending','published'].includes(s.stage)&&(!hex(s.assetId)||!hex(s.issuanceSourceSha256))||['publication-pending','published'].includes(s.stage)&&!source(s.package)||s.stage==='published'&&(s.receipt?.status!=='published'||!hex(s.receipt.artifactDigest)))throw Error('BANK_BACKED_PUBLICATION_STATE_INVALID');return s;
}
/** The funding writer, source verifier and publisher remain the authorities.
 * This journal orders them and retains recovery coordinates; it cannot turn an
 * uncertain payment into another issuance or a public financial receipt. */
export function createBackedAssetPublication(d:Dependencies){
 let reviews=new WeakMap<object,{state:BackedPublicationState;operationId:string}>();
 const read=async()=>{d.assertOpen();const s=readBackedPublicationState(await d.read(),d.ownerReceizId);if(s&&await digest(s.intent)!==s.intentDigest)throw Error('BANK_BACKED_PUBLICATION_INTENT_MISMATCH');return s;};
 const write=async(next:BackedPublicationState|null,previous:unknown)=>{d.assertOpen();await d.write(next,previous);d.assertOpen();return next!;};
 async function finish(state:BackedPublicationState,funding?:Funding){
  if(state.stage==='funding-pending'){
   const result=funding??await d.recoverFunding(state.operationId!);d.assertOpen();if(result?.status==='zero-write'){const {fundingStarted:_started,operationId:_operation,...original}=state;return write({...original,stage:'source-held'},state);}if(!result||result.status!=='committed')return state;
   if(!hex(result.assetId)||!hex(result.headSourceSha256))throw Error('BANK_BACKED_PUBLICATION_FUNDING_INVALID');state=await write({...state,stage:'funded',assetId:result.assetId,issuanceSourceSha256:result.headSourceSha256},state);
  }
  if(state.stage==='funded'){const source=await d.makePackage(state);d.assertOpen();if(!hex(source.digest))throw Error('BANK_BACKED_PUBLICATION_PACKAGE_INVALID');state=await write({...state,package:source,stage:'publication-pending'},state);}
  if(state.stage==='publication-pending'){const receipt=await d.publish(state.package!);d.assertOpen();if(!receipt||!['published','pending','rejected'].includes(receipt.status)||receipt.status==='published'&&!hex(receipt.artifactDigest))throw Error('BANK_BACKED_PUBLICATION_RECEIPT_INVALID');state=await write({...state,receipt,stage:receipt.status==='published'?'published':'publication-pending'},state);}
  return state;
 }
 return{status:()=>d.lock(read),async prepare(intent?:unknown){return d.lock(async()=>{
  let s=await read();const selected=intent??s?.intent;if(selected===undefined)throw Error('BANK_BACKED_PUBLICATION_SOURCE_REQUIRED');const intentDigest=await digest(selected);
  if(s&&s.stage!=='published'&&s.intentDigest!==intentDigest)throw Error('BANK_BACKED_PUBLICATION_PENDING');
  if(!s||s.stage==='published'&&s.intentDigest!==intentDigest){const source=await d.prepareSource(selected);if(!hex(source.digest))throw Error('BANK_BACKED_PUBLICATION_SOURCE_INVALID');s=await write({schema:'bank.backed-asset-publication.v1',ownerReceizId:d.ownerReceizId,intentDigest,intent:selected,source,stage:'source-held'},s);}
  if(s.stage!=='source-held')throw Error('BANK_BACKED_PUBLICATION_PENDING');const review=await d.prepareFunding(s.intent,s.source) as {request?:{requestId?:unknown}};d.assertOpen();if(!review||typeof review.request?.requestId!=='string'||!review.request.requestId)throw Error('BANK_BACKED_PUBLICATION_REVIEW_INVALID');reviews.set(review,{state:s,operationId:review.request.requestId});return review;
 });},async execute(review:unknown,approval:string){return d.lock(async()=>{
  const held=review&&typeof review==='object'?reviews.get(review):undefined,s=await read();if(!held||!s||s.stage!=='source-held'||canonical(s)!==canonical(held.state))throw Error('BANK_BACKED_PUBLICATION_REVIEW_REQUIRED');
  const next=await write({...s,stage:'funding-pending',operationId:held.operationId,fundingStarted:true},s);reviews.delete(review as object);const funding=await d.executeFunding(review,approval);d.assertOpen();return finish(next,funding);
 });},resume:()=>d.lock(async()=>{const s=await read();return s?finish(s):null;}),cancel:()=>d.lock(async()=>{const s=await read();if(s&&s.stage!=='source-held')throw Error('BANK_BACKED_PUBLICATION_PENDING');await write(null,s);reviews=new WeakMap();}),discard(review:unknown){if(review&&typeof review==='object')reviews.delete(review);}};
}
