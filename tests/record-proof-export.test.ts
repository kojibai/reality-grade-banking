import {expect,it,vi} from 'vitest';
import {existsSync} from 'node:fs';
const digest=async(bytes:Uint8Array)=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new Uint8Array(bytes)))].map(n=>n.toString(16).padStart(2,'0')).join('');
const input=()=>({bytes:new TextEncoder().encode('{"kind":"synthetic.record","recordedAt":"2026-11-04"}'),filename:'calendar-example.json',mimeType:'application/json',recordHash:'a'.repeat(64)});
async function fixture(){
 expect(existsSync('src/receiz/record-proof-export.ts'),'The explicit record export controller is present').toBe(true);
 const path='../src/receiz/record-proof-export';const {createRecordProofExports}=await import(/* @vite-ignore */path);
 let open=true,failWrite=false;const states=new Map(),blobs=new Map<string,Uint8Array>();
 const seal=vi.fn(async(source:ReturnType<typeof input>)=>({artifactBytes:new Uint8Array([1,2,3,...source.bytes]),filename:'calendar-example.receized.json',mimeType:'application/json',verification:{ok:true}}));
 const ports={assertOpen(){if(!open)throw Error('IDENTITY_CLOSED');},read:vi.fn(async(key:string)=>states.get(key)??null),write:vi.fn(async(key:string,next:unknown,previous:unknown)=>{if(failWrite)throw Error('STORAGE_UNAVAILABLE');if((states.get(key)??null)!==previous)throw Error('CONFLICT');states.set(key,next);}),retain:vi.fn(async(bytes:Uint8Array)=>{const key=await digest(bytes);blobs.set(key,new Uint8Array(bytes));return key;}),restore:vi.fn(async(key:string)=>{if(!blobs.has(key))throw Error('MISSING');return new Uint8Array(blobs.get(key)!);}),seal};
 return{controller:createRecordProofExports(ports),fresh:()=>createRecordProofExports(ports),ports,seal,states,blobs,close(){open=false;},failWrite(value:boolean){failWrite=value;}};
}
it('is lazy and coalesces one exact record capture into the SDK-selected file',async()=>{
 const f=await fixture();expect(f.seal).not.toHaveBeenCalled();const [a,b]=await Promise.all([f.controller.export(input()),f.controller.export(input())]);expect(a).toBe(b);expect(a.name).toBe('calendar-example.receized.json');expect(a.type).toBe('application/json');expect(f.seal).toHaveBeenCalledOnce();expect(f.ports.retain).toHaveBeenCalledOnce();expect(f.ports.write).toHaveBeenCalledOnce();
});
it('restores the exact encrypted-blob result on a new controller without resealing',async()=>{
 const f=await fixture(),first=await f.controller.export(input()),again=await f.fresh().export(input());expect(new Uint8Array(await again.arrayBuffer())).toEqual(new Uint8Array(await first.arrayBuffer()));expect(f.seal).toHaveBeenCalledOnce();expect(f.ports.restore).toHaveBeenCalledOnce();
});
it('binds the input bytes as well as the record coordinate, filename and MIME',async()=>{
 const f=await fixture();await f.controller.export(input());const changed=input();changed.bytes[changed.bytes.length-3]^=1;await f.controller.export(changed);expect(f.seal).toHaveBeenCalledTimes(2);await f.controller.export({...input(),mimeType:'text/plain'});expect(f.seal).toHaveBeenCalledTimes(3);
});
it('keeps a verified capture through retention failure so the same retry never reseals',async()=>{
 const f=await fixture();f.failWrite(true);await expect(f.controller.export(input())).rejects.toThrow('STORAGE_UNAVAILABLE');f.failWrite(false);await f.controller.export(input());expect(f.seal).toHaveBeenCalledOnce();expect(f.ports.retain).toHaveBeenCalledOnce();
});
it('does not retain or offer a refused canonical seal',async()=>{
 const f=await fixture();f.seal.mockResolvedValueOnce({artifactBytes:new Uint8Array([1]),filename:'failed.json',mimeType:'application/json',verification:{ok:false}});await expect(f.controller.export(input())).rejects.toThrow('RECORD_PROOF_SEAL_INVALID');expect(f.ports.retain).not.toHaveBeenCalled();expect(f.ports.write).not.toHaveBeenCalled();
});
it('rejects changed retained bytes and a closed identity rather than making a replacement proof',async()=>{
 const f=await fixture();await f.controller.export(input());for(const bytes of f.blobs.values())bytes[0]^=1;await expect(f.fresh().export(input())).rejects.toThrow('RECORD_PROOF_SOURCE_MISMATCH');expect(f.seal).toHaveBeenCalledOnce();f.close();await expect(f.fresh().export(input())).rejects.toThrow('IDENTITY_CLOSED');
});
it('does not retain a late seal after the owner lifetime closes',async()=>{
 const f=await fixture();let release!:(value:Awaited<ReturnType<typeof f.seal>>)=>void;f.seal.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const pending=f.controller.export(input());while(!release)await new Promise(resolve=>setTimeout(resolve,0));f.close();release({artifactBytes:new Uint8Array([1]),filename:'late.json',mimeType:'application/json',verification:{ok:true}});await expect(pending).rejects.toThrow('IDENTITY_CLOSED');expect(f.ports.retain).not.toHaveBeenCalled();
});

it('uses the exact payload SHA as the local reuse coordinate when no record hash exists',async()=>{
 const f=await fixture(),{recordHash,...capture}=input();void recordHash;const first=await f.controller.export(capture),again=await f.fresh().export(capture);expect(new Uint8Array(await again.arrayBuffer())).toEqual(new Uint8Array(await first.arrayBuffer()));expect(f.seal).toHaveBeenCalledOnce();expect([...f.states.values()][0].recordHash).toBe(await digest(capture.bytes));
});
it('preserves a malformed falsy private checkpoint instead of overwriting it with a new seal',async()=>{
 const f=await fixture();await f.controller.export(input());for(const key of f.states.keys())f.states.set(key,false);await expect(f.fresh().export(input())).rejects.toThrow('RECORD_PROOF_CHECKPOINT_INVALID');expect(f.seal).toHaveBeenCalledOnce();expect([...f.states.values()]).toEqual([false]);
});
it('captures all metadata and bytes before the real asynchronous payload hash yields',async()=>{
 const f=await fixture(),capture=input(),expected={...capture,bytes:new Uint8Array(capture.bytes)},pending=f.controller.export(capture);
 capture.filename='../substituted.json';capture.mimeType='text/plain';capture.recordHash='not-a-record-hash';capture.bytes[0]^=1;
 await pending;expect(f.seal.mock.calls[0][0]).toEqual({bytes:expected.bytes,filename:expected.filename,mimeType:expected.mimeType});expect([...f.states.values()][0]).toMatchObject({recordHash:expected.recordHash,filename:expected.filename,mimeType:expected.mimeType,payloadSha256:await digest(expected.bytes)});
});
it('bounds completed in-memory files and restores an evicted exact result without resealing',async()=>{
 const f=await fixture(),first=await f.controller.export(input());for(let i=1;i<=5;i++)await f.controller.export({...input(),recordHash:String(i).repeat(64)});
 const restored=await f.controller.export(input());expect(new Uint8Array(await restored.arrayBuffer())).toEqual(new Uint8Array(await first.arrayBuffer()));expect(f.seal).toHaveBeenCalledTimes(6);expect(f.ports.restore).toHaveBeenCalledOnce();
});
it('does not keep a large completed file in the memory cache and still reuses its retained bytes',async()=>{
 const f=await fixture();f.seal.mockResolvedValueOnce({artifactBytes:new Uint8Array(9*1024*1024),filename:'large.receized.json',mimeType:'application/json',verification:{ok:true}});const first=await f.controller.export(input()),restored=await f.controller.export(input());expect(restored).not.toBe(first);expect(restored.size).toBe(first.size);expect(f.seal).toHaveBeenCalledOnce();expect(f.ports.restore).toHaveBeenCalledOnce();
});
it('never evicts a sealed pending retention retry while trimming completed files',async()=>{
 const f=await fixture();f.failWrite(true);await expect(f.controller.export(input())).rejects.toThrow('STORAGE_UNAVAILABLE');f.failWrite(false);
 for(let i=1;i<=5;i++)await f.controller.export({...input(),recordHash:String(i).repeat(64)});await f.controller.export(input());expect(f.seal).toHaveBeenCalledTimes(6);expect(f.ports.retain).toHaveBeenCalledTimes(6);
});
