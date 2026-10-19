/** The same pinned browser client used by Receiz app/lib/livekit/clientScript.ts.
 * Loaded only after the existing joined-participant SFU session route authorizes.
 * Tokens never enter script URLs or persistent storage. */
export interface NativeSfuRoom {
  on(event:string,listener:(...args:unknown[])=>void):unknown;
  connect(url:string,token:string):Promise<void>;
  disconnect():void|Promise<void>;
  localParticipant:{publishTrack(track:MediaStreamTrack,options?:Record<string,unknown>):Promise<unknown>;unpublishTrack?(track:MediaStreamTrack,stopOnUnpublish?:boolean):Promise<unknown>};
}
export interface NativeSfuClient {
  Room:new(options?:Record<string,unknown>)=>NativeSfuRoom;
  RoomEvent?:Record<string,string>;
  Track?:{Source?:{Microphone?:string;Camera?:string}};
}
let pending:Promise<NativeSfuClient>|null=null;
function existing(){const value=globalThis as typeof globalThis&{LivekitClient?:NativeSfuClient;livekit?:NativeSfuClient;LiveKitClient?:NativeSfuClient};return value.LivekitClient??value.livekit??value.LiveKitClient;}
export function loadReceizSfuClient():Promise<NativeSfuClient>{
  const client=existing();if(client)return Promise.resolve(client);
  if(pending)return pending;
  pending=new Promise<NativeSfuClient>((resolve,reject)=>{
    if(typeof document==='undefined'){reject(Error('chat_call_sfu_unavailable'));return;}
    const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/livekit-client@2.15.4/dist/livekit-client.umd.min.js';script.async=true;script.crossOrigin='anonymous';
    const timeout=setTimeout(()=>finish(),15_000);
    function finish(){clearTimeout(timeout);script.onload=null;script.onerror=null;const value=existing();if(value)resolve(value);else{script.remove();reject(Error('chat_call_sfu_unavailable'));}}
    script.onload=finish;script.onerror=finish;document.head.appendChild(script);
  }).catch(error=>{pending=null;throw error;});
  return pending;
}
