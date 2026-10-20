export type AssetPublicationReceipt={status:'published';artifactDigest:string;operationCount:number;visibleChildCount:number}|{status:'pending'|'rejected';code:string};
export type AssetPublicationState={schema:'bank.asset-publication.v1';ownerReceizId:string;intentDigest:string;sourceDigest:string;filename:string;mimeType:string;status:'pending'|'published'|'rejected';receipt?:AssetPublicationReceipt};
export type AssetPublicationDelivery={status:'pending'|'published'|'rejected';showcaseArtifactDigest?:string;code?:string};
type Dependencies={ownerReceizId:string;assertOpen():void;lock<T>(run:()=>Promise<T>):Promise<T>;read():Promise<unknown>;write(next:AssetPublicationState,previous:unknown):Promise<void>;seal(intent:unknown):Promise<File>;retain(source:File):Promise<string>;restore(digest:string,filename:string,mimeType:string):Promise<File>;readIntent(source:File):Promise<unknown>;publish(source:File):Promise<AssetPublicationReceipt>};
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
 async function create(intent?:unknown):Promise<{digest:string;file:File;publication:AssetPublicationDelivery}>{
  dependencies.assertOpen();
  const intentDigest=intent===undefined?null:await digestIntent(intent);
  return dependencies.lock(async()=>{
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
   if(state.status!=='published'){
    dependencies.assertOpen();let receipt:AssetPublicationReceipt;
    try{receipt=readReceipt(await dependencies.publish(file));}catch{receipt={status:'pending',code:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'};}
    dependencies.assertOpen();const next={...state,status:receipt.status,receipt};await dependencies.write(next,state);state=next;
   }
   return project(state,file);
  });
 }
 return{create,resume:()=>create(),pending:async()=>{dependencies.assertOpen();const state=readAssetPublicationState(await dependencies.read(),dependencies.ownerReceizId);if(!state||state.status==='published')return null;return project(state,await reopen(state));}};
}
