import {heldPublicLedgerFile,inspectPublicLedgerFile,type PublicLedgerFileReview} from './public-ledger-proof';
import {publicLedgerContinuation} from './public-ledger-statement';
type Source={bytes:Uint8Array;filename:string};
const verified: {source:Source;review:Promise<PublicLedgerFileReview>}[]=[];
async function inspectRetained(source:Source){
 const hit=verified.find(item=>item.source.filename===source.filename&&item.source.bytes.length===source.bytes.length&&item.source.bytes.every((v,i)=>v===source.bytes[i]));
 if(hit)return hit.review;
 const item={source:{filename:source.filename,bytes:source.bytes.slice()},review:inspectPublicLedgerFile(source)};
 verified.push(item);if(verified.length>2)verified.shift();
 try{return await item.review;}catch(error){const index=verified.indexOf(item);if(index>=0)verified.splice(index,1);throw error;}
}
const unavailable=()=>Error('PUBLIC_LEDGER_LOCAL_STORAGE_UNAVAILABLE');
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{
 let failed=false;const fail=()=>{failed=true;reject(unavailable());};
 try{const request=indexedDB.open('bankeiz.public-ledger.originals.v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('sources');request.onsuccess=()=>{if(failed)request.result.close();else resolve(request.result);};request.onerror=fail;request.onblocked=fail;}catch{fail();}
});}
async function load(key:string):Promise<Source|undefined>{const db=await database();try{return await new Promise<Source|undefined>((resolve,reject)=>{const tx=db.transaction('sources'),request=tx.objectStore('sources').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(unavailable());tx.onabort=()=>reject(unavailable());});}catch{throw unavailable();}finally{db.close();}}
async function save(key:string,value:Source){const db=await database();try{await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('sources','readwrite');transaction.objectStore('sources').put(value,key);transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(unavailable());transaction.onabort=()=>reject(unavailable());});}catch{throw unavailable();}finally{db.close();}}
export async function readRetainedPublicLedger(){const source=await load('latest');return source?inspectRetained(source):null;}
export async function retainPublicLedgerReview(review:PublicLedgerFileReview){
 const source=heldPublicLedgerFile(review);
 if(!review.snapshot){await save(`proof:${review.artifactSha256}`,{bytes:source.bytes,filename:source.filename});return review;}
 const key=`ledger:${review.snapshot.ledgerId}`,previous=await load(key);
 if(previous){const opened=await inspectRetained(previous);if(!opened.snapshot)throw Error('PUBLIC_LEDGER_HISTORY_CONFLICT');if(publicLedgerContinuation(opened.snapshot,review.snapshot)!=='extends')return opened;}
 const db=await database();try{await new Promise<void>((resolve,reject)=>{
  let changed=false;const tx=db.transaction('sources','readwrite'),store=tx.objectStore('sources'),request=store.get(key);
  request.onsuccess=()=>{const current=request.result as Source|undefined;
   const same=(!current&&!previous)||(current&&previous&&current.filename===previous.filename&&current.bytes.length===previous.bytes.length&&current.bytes.every((v,i)=>v===previous.bytes[i]));
   if(!same){changed=true;tx.abort();return;}
   const retained={bytes:source.bytes,filename:source.filename};store.put(retained,key);store.put(retained,'latest');
  };
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(changed?Error('PUBLIC_LEDGER_LOCAL_SOURCE_CHANGED'):unavailable());tx.onerror=()=>reject(unavailable());
 });}catch(error){if(error instanceof Error&&error.message==='PUBLIC_LEDGER_LOCAL_SOURCE_CHANGED')throw error;throw unavailable();}finally{db.close();}
 verified.push({source:{bytes:source.bytes.slice(),filename:source.filename},review:Promise.resolve(review)});if(verified.length>2)verified.shift();return review;
}
