import type {AssetComposerDraft,ComposerAssetContent,PreparedComposerSource} from './asset-composer';
import type {AssetPublicationReceipt} from './asset-publication';
import type {BankNoteRuntimeFactory} from './offline-notes';
import publicationBuild from '../../public/native/asset-publication.v129.manifest.json';
import {parseExactByteBlockReference,type ExactByteBlockReference,type ExactByteBlockWriter,type ExactByteBlockResolver} from '../../native/receiz/packages/receiz-sdk/src/exactByteBlocks';
export type ConnectedAssetLocalAdmission=Readonly<{username:string;original:unknown;sourceReference:unknown;firstPaint:Readonly<{artifactDigest:string}>|null;artwork?:Blob}>;
export interface AssetPublicationRuntimeModule{
 readComposerPrimaryFile(file:File):Promise<{verification:{ok:boolean;bundle?:unknown;errors:readonly string[]};payload?:File}>;
 prepareConnectedComposerContent(input:{draft:AssetComposerDraft;ownerReceizId:string;writeProtectedBlock?:ExactByteBlockWriter;assertCurrent():void}):Promise<ComposerAssetContent>;
 sealConnectedComposerContent(input:{content:ComposerAssetContent;sealDocument:Parameters<BankNoteRuntimeFactory>[0]['sealDocument'];assertCurrent():void}):Promise<PreparedComposerSource>;
 admitConnectedComposerSource(input:{file:File;ownerReceizId:string;username:string;profileIdentity?:string;assertCurrent():void;onLocalAdmission?(admission:ConnectedAssetLocalAdmission):Promise<void>|void}):Promise<unknown>;
 resolveComposerBlock(reference:ExactByteBlockReference):Promise<Uint8Array>;
 createConnectedAssetPublicationRuntime(input:{identity:Uint8Array;passphrase:string;account:{uid:string;username:string};sealDocument:Parameters<BankNoteRuntimeFactory>[0]['sealDocument'];fetchImpl:typeof fetch;writeProtectedBlock?:ExactByteBlockWriter;resolveProtectedBlock?:ExactByteBlockResolver;assertCurrent():void;onLocalAdmission?(admission:ConnectedAssetLocalAdmission,context?:Readonly<{signing:boolean}>):Promise<void>|void}):Promise<{stage(file:File):Promise<import('../../native/receiz/app/lib/profile/showcase/importedSourceReference').ImportedProofSourceReference>;prepare(draft:AssetComposerDraft):Promise<PreparedComposerSource>;prepareContent(draft:AssetComposerDraft):Promise<ComposerAssetContent>;sealContent(content:ComposerAssetContent):Promise<PreparedComposerSource>;readSignedSource(file:File):Promise<Readonly<{pbiReceiptHash:string}>|null>;resumeSignedPublication(file:File):Promise<AssetPublicationReceipt|null>;publish(file:File,authorizeMarket?:(input:import("../../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship").LocalPbiAuthorshipInput)=>Promise<import("../../native/receiz/packages/receiz-sdk/src/pbiLocalAuthorship").LocalPbiAuthorshipProofV1>):Promise<AssetPublicationReceipt>}>;
}
let runtime:Promise<AssetPublicationRuntimeModule>|undefined;
export function loadAssetPublicationRuntime():Promise<AssetPublicationRuntimeModule>{
 // Canonical v129 Showcase code loads only after the explicit Seal action.
 const url=new URL(`/native/asset-publication.v129.mjs?build=${publicationBuild.moduleSha256}`,location.origin).href;
 return runtime??=import(/* @vite-ignore */ url).catch(error=>{runtime=undefined;throw error;});
}
type PublicationOperation={action:'initialize-blocks'|'commit-blocks';scopeKey:string;references:ExactByteBlockReference[];stagingObjectNames?:string[]};
type IssuedUpload={signedUrl:string;scopeKey:string;referenceKey:string;stagingObjectName:string;expiresAt?:number};
const record=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function publicationOperation(init:RequestInit|undefined,username:string):PublicationOperation|undefined{
 if(typeof init?.body!=='string')return;
 try{
  const value:unknown=JSON.parse(init.body);
  if(!record(value)||(value.action!=='initialize-blocks'&&value.action!=='commit-blocks'))return;
  const scope=value.scope,headers=new Headers(init.headers);
  if(!record(scope)||scope.publicationVersion!==2||scope.username!==username||typeof scope.ownerReceizId!=='string'||headers.get('content-type')?.split(';')[0]!=='application/json'||headers.get('x-receiz-owner-id')!==scope.ownerReceizId||headers.get('x-receiz-profile-username')!==username)return;
  // The canonical publisher and route own scope validation and admission. This
  // adapter binds delivery to their exact emitted request/response scope only.
  const scopeKey=JSON.stringify(scope);
  if(value.action==='initialize-blocks'){
   if(!Array.isArray(value.references)||value.references.length<1||value.references.length>16)return;
   return {action:value.action,scopeKey,references:value.references.map(parseExactByteBlockReference)};
  }
  if(!Array.isArray(value.blocks)||value.blocks.length<1||value.blocks.length>16)return;
  const blocks=value.blocks.map(block=>{if(!record(block)||typeof block.stagingObjectName!=='string')throw Error();return {reference:parseExactByteBlockReference(block.reference),name:block.stagingObjectName};});
  return {action:value.action,scopeKey,references:blocks.map(block=>block.reference),stagingObjectNames:blocks.map(block=>block.name)};
 }catch{return;}
}
function issuedUpload(value:unknown,reference:ExactByteBlockReference,scopeKey:string):IssuedUpload|undefined{
 if(!record(value)||JSON.stringify(parseExactByteBlockReference(value.reference))!==JSON.stringify(reference))throw Error();
 if(value.alreadyStored===true)return;
 if(value.alreadyStored!==false||typeof value.signedUrl!=='string'||typeof value.stagingObjectName!=='string')throw Error();
 const name=value.stagingObjectName,match=/^staging\/v2\/[a-f0-9]{64}\/([a-f0-9]{64})\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.bin$/.exec(name);
 if(!match||match[1]!==reference.sha256)throw Error();
 return {...issuedUploadTarget(value.signedUrl,name),scopeKey,referenceKey:JSON.stringify(reference),stagingObjectName:name};
}
function issuedUploadTarget(signedUrl:string,name:string,requiredBucket?:string):{signedUrl:string;expiresAt?:number}{
 const url=new URL(signedUrl),path=name.split('/').map(encodeURIComponent).join('/');
 if(url.protocol!=='https:'||url.username||url.password||url.hash)throw Error();
 let expiresAt:number|undefined;
 if(url.pathname===`/v1/staging/${path}`){
  // The selected native transport signs this exact staging attempt. These are
  // its existing transport fields, never proof or publication authority.
  const expires=url.searchParams.get('expires')??'',signature=url.searchParams.get('signature')??'';
  if(url.searchParams.size!==2||url.searchParams.getAll('expires').length!==1||url.searchParams.getAll('signature').length!==1||!/^\d{1,16}$/.test(expires)||!Number.isSafeInteger(Number(expires))||Number(expires)<=Date.now()||!/^[a-f0-9]{64}$/.test(signature))throw Error();
  expiresAt=Number(expires);
 }else{
  const prefix='/storage/v1/object/upload/sign/',storagePath=url.pathname.slice(prefix.length),bucketEnd=storagePath.indexOf('/');
  // Provider token contents and expiry stay opaque to Bank. The canonical
  // response issues the exact URL; the provider enforces its signed token.
  if(!url.hostname.endsWith('.supabase.co')||!url.pathname.startsWith(prefix)||bucketEnd<1||storagePath.slice(bucketEnd+1)!==path||requiredBucket&&storagePath.slice(0,bucketEnd)!==requiredBucket)throw Error();
 }
 return {signedUrl,expiresAt};
}
export function createAssetPublicationFetch(input:{applicationId:string;username:string;profileIdentity?:string;request(path:string,init?:RequestInit):Promise<Response>;assertCurrent():void;fetchImpl?:typeof fetch}):typeof fetch{
 const uploads=new Map<string,IssuedUpload>();
 const privateUploads=new Map<string,{signedUrl:string;key:string;expiresAt?:number}>();
 return async(resource,init)=>{
  input.assertCurrent();const url=new URL(resource instanceof Request?resource.url:String(resource),'https://receiz.com'),method=(init?.method??(resource instanceof Request?resource.method:'GET')).toUpperCase();
  const fail=():never=>{throw Error('BANK_ASSET_PUBLICATION_TRANSPORT_INVALID');};
  if(url.username||url.password||url.hash)fail();
  for(const [target,upload]of uploads)if(upload.expiresAt!==undefined&&upload.expiresAt<=Date.now())uploads.delete(target);
  for(const [target,upload]of privateUploads)if(upload.expiresAt!==undefined&&upload.expiresAt<=Date.now())privateUploads.delete(target);
  const upload=uploads.get(url.href)??privateUploads.get(url.href);
  if(upload){
   if(method!=='PUT')fail();
   const response=await(input.fetchImpl??fetch)(upload.signedUrl,{...init,credentials:'omit',redirect:'error'});input.assertCurrent();return response;
  }
  if(url.origin!=='https://receiz.com')fail();
  const endpoint=new URL('/api/connect/profile/showcase/publication','https://receiz.com');endpoint.searchParams.set('applicationId',input.applicationId);
  let operation:PublicationOperation|undefined;
  let privateOriginal:{path:string;sha:string;size:number;mime:string;key:string;complete:boolean}|undefined;
  if(url.pathname==='/api/profile/showcase/publication'){
   if(method!=='POST'||url.search)fail();
   operation=publicationOperation(init,input.username);
  }else if(url.pathname==='/api/profile/originals/upload-signed'){
   if(method!=='POST'||url.search||!input.profileIdentity||typeof init?.body!=='string'||init.body.length>16*1024)fail();
   const body:unknown=JSON.parse(init!.body as string);if(!record(body)||body.privateOriginal!==true||typeof body.sha256Hex!=='string'||!/^[a-f0-9]{64}$/.test(body.sha256Hex)||!Number.isSafeInteger(body.size)||Number(body.size)<1||Number(body.size)>64*1024*1024||typeof body.mime!=='string'||typeof body.filename!=='string'||body.action!==undefined&&body.action!=='complete')throw Error('BANK_ASSET_PUBLICATION_TRANSPORT_INVALID');
   const {protectedComposerOriginalStoragePath}=await import('../../native/receiz/app/lib/profile/composerPreparation');input.assertCurrent();
   const path=protectedComposerOriginalStoragePath(input.profileIdentity!,body.sha256Hex as string,body.filename as string,body.mime as string),key=JSON.stringify([path,body.sha256Hex,body.size,body.mime]);
   if(body.action==='complete'&&body.path!==path)fail();
   privateOriginal={path,sha:body.sha256Hex as string,size:Number(body.size),mime:body.mime as string,key,complete:body.action==='complete'};
   endpoint.searchParams.set('action','private-original-upload');
  }else if(url.pathname==='/api/profile/showcase/accepted-source'){
   if(method!=='GET'||url.searchParams.get('username')!==input.username||[...url.searchParams.keys()].some(key=>!['username','block'].includes(key)||url.searchParams.getAll(key).length!==1))fail();
   endpoint.searchParams.set('username',input.username);const block=url.searchParams.get('block');if(block)endpoint.searchParams.set('block',block);
  }else if(url.pathname===`/api/profile/${input.username}/originals`){
   if(method!=='GET'||[...url.searchParams.keys()].some(key=>!['source','cursor'].includes(key)||url.searchParams.getAll(key).length!==1))fail();
   endpoint.searchParams.set('username',input.username);endpoint.searchParams.set('action','inventory');const cursor=url.searchParams.get('cursor');if(cursor)endpoint.searchParams.set('cursor',cursor);
  }else fail();
  const response=await input.request(endpoint.pathname+endpoint.search,init);input.assertCurrent();
  if(privateOriginal&&response.ok){
   const value:unknown=await response.clone().json().catch(()=>null);input.assertCurrent();
   if(!record(value)||value.ok!==true||!['crystal','supabase'].includes(String(value.provider))||!record(value.upload))throw Error('BANK_ASSET_PUBLICATION_TRANSPORT_INVALID');
   const offered=value.upload;
   if(offered.path!==privateOriginal.path||offered.sha256Hex!==privateOriginal.sha||offered.size!==privateOriginal.size||offered.mime!==privateOriginal.mime||!record(offered.storage)||offered.storage.bucket!=='receiz-profile-originals-private'||offered.storage.path!==privateOriginal.path)fail();
   if(privateOriginal.complete){for(const [url,grant]of privateUploads)if(grant.key===privateOriginal.key)privateUploads.delete(url);}
   else if(offered.alreadyStored!==true){
    if(typeof offered.signedUrl!=='string')throw Error('BANK_ASSET_PUBLICATION_TRANSPORT_INVALID');
    const name=value.provider==='crystal'?offered.stagingObjectName:privateOriginal.path;
    if(typeof name!=='string')throw Error('BANK_ASSET_PUBLICATION_TRANSPORT_INVALID');
    if(value.provider==='crystal'&&!new RegExp('^staging/v2/[a-f0-9]{64}/'+privateOriginal.sha+'/[a-f0-9-]{36}\\.bin$').test(name))fail();
    const grant=issuedUploadTarget(offered.signedUrl,name,'receiz-profile-originals-private');
    privateUploads.set(grant.signedUrl,{...grant,key:privateOriginal.key});while(privateUploads.size>16)privateUploads.delete(privateUploads.keys().next().value!);
   }
  }
  // A failed authenticated read is not evidence of a missing causal predecessor.
  // Preserve the actual boundary refusal; never bypass it or loop requests.
  if(url.pathname==='/api/profile/showcase/accepted-source'&&!response.ok){
   if(response.status===401||response.status===403)throw Error('BANK_ASSET_PUBLICATION_AUTHORIZATION_UNAVAILABLE');
   if(response.status>=500)throw Error('BANK_ASSET_PUBLICATION_SERVICE_UNAVAILABLE');
  }
  if(operation&&response.ok){
   const value:unknown=await response.clone().json().catch(()=>null);input.assertCurrent();
   try{
    if(!record(value)||JSON.stringify(value.scope)!==operation.scopeKey)return response;
    if(operation.action==='initialize-blocks'&&value.status==='uploads'){
     if(!Array.isArray(value.uploads)||value.uploads.length!==operation.references.length)return response;
     // Validate the complete bounded plan before retaining any target. A new
     // initialization never erases another in-flight authenticated grant.
     const issued=value.uploads.map((value,index)=>issuedUpload(value,operation!.references[index]!,operation!.scopeKey));
     for(const upload of issued)if(upload)uploads.set(new URL(upload.signedUrl).href,upload);
    }else if(operation.action==='commit-blocks'&&value.status==='stored'){
     for(const [target,upload]of uploads)if(upload.scopeKey===operation.scopeKey&&operation.references.some((reference,index)=>upload.referenceKey===JSON.stringify(reference)&&upload.stagingObjectName===operation!.stagingObjectNames?.[index]))uploads.delete(target);
    }
   }catch{/* The canonical publisher validates the unchanged response; no target is issued from an invalid plan. */}
  }
  return response;
 };
}
