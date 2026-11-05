import {verifySyntheticDemoFixture} from './verifier.mjs';
const names=['note.png.gz','wrong-note-authority.png.gz'];
async function bounded(stream,max){
 const reader=stream?.getReader();if(!reader)throw Error('SYNTHETIC_DEMO_FIXTURE_UNAVAILABLE');
 const parts=[];let size=0;
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>max)throw Error('SYNTHETIC_DEMO_FIXTURE_CAPACITY');parts.push(next.value);}}
 finally{await reader.cancel().catch(()=>{});}
 const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return bytes;
}
async function fixture(name){
 const response=await fetch(new URL(name,import.meta.url),{credentials:'omit',redirect:'error',cache:'force-cache',signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('SYNTHETIC_DEMO_FIXTURE_UNAVAILABLE');
 const transport=await bounded(response.body,32768);
 // Fetch may already decode an HTTP Content-Encoding. Either transport still
 // has to match the exact expanded PNG SHA before the verifier can open it.
 return transport[0]===0x1f&&transport[1]===0x8b?bounded(new Blob([transport]).stream().pipeThrough(new DecompressionStream('gzip')),32768):transport;
}
let running=false;
self.addEventListener('message',async event=>{
 const request=event.data;
 if(running||!request||typeof request!=='object'||Array.isArray(request)||Object.keys(request).sort().join('|')!=='id|schema'||request.schema!=='bankeiz.synthetic-note-demo.request.v1'||typeof request.id!=='string'||!/^\d{1,8}$/.test(request.id))return;
 running=true;
 try{
  const results=[];for(const name of names)results.push(await verifySyntheticDemoFixture(await fixture(name)));
  self.postMessage({schema:'bankeiz.synthetic-note-demo.result.v1',id:request.id,scope:'synthetic-source-and-delivery-authority',results});
 }catch(cause){self.postMessage({schema:'bankeiz.synthetic-note-demo.error.v1',id:request.id,error:cause instanceof Error?cause.message:'SYNTHETIC_DEMO_UNAVAILABLE'});}
 finally{running=false;}
});
