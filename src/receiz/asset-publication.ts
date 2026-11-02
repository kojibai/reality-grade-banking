export type AssetCreationProgress={stage:'preparing'|'sealing'|'saving';ratio?:number};
export type AssetPublicationReceipt={status:'published';artifactDigest:string;operationCount:number;visibleChildCount:number}|{status:'pending'|'rejected';code:string};
export type AssetPublicationState={schema:'bank.asset-publication.v1';ownerReceizId:string;intentDigest:string;sourceDigest:string;filename:string;mimeType:string;status:'pending'|'published'|'rejected';receipt?:AssetPublicationReceipt};
export type AssetPublicationDelivery={status:'pending'|'published'|'rejected';showcaseArtifactDigest?:string;code?:string};
type Dependencies={ownerReceizId:string;assertOpen():void;lock<T>(run:()=>Promise<T>):Promise<T>;read():Promise<unknown>;write(next:AssetPublicationState,previous:unknown):Promise<void>;seal(intent:unknown):Promise<File>;retain(source:File):Promise<string>;restore(digest:string,filename:string,mimeType:string):Promise<File>;readIntent(source:File):Promise<unknown>;publish(source:File):Promise<AssetPublicationReceipt>};
// In-process coordination only; the encrypted publication checkpoint owns recovery.
const deliveries=new Map<string,Promise<AssetPublicationReceipt>>();
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function canonical(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
 return JSON.stringify(value);
}
export function readAssetPublicationState(value:unknown,ownerReceizId?:string):AssetPublicationState|null{
 if(value===null||value===undefined)return null;
 const state=value as AssetPublicationState;
 if(!state||state.schema!=='bank.asset-publication.v1'||typeof state.ownerReceizId!=='string'||ownerReceizId&&state.ownerReceizId!==ownerReceizId||!hex(state.intentDigest)||!hex(state.sourceDigest)||typeof state.filename!=='string'||!state.filename||typeof state.mimeType!=='string'||!state.mimeType||!['pending','published','rejected'].includes(state.status))throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');
 if(state.receipt)readReceipt(state.receipt);
 if(state.status==='published'&&state.receipt?.status!=='published'||state.status==='rejected'&&state.receipt?.status!=='rejected')throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');
 return state;
}
export const hasPendingAssetPublication=(value:unknown)=>readAssetPublicationState(value)?.status==='pending';
function readReceipt(value:unknown):AssetPublicationReceipt{
 const receipt=value as AssetPublicationReceipt;
 if(!receipt)throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 if(receipt.status==='published'){
  if(!hex(receipt.artifactDigest)||!Number.isSafeInteger(receipt.operationCount)||receipt.operationCount<0||!Number.isSafeInteger(receipt.visibleChildCount)||receipt.visibleChildCount<0)throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 }else if(!['pending','rejected'].includes(receipt.status)||typeof receipt.code!=='string'||!receipt.code)throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 return receipt;
}
/** Exact source custody precedes distribution. A timeout retains the same
 * intent and original; retries only replay its existing Showcase placement. */
export function createAssetPublication(dependencies:Dependencies){
 const digestIntent=async(intent:unknown)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(intent))))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const project=(state:AssetPublicationState,file:File)=>({digest:state.sourceDigest,file,publication:state.receipt?.status==='published'?{status:'published' as const,showcaseArtifactDigest:state.receipt.artifactDigest}:{status:state.status,code:state.receipt&&'code'in state.receipt?state.receipt.code:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'}});
 const reopen=async(state:AssetPublicationState)=>{const file=await dependencies.restore(state.sourceDigest,state.filename,state.mimeType);dependencies.assertOpen();if(await digestIntent(await dependencies.readIntent(file))!==state.intentDigest)throw Error('BANK_ASSET_PUBLICATION_SOURCE_INTENT_MISMATCH');return file;};
 async function create(intent?:unknown,localFirst=false):Promise<{digest:string;file:File;publication:AssetPublicationDelivery}>{
  dependencies.assertOpen();
  const intentDigest=intent===undefined?null:await digestIntent(intent);
  const held=await dependencies.lock(async()=>{
   dependencies.assertOpen();const prior=await dependencies.read();let state=readAssetPublicationState(prior,dependencies.ownerReceizId),file:File;
   if(!state&&intentDigest===null)throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');
   if(intentDigest!==null&&state&&state.intentDigest!==intentDigest&&state.status==='pending')throw Error('BANK_ASSET_PUBLICATION_PENDING');
   if(state&&(intentDigest===null||state.intentDigest===intentDigest)){file=await reopen(state);}
   else{
    if(!intentDigest)throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');
    file=await dependencies.seal(intent);dependencies.assertOpen();
    const sourceDigest=await dependencies.retain(file);if(!hex(sourceDigest))throw Error('BANK_ASSET_PUBLICATION_SOURCE_INVALID');dependencies.assertOpen();
    state={schema:'bank.asset-publication.v1',ownerReceizId:dependencies.ownerReceizId,intentDigest,sourceDigest,filename:file.name,mimeType:file.type||'application/octet-stream',status:'pending'};
    await dependencies.write(state,prior);
   }
   return {state,file};
  });
  const latest=readAssetPublicationState(await dependencies.read(),dependencies.ownerReceizId);
  if(!latest||latest.sourceDigest!==held.state.sourceDigest)throw Error('BANK_ASSET_PUBLICATION_STATE_CHANGED');
  held.state=latest;
  if(held.state.status==='published')return project(held.state,held.file);
  const key=JSON.stringify([dependencies.ownerReceizId,held.state.sourceDigest]);
  let delivery=deliveries.get(key);
  if(!delivery){
   delivery=(async()=>{
    dependencies.assertOpen();let receipt:AssetPublicationReceipt;
    try{receipt=readReceipt(await dependencies.publish(held.file));}catch(error){receipt={status:'pending',code:error instanceof Error&&/^(?:PROFILE_SHOWCASE|IMPORTED_SOURCE|BANK_ASSET_PUBLICATION)_[A-Z0-9_]+$/.test(error.message)?error.message:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'};}
    dependencies.assertOpen();
    await dependencies.lock(async()=>{
     dependencies.assertOpen();const prior=await dependencies.read(),current=readAssetPublicationState(prior,dependencies.ownerReceizId);
     if(!current||current.sourceDigest!==held.state.sourceDigest||current.intentDigest!==held.state.intentDigest)throw Error('BANK_ASSET_PUBLICATION_STATE_CHANGED');
     // A later confirmed acknowledgment outranks a weaker retry response.
     if(current.status!=='published')await dependencies.write({...current,status:receipt.status,receipt},prior);
    });
    return receipt;
   })();
   deliveries.set(key,delivery);
   void delivery.finally(()=>{if(deliveries.get(key)===delivery)deliveries.delete(key);}).catch(()=>{/* The exact source and pending checkpoint remain durable. */});
  }
  // Calling the publisher above starts delivery now. No timer, artificial delay,
  // or network acknowledgment sits between durable local truth and its display.
  if(localFirst)return project(held.state,held.file);
  await delivery;dependencies.assertOpen();
  const current=readAssetPublicationState(await dependencies.read(),dependencies.ownerReceizId);
  if(!current||current.sourceDigest!==held.state.sourceDigest)throw Error('BANK_ASSET_PUBLICATION_STATE_CHANGED');
  return project(current,held.file);
 }
 return{create,createLocal:(intent:unknown)=>create(intent,true),resumeLocal:()=>create(undefined,true),resume:()=>create(),pending:async()=>{dependencies.assertOpen();const state=readAssetPublicationState(await dependencies.read(),dependencies.ownerReceizId);if(!state||state.status==='published')return null;return project(state,await reopen(state));}};
}
