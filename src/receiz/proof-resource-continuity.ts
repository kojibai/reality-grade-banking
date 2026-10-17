export type BankProofResources={wasm:Uint8Array;zkey:Uint8Array};
type ResourceCache={match(path:string):Promise<Response|undefined>};
/** Public proving resources are also in the versioned offline installation.
 * SDK/native sealing checks their canonical hashes before generating a proof. */
export async function loadBankProofResources(network:typeof fetch,local?:ResourceCache,signal?:AbortSignal):Promise<BankProofResources>{
 const retained=local??(typeof caches!=='undefined'?{match:(path:string)=>caches.match(new URL(path,location.origin).href)}:undefined);
 const resources=await Promise.all(['/zk/document-seal.wasm','/zk/document-seal.zkey'].map(async path=>{
   const cached=await retained?.match(path).catch(()=>undefined);
   const response=cached?.ok?cached:await network(path,{credentials:'omit',signal});
   if(!response.ok)throw Error('Receiz proof resources are unavailable.');
   const bytes=new Uint8Array(await response.arrayBuffer());
   if(!bytes.length||bytes.length>32*1024*1024)throw Error('Receiz proof resources are unavailable.');
   return bytes;
 }));return{wasm:resources[0],zkey:resources[1]};
}
