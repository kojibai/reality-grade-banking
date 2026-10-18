import {heldPublicLedgerFile,inspectPublicLedgerFile,type PublicLedgerFileReview} from './public-ledger-proof';
import {publicLedgerContinuation} from './public-ledger-statement';
type Source={bytes:Uint8Array;filename:string};
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('bankeiz.public-ledger.originals.v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('sources');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('PUBLIC_LEDGER_LOCAL_STORAGE_UNAVAILABLE'));});}
async function load(key:string):Promise<Source|undefined>{const db=await database();try{return await new Promise((resolve,reject)=>{const request=db.transaction('sources').objectStore('sources').get(key);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}finally{db.close();}}
async function save(key:string,value:Source){const db=await database();try{await new Promise<void>((resolve,reject)=>{const transaction=db.transaction('sources','readwrite');transaction.objectStore('sources').put(value,key);transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);});}finally{db.close();}}
export async function readRetainedPublicLedger(){const source=await load('latest');return source?inspectPublicLedgerFile(source):null;}
export async function retainPublicLedgerReview(review:PublicLedgerFileReview){
 const source=heldPublicLedgerFile(review);
 if(!review.snapshot){await save(`proof:${review.artifactSha256}`,{bytes:source.bytes,filename:source.filename});return review;}
 const key=`ledger:${review.snapshot.ledgerId}`,previous=await load(key);
 if(previous){const opened=await inspectPublicLedgerFile(previous);if(!opened.snapshot)throw Error('PUBLIC_LEDGER_HISTORY_CONFLICT');if(publicLedgerContinuation(opened.snapshot,review.snapshot)==='older')return opened;}
 const db=await database();try{await new Promise<void>((resolve,reject)=>{
  const tx=db.transaction('sources','readwrite'),store=tx.objectStore('sources'),request=store.get(key);
  request.onsuccess=()=>{const current=request.result as Source|undefined;
   const same=(!current&&!previous)||(current&&previous&&current.filename===previous.filename&&current.bytes.length===previous.bytes.length&&current.bytes.every((v,i)=>v===previous.bytes[i]));
   if(!same){tx.abort();return;}
   const retained={bytes:source.bytes,filename:source.filename};store.put(retained,key);store.put(retained,'latest');
  };
  tx.oncomplete=()=>resolve();tx.onabort=()=>reject(Error('PUBLIC_LEDGER_LOCAL_SOURCE_CHANGED'));tx.onerror=()=>reject(tx.error);
 });}finally{db.close();}return review;
}
