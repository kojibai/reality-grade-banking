/** In-memory IndexedDB port for the canonical custody integration test.
 * Proof construction, byte commitments and verification remain real. */
export function composerCustodyIdb(){
 const stores=new Map<string,{keyPath:string;rows:Map<string,unknown>}>();
 const db={close(){},createObjectStore(name:string,options:{keyPath:string}){stores.set(name,{keyPath:options.keyPath,rows:new Map()});},transaction(_name:string){
  let active=0,finished=false;const tx:{oncomplete?:()=>void;onabort?:()=>void;onerror?:()=>void;error:null;abort():void;objectStore(name:string):unknown}={error:null,abort(){finished=true;queueMicrotask(()=>tx.onabort?.());},objectStore(key){const store=stores.get(key);if(!store)throw Error('Unknown fixture store');return{
   get(address:string){active++;const request:{result?:unknown;onsuccess?:()=>void;onerror?:()=>void}={};queueMicrotask(()=>{request.result=store.rows.get(address);request.onsuccess?.();active--;complete();});return request;},
   put(value:Record<string,unknown>){store.rows.set(String(value[store.keyPath]),value);complete();},
  };}};
  function complete(){queueMicrotask(()=>{if(!finished&&active===0){finished=true;tx.oncomplete?.();}});}
  complete();return tx;
 }};
 let opened=false;
 return{open(){const request:{result:typeof db;onupgradeneeded?:()=>void;onsuccess?:()=>void;onerror?:()=>void;onblocked?:()=>void}={result:db};queueMicrotask(()=>{if(!opened){opened=true;request.onupgradeneeded?.();}request.onsuccess?.();});return request;}};
}
