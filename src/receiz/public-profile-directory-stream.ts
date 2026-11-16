import {curatePublicProfileHead,curatePublicProfileHeadRefusal} from './public-profile-header';
import {publicProfileDirectoryUid} from './public-profile-directory-contract';
/** One optional public delivery stream. Existing display and account operations
 * never wait on connection, heartbeat, recovery or a new card. */
export function createPublicProfileDirectoryStream(deps:{fetch:typeof fetch;receive(value:unknown):Promise<void>;refresh(changed?:boolean):unknown}){
 let closed=false,connecting=false,live=false,attempt=0,abort:AbortController|undefined,reader:ReadableStreamDefaultReader<Uint8Array>|undefined,retry:ReturnType<typeof setTimeout>|undefined;
 const visible=()=>typeof document==='undefined'||document.visibilityState==='visible';
 const disconnect=()=>{live=false;abort?.abort();void reader?.cancel().catch(()=>{});};
 async function connect(){
  if(closed||connecting||!visible())return;connecting=true;abort=new AbortController();let rotate=false;
  try{
   const response=await deps.fetch('/api/bank/public-profile-directory/stream',{credentials:'omit',cache:'no-store',signal:abort.signal,headers:{accept:'text/event-stream'}});
   if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream')||!response.body){void response.body?.cancel();return;}
   reader=response.body.getReader();const decoder=new TextDecoder();let buffer='',total=0;
   while(!closed&&visible()){
    const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>16*1024*1024)throw Error('PUBLIC_PROFILE_STREAM_CAPACITY');buffer+=decoder.decode(part.value,{stream:true}).replace(/\r\n/g,'\n');if(buffer.length>2*1024*1024)throw Error('PUBLIC_PROFILE_EVENT_CAPACITY');let at;
    while((at=buffer.indexOf('\n\n'))>=0){
     const raw=buffer.slice(0,at);buffer=buffer.slice(at+2);const data=raw.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');if(!data)continue;
     const value=JSON.parse(data) as Record<string,unknown>;if(closed||abort.signal.aborted)return;
     if(value.type==='ready'){live=true;attempt=0;void Promise.resolve(deps.refresh()).catch(()=>{});}
     else if(value.type==='refresh')void Promise.resolve(deps.refresh(true)).catch(()=>{});
     else if(value.type==='reconnect'){rotate=true;return;}
     else if(value.type==='profile'){
      const card=value.card as Record<string,unknown>|undefined;if(!card||!publicProfileDirectoryUid(card.userId))continue;
      const head=curatePublicProfileHead({profile:card,viewer:{canView:true},unavailableDecorators:['profile-details']});if(head){await deps.receive(head);void Promise.resolve(deps.refresh(true)).catch(()=>{});}
     }else if(value.type==='withdraw'){
      const p=value.profile as Record<string,unknown>|undefined;if(!p||!publicProfileDirectoryUid(p.userId))continue;
      const refusal=curatePublicProfileHeadRefusal({profile:p,viewer:{canView:false}});if(refusal){await deps.receive(refusal);void Promise.resolve(deps.refresh(true)).catch(()=>{});}
     }
    }
   }
  }catch{/* Disconnect does not invalidate held profiles or their public data. */}
  finally{live=false;void reader?.cancel().catch(()=>{});reader?.releaseLock();reader=undefined;connecting=false;if(!closed&&visible())retry=setTimeout(()=>{void connect();},rotate?0:Math.min(30000,1000*2**Math.min(attempt++,5)));}
 }
 const changed=()=>{clearTimeout(retry);if(visible())void connect();else disconnect();};
 if(typeof document!=='undefined')document.addEventListener('visibilitychange',changed);
 void connect();
 return{isLive:()=>live,close(){if(closed)return;closed=true;clearTimeout(retry);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',changed);disconnect();}};
}
