export type AssetCreationProgress={stage:'preparing'|'sealing'|'saving';ratio?:number};
export type AssetPublicationReceipt={status:'published';artifactDigest:string;operationCount:number;visibleChildCount:number;publicFamilyStatus?:'pending'|'ready'}|{status:'pending'|'rejected';code:string};
export type AssetPublicationSourceState={schema:'bank.asset-publication.v1';ownerReceizId:string;intentDigest:string;sourceDigest:string;filename:string;mimeType:string;status:'pending'|'published'|'rejected';receipt?:AssetPublicationReceipt;pbiReceiptHash?:string;creationDismissed?:true};
export type AssetPublicationState=AssetPublicationSourceState&{pendingSources?:readonly AssetPublicationSourceState[]};
export type AssetPublicationDelivery={status:'pending'|'published'|'rejected';showcaseArtifactDigest?:string;code?:string;publicFamilyStatus?:'pending'|'ready'};
type Dependencies={ownerReceizId:string;assertOpen():void;lock<T>(run:()=>Promise<T>):Promise<T>;read():Promise<unknown>;write(next:AssetPublicationState,previous:unknown):Promise<void>;seal(intent:unknown):Promise<File>;retain(source:File):Promise<string>;restore(digest:string,filename:string,mimeType:string):Promise<File>;readIntent(source:File):Promise<unknown>;readSignature?(source:File):Promise<{pbiReceiptHash:string}|null>;publish(source:File):Promise<AssetPublicationReceipt>};
// In-process coordination only; the encrypted publication checkpoint owns recovery.
type DeliveryFlight={promise:Promise<AssetPublicationReceipt>;state:AssetPublicationSourceState};
const deliveries=new Map<string,DeliveryFlight>();
type AssetPublicationResult={digest:string;file:File;publication:AssetPublicationDelivery;pbiSigned?:boolean};
const sourceResumptions=new Map<string,Promise<AssetPublicationResult>>();
export type AssetPublicationAttemptTiming={attemptId:string;sourceDigest:string;phase:'source';sizeBytes:number;startedAtMs:number};
export type AssetPublicationAttempt={ownerReceizId:string;sourceDigest:string;active:boolean;publication?:AssetPublicationDelivery;timing?:AssetPublicationAttemptTiming};
const deliveryTimings=new Map<string,AssetPublicationAttemptTiming>();let deliverySequence=0;
const deliveryListeners=new Set<(attempt:AssetPublicationAttempt)=>void>();
const deliveryKey=(ownerReceizId:string,sourceDigest:string)=>JSON.stringify([ownerReceizId,sourceDigest]);
/** Display-only lifecycle of the existing attempt; observing never starts a delivery. */
export const isAssetPublicationDeliveryActive=(ownerReceizId:string,sourceDigest:string)=>deliveries.has(deliveryKey(ownerReceizId,sourceDigest));
/** Only an actual running attempt has timing. Reading held or restored state
 * never starts a clock or manufactures a new measurement. */
export const assetPublicationDeliveryTiming=(ownerReceizId:string,sourceDigest:string)=>deliveryTimings.get(deliveryKey(ownerReceizId,sourceDigest));
/** Join only the already-running exact source attempt after local signing. */
export function waitForAssetPublicationDelivery(ownerReceizId:string,sourceDigest:string):Promise<void>|undefined{return deliveries.get(deliveryKey(ownerReceizId,sourceDigest))?.promise.then(()=>{});}
export function subscribeAssetPublicationDeliveries(listener:(attempt:AssetPublicationAttempt)=>void){deliveryListeners.add(listener);return()=>{deliveryListeners.delete(listener);};}
function notifyDelivery(attempt:AssetPublicationAttempt){for(const listener of deliveryListeners){try{listener(attempt);}catch{/* A display observer cannot change the publication outcome. */}}}
export const projectAssetPublicationReceipt=(receipt:AssetPublicationReceipt):AssetPublicationDelivery=>receipt.status==='published'?{status:'published',showcaseArtifactDigest:receipt.artifactDigest,...(receipt.publicFamilyStatus?{publicFamilyStatus:receipt.publicFamilyStatus}:{})}:{status:receipt.status,code:receipt.code};
export const isAssetPublicationDeliveryConfirmed=(delivery:AssetPublicationDelivery|undefined|null)=>delivery?.status==='published'&&delivery.publicFamilyStatus!=='pending';
/** Source acceptance and a confirmed family cannot regress behind a late reply. */
export function retainAssetPublicationDelivery(previous:AssetPublicationDelivery|undefined,next:AssetPublicationDelivery|undefined):AssetPublicationDelivery|undefined{
 if(!next||previous?.status==='published'&&next.status!=='published'||isAssetPublicationDeliveryConfirmed(previous)&&!isAssetPublicationDeliveryConfirmed(next))return previous;
 return next;
}
const projectReceipt=projectAssetPublicationReceipt;
const currentSource=(state:AssetPublicationState):AssetPublicationSourceState=>{const{pendingSources:_pending,...current}=state;return current;};
const selectedSource=(state:AssetPublicationState|null,digest:string)=>state?.sourceDigest===digest?currentSource(state):state?.pendingSources?.find(source=>source.sourceDigest===digest);
/** Only unfinished delivery metadata is archived. Exact Original and native PBI
 * bytes remain in their existing custody after a confirmed entry is retired. */
function replaceSource(state:AssetPublicationState,next:AssetPublicationSourceState):AssetPublicationState{
 if(state.sourceDigest===next.sourceDigest)return{...next,...(state.pendingSources?.length?{pendingSources:state.pendingSources}:{})};
 const pending=(state.pendingSources??[]).flatMap(source=>source.sourceDigest===next.sourceDigest?next.status==='published'?[]:[next]:[source]);
 return{...currentSource(state),...(pending.length?{pendingSources:pending}:{})};
}
function rememberFlight(state:AssetPublicationSourceState){const flight=deliveries.get(deliveryKey(state.ownerReceizId,state.sourceDigest));if(flight)flight.state=state;}
function strongestReceipt(previous:AssetPublicationSourceState,next:AssetPublicationReceipt):AssetPublicationReceipt{
 if(previous.status!=='published')return next;
 const held=previous.receipt!;
 return next.status==='published'&&held.status==='published'&&held.publicFamilyStatus==='pending'&&next.publicFamilyStatus==='ready'?next:held;
}
/** A later canonical signed-publication acknowledgment also includes its exact
 * Original. Settle only that saved creation so cold reopening cannot restore an
 * older pending checkpoint; a different/newer creation is never overwritten. */
export async function acknowledgePublishedAssetSource(dependencies:Pick<Dependencies,'ownerReceizId'|'assertOpen'|'lock'|'read'|'write'>,sourceDigest:string,value:AssetPublicationReceipt):Promise<void>{
 const receipt=readReceipt(value);if(receipt.status!=='published')return;
 dependencies.assertOpen();await dependencies.lock(async()=>{
  dependencies.assertOpen();const prior=await dependencies.read(),state=readAssetPublicationState(prior,dependencies.ownerReceizId);dependencies.assertOpen();
  const selected=selectedSource(state,sourceDigest);if(!state||!selected)return;
  const next={...selected,status:'published' as const,receipt:strongestReceipt(selected,receipt)};
  if(state.sourceDigest!==sourceDigest||selected.status!=='published'||next.receipt!==selected.receipt)await dependencies.write(replaceSource(state,next),prior);
  rememberFlight(next);dependencies.assertOpen();
 });
}
/** The native admission has already verified and durably retained this PBI
 * append. Carry its exact source-bound result through creation recovery. */
export async function retainAssetCreationSignature(d:Pick<Dependencies,'ownerReceizId'|'assertOpen'|'lock'|'read'|'write'>,digest:string,pbiReceiptHash:string){
 if(!/^[a-f0-9]{64}$/.test(digest)||!/^[a-f0-9]{64}$/.test(pbiReceiptHash))throw Error('BANK_ASSET_SIGNATURE_STATE_INVALID');
 d.assertOpen();await d.lock(async()=>{d.assertOpen();const prior=await d.read(),state=readAssetPublicationState(prior,d.ownerReceizId),selected=selectedSource(state,digest);if(!state||!selected||selected.pbiReceiptHash===pbiReceiptHash)return;const next={...selected,pbiReceiptHash};await d.write(replaceSource(state,next),prior);rememberFlight(next);d.assertOpen();});
}
/** Finishing an editor visit does not acknowledge public delivery or remove
 * the retained source. A different/newer creation can never be dismissed. */
export async function dismissAssetCreation(d:Pick<Dependencies,'ownerReceizId'|'assertOpen'|'lock'|'read'|'write'>,digest:string){
 d.assertOpen();await d.lock(async()=>{d.assertOpen();const prior=await d.read(),state=readAssetPublicationState(prior,d.ownerReceizId),selected=selectedSource(state,digest);if(!state||!selected||selected.creationDismissed)return;const next={...selected,creationDismissed:true as const};await d.write(replaceSource(state,next),prior);rememberFlight(next);d.assertOpen();});
}
const hex=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
function canonical(value:unknown):string{
 if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
 if(value&&typeof value==='object')return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
 return JSON.stringify(value);
}
export function readAssetPublicationState(value:unknown,ownerReceizId?:string):AssetPublicationState|null{
 if(value===null||value===undefined)return null;
 const state=value as AssetPublicationState;
 const validate=(source:AssetPublicationSourceState)=>{
  if(!source||source.schema!=='bank.asset-publication.v1'||typeof source.ownerReceizId!=='string'||source.ownerReceizId!==(ownerReceizId??state.ownerReceizId)||!hex(source.intentDigest)||!hex(source.sourceDigest)||typeof source.filename!=='string'||!source.filename||typeof source.mimeType!=='string'||!source.mimeType||!['pending','published','rejected'].includes(source.status))throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');
  if(source.pbiReceiptHash!==undefined&&!hex(source.pbiReceiptHash)||source.creationDismissed!==undefined&&source.creationDismissed!==true)throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');
  if(source.receipt)readReceipt(source.receipt);
  if(source.status==='published'&&source.receipt?.status!=='published'||source.status==='rejected'&&source.receipt?.status!=='rejected')throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');
 };
 validate(state);const digests=new Set([state.sourceDigest]);
 if(state.pendingSources!==undefined){
  if(!Array.isArray(state.pendingSources))throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');
  for(const source of state.pendingSources){validate(source);if('pendingSources'in source||digests.has(source.sourceDigest))throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');digests.add(source.sourceDigest);}
 }
 return state;
}
export const hasPendingAssetPublication=(value:unknown)=>{const state=readAssetPublicationState(value);return state?.status==='pending'||!!state?.pendingSources?.some(source=>source.status==='pending');};
/** Bounded delivery work coordinates only. This neither opens a Source nor
 * selects public membership, account state or financial authority. */
export function readPendingAssetPublicationDigests(value:unknown,ownerReceizId?:string,limit=16,afterSourceDigest?:string):readonly string[]{
 if(!Number.isSafeInteger(limit)||limit<1||limit>64||afterSourceDigest!==undefined&&!hex(afterSourceDigest))throw Error('BANK_ASSET_PUBLICATION_STATE_INVALID');
 const state=readAssetPublicationState(value,ownerReceizId),selected:string[]=[];
 const consider=(source:AssetPublicationSourceState)=>{if(source.status!=='pending'||afterSourceDigest&&source.sourceDigest<=afterSourceDigest)return;const index=selected.findIndex(digest=>digest>source.sourceDigest);if(index<0){if(selected.length<limit)selected.push(source.sourceDigest);}else{selected.splice(index,0,source.sourceDigest);if(selected.length>limit)selected.pop();}};
 if(state){consider(state);for(const source of state.pendingSources??[])consider(source);}
 return selected;
}
function readReceipt(value:unknown):AssetPublicationReceipt{
 const receipt=value as AssetPublicationReceipt;
 if(!receipt||'publicFamilyStatus'in receipt&&(receipt.status!=='published'||!['pending','ready'].includes(receipt.publicFamilyStatus!)))throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 if(receipt.status==='published'){
  if(!hex(receipt.artifactDigest)||!Number.isSafeInteger(receipt.operationCount)||receipt.operationCount<0||!Number.isSafeInteger(receipt.visibleChildCount)||receipt.visibleChildCount<0)throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 }else if(!['pending','rejected'].includes(receipt.status)||typeof receipt.code!=='string'||!receipt.code)throw Error('BANK_ASSET_PUBLICATION_RECEIPT_INVALID');
 return receipt;
}
/** Exact source custody precedes distribution. A timeout retains the same
 * intent and original; retries only replay its existing Showcase placement. */
export function createAssetPublication(dependencies:Dependencies){
 const digestIntent=async(intent:unknown)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonical(intent))))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const project=(state:AssetPublicationSourceState,file:File)=>({digest:state.sourceDigest,file,...(state.pbiReceiptHash?{pbiSigned:true}:{}),publication:state.receipt?projectReceipt(state.receipt):{status:state.status,code:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'}});
 const reopen=async(state:AssetPublicationSourceState)=>{const file=await dependencies.restore(state.sourceDigest,state.filename,state.mimeType);dependencies.assertOpen();if(await digestIntent(await dependencies.readIntent(file))!==state.intentDigest)throw Error('BANK_ASSET_PUBLICATION_SOURCE_INTENT_MISMATCH');return file;};
 async function create(intent?:unknown,localFirst=false,sourceDigest?:string):Promise<AssetPublicationResult>{
  dependencies.assertOpen();
  if(sourceDigest!==undefined&&!hex(sourceDigest))throw Error('BANK_ASSET_PUBLICATION_SOURCE_INVALID');
  const intentDigest=intent===undefined?null:await digestIntent(intent);
  const held=await dependencies.lock(async()=>{
   dependencies.assertOpen();const prior=await dependencies.read(),root=readAssetPublicationState(prior,dependencies.ownerReceizId);let file:File|undefined;
   let state=intentDigest===null?sourceDigest?selectedSource(root,sourceDigest):root?currentSource(root):undefined:
    root?[currentSource(root),...root.pendingSources??[]].find(source=>source.intentDigest===intentDigest):undefined;
   const flight=state?deliveries.get(deliveryKey(dependencies.ownerReceizId,state.sourceDigest)):undefined;
   if(!state&&intentDigest===null)throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');
   if(!state){
    if(!intentDigest)throw Error('BANK_ASSET_PUBLICATION_SOURCE_UNAVAILABLE');
    file=await dependencies.seal(intent);dependencies.assertOpen();
    const sourceDigest=await dependencies.retain(file);if(!hex(sourceDigest))throw Error('BANK_ASSET_PUBLICATION_SOURCE_INVALID');dependencies.assertOpen();
    if(root&&selectedSource(root,sourceDigest))throw Error('BANK_ASSET_PUBLICATION_SOURCE_INTENT_MISMATCH');
    state={schema:'bank.asset-publication.v1',ownerReceizId:dependencies.ownerReceizId,intentDigest,sourceDigest,filename:file.name,mimeType:file.type||'application/octet-stream',status:'pending'};
    const pending=root?[...root.pendingSources??[],currentSource(root)].filter(source=>source.status!=='published'):[];
    await dependencies.write({...state,...(pending.length?{pendingSources:pending}:{})},prior);
   }
   return {state,file,flight};
  });
  // Existing source verification is read-only. It cannot hold the checkpoint
  // lock while an independent intent seals and retains its own exact Original.
  const file=held.file??await reopen(held.state);dependencies.assertOpen();
  const latestRoot=readAssetPublicationState(await dependencies.read(),dependencies.ownerReceizId),latest=selectedSource(latestRoot,held.state.sourceDigest);
  if(latest)held.state=latest;
  else if(held.flight?.state.status==='published')held.state=held.flight.state;
  else throw Error('BANK_ASSET_PUBLICATION_STATE_CHANGED');
  if(held.state.status==='published')return project(held.state,file);
  const key=deliveryKey(dependencies.ownerReceizId,held.state.sourceDigest);
  let flight=deliveries.get(key)??held.flight;
  if(!flight){
   const timing:AssetPublicationAttemptTiming=Object.freeze({attemptId:`source-${++deliverySequence}`,sourceDigest:held.state.sourceDigest,phase:'source',sizeBytes:file.size,startedAtMs:performance.now()});
   deliveryTimings.set(key,timing);
   const selectedFlight:DeliveryFlight={state:held.state,promise:undefined!};
   selectedFlight.promise=(async()=>{
    dependencies.assertOpen();let receipt:AssetPublicationReceipt;
    try{receipt=readReceipt(await dependencies.publish(file));}catch(error){receipt={status:'pending',code:error instanceof Error&&/^(?:PROFILE_SHOWCASE|IMPORTED_SOURCE|BANK_ASSET_PUBLICATION)_[A-Z0-9_]+$/.test(error.message)?error.message:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'};}
    dependencies.assertOpen();
    await dependencies.lock(async()=>{
     dependencies.assertOpen();const prior=await dependencies.read(),root=readAssetPublicationState(prior,dependencies.ownerReceizId),current=selectedSource(root,held.state.sourceDigest);
     if(!root||!current){if(selectedFlight.state.status==='published'){receipt=selectedFlight.state.receipt!;return;}throw Error('BANK_ASSET_PUBLICATION_STATE_CHANGED');}
     if(current.intentDigest!==held.state.intentDigest)throw Error('BANK_ASSET_PUBLICATION_STATE_CHANGED');
     // A later confirmed acknowledgment outranks a weaker retry response.
     receipt=strongestReceipt(current,receipt);const next={...current,status:receipt.status,receipt};
     if(current.status!=='published'||receipt!==current.receipt)await dependencies.write(replaceSource(root,next),prior);
     selectedFlight.state=next;
    });
    return receipt;
   })();
   flight=selectedFlight;deliveries.set(key,flight);
   notifyDelivery({ownerReceizId:dependencies.ownerReceizId,sourceDigest:held.state.sourceDigest,active:true,timing});
   const finished=(publication:AssetPublicationDelivery)=>{if(deliveries.get(key)===selectedFlight)deliveries.delete(key);if(deliveryTimings.get(key)===timing)deliveryTimings.delete(key);notifyDelivery({ownerReceizId:dependencies.ownerReceizId,sourceDigest:held.state.sourceDigest,active:false,publication,timing});};
   void flight.promise.then(receipt=>finished(projectReceipt(receipt)),()=>finished({status:'pending',code:'BANK_ASSET_PUBLICATION_DELIVERY_PENDING'}));
  }
  // Calling the publisher above starts delivery now. No timer, artificial delay,
  // or network acknowledgment sits between durable local truth and its display.
  if(localFirst)return project(held.state,file);
  await flight.promise;dependencies.assertOpen();
  const root=readAssetPublicationState(await dependencies.read(),dependencies.ownerReceizId),current=selectedSource(root,held.state.sourceDigest);
  if(!root||!current&&flight.state.status!=='published')throw Error('BANK_ASSET_PUBLICATION_STATE_CHANGED');
  return project(current??flight.state,file);
 }
 // Share an explicit exact-source retry before its read-only reopening begins.
 // A fast receipt may retire the pending coordinate while another reopening
 // is still in progress. Both callers retain this one operation's exact result;
 // it is discarded on completion and never supplies durable proof authority.
 async function resume(digest?:string):Promise<AssetPublicationResult>{
  dependencies.assertOpen();if(digest===undefined||!hex(digest))return create(undefined,false,digest);
  const key=deliveryKey(dependencies.ownerReceizId,digest),held=sourceResumptions.get(key);
  if(held){const result=await held;dependencies.assertOpen();return result;}
  const pending=create(undefined,false,digest);sourceResumptions.set(key,pending);
  const release=()=>{if(sourceResumptions.get(key)===pending)sourceResumptions.delete(key);};void pending.then(release,release);
  return pending;
 }
 return{create,createLocal:(intent:unknown)=>create(intent,true),resumeLocal:(digest?:string)=>create(undefined,true,digest),resume,
  pendingDeliveries:async(limit=16,afterSourceDigest?:string)=>{dependencies.assertOpen();return readPendingAssetPublicationDigests(await dependencies.read(),dependencies.ownerReceizId,limit,afterSourceDigest);},
  pending:async()=>{dependencies.assertOpen();const state=readAssetPublicationState(await dependencies.read(),dependencies.ownerReceizId);if(!state||state.status==='published'||state.pbiReceiptHash||state.creationDismissed)return null;const file=await reopen(state),signature=await dependencies.readSignature?.(file);if(signature){await retainAssetCreationSignature(dependencies,state.sourceDigest,signature.pbiReceiptHash);return null;}return project(state,file);}};
}
