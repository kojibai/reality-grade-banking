/** An owner-scoped read of exact retained bytes. This is a locator, never
 * proof admission. Callers must use the canonical reader before exporting. */
export type HeldLedgerOriginalReader=((digest:string)=>Promise<File|null>)&{
 assertOpen?:()=>void;
 transferOriginal?:(record:import('./public-network').PublicRecord)=>Promise<File|null>;
};
type Source={bytes:Uint8Array;filename:string;role?:string};
export function createHeldLedgerOriginalReader(input:{assertOpen():void;read(digest:string):Promise<Source|null>}):HeldLedgerOriginalReader{
 const held=new Map<string,Promise<File|null>>();
 const reader:HeldLedgerOriginalReader=async digest=>{
  input.assertOpen();if(!/^[a-f0-9]{64}$/.test(digest))throw Error('PROOF_SOURCE_INVALID');
  let pending=held.get(digest);
  if(!pending){
   pending=(async()=>{
    const source=await input.read(digest);input.assertOpen();if(!source)return null;
    // Internal account-coordination sources are not transaction downloads.
    if(source.role||!source.bytes.length||source.bytes.length>32*1024*1024||!source.filename||source.filename.length>240||/[/\\\x00-\x1f\x7f]/.test(source.filename))throw Error('PROOF_SOURCE_INVALID');
    const bytes=new Uint8Array(source.bytes),actual=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');input.assertOpen();
    if(actual!==digest)throw Error('PROOF_SOURCE_DIGEST_MISMATCH');
    return new File([bytes],source.filename,{type:'application/octet-stream'});
   })();held.set(digest,pending);
   while(held.size>4)held.delete(held.keys().next().value!);
   void pending.then(value=>{if(!value&&held.get(digest)===pending)held.delete(digest);},()=>{if(held.get(digest)===pending)held.delete(digest);});
  }
  const file=await pending;input.assertOpen();return file;
 };
 reader.assertOpen=input.assertOpen;return reader;
}
