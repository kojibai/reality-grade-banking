import type {AssetPublicationReceipt} from './asset-publication';
import type {BankNoteRuntimeFactory} from './offline-notes';
import publicationBuild from '../../public/native/asset-publication.v129.manifest.json';
export interface AssetPublicationRuntimeModule{
 createConnectedAssetPublicationRuntime(input:{identity:Uint8Array;passphrase:string;account:{uid:string;username:string};sealDocument:Parameters<BankNoteRuntimeFactory>[0]['sealDocument'];fetchImpl:typeof fetch;assertCurrent():void}):Promise<{publish(file:File):Promise<AssetPublicationReceipt>}>;
}
let runtime:Promise<AssetPublicationRuntimeModule>|undefined;
export function loadAssetPublicationRuntime():Promise<AssetPublicationRuntimeModule>{
 // Canonical v129 Showcase code loads only after the explicit Seal action.
 const url=new URL(`/native/asset-publication.v129.mjs?build=${publicationBuild.moduleSha256}`,location.origin).href;
 return runtime??=import(/* @vite-ignore */ url).catch(error=>{runtime=undefined;throw error;});
}
export function createAssetPublicationFetch(input:{applicationId:string;username:string;request(path:string,init?:RequestInit):Promise<Response>;assertCurrent():void;fetchImpl?:typeof fetch}):typeof fetch{
 return async(resource,init)=>{
  input.assertCurrent();const url=new URL(resource instanceof Request?resource.url:String(resource),'https://receiz.com'),method=(init?.method??(resource instanceof Request?resource.method:'GET')).toUpperCase();
  const fail=():never=>{throw Error('BANK_ASSET_PUBLICATION_TRANSPORT_INVALID');};
  if(url.username||url.password||url.hash)fail();
  if(url.origin!=='https://receiz.com'){
   if(method!=='PUT'||url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||!url.pathname.startsWith('/storage/v1/object/upload/sign/'))fail();
   const response=await(input.fetchImpl??fetch)(url.href,{...init,credentials:'omit',redirect:'error'});input.assertCurrent();return response;
  }
  const endpoint=new URL('/api/connect/profile/showcase/publication','https://receiz.com');endpoint.searchParams.set('applicationId',input.applicationId);
  if(url.pathname==='/api/profile/showcase/publication'){
   if(method!=='POST'||url.search)fail();
  }else if(url.pathname==='/api/profile/showcase/accepted-source'){
   if(method!=='GET'||url.searchParams.get('username')!==input.username||[...url.searchParams.keys()].some(key=>!['username','block'].includes(key)||url.searchParams.getAll(key).length!==1))fail();
   endpoint.searchParams.set('username',input.username);const block=url.searchParams.get('block');if(block)endpoint.searchParams.set('block',block);
  }else if(url.pathname===`/api/profile/${input.username}/originals`){
   if(method!=='GET'||[...url.searchParams.keys()].some(key=>!['source','cursor'].includes(key)||url.searchParams.getAll(key).length!==1))fail();
   endpoint.searchParams.set('username',input.username);endpoint.searchParams.set('action','inventory');const cursor=url.searchParams.get('cursor');if(cursor)endpoint.searchParams.set('cursor',cursor);
  }else fail();
  const response=await input.request(endpoint.pathname+endpoint.search,init);input.assertCurrent();return response;
 };
}
