const topic='bankeiz.public-ledger.sync.v1',eventName='bankeiz:public-ledger-sync';
const listeners=new Set<()=>void>();
let channel:BroadcastChannel|null=null;
const valid=(value:unknown):value is {type:string;artifactSha256:string}=>!!value&&typeof value==='object'&&(value as {type?:unknown}).type===topic&&typeof(value as {artifactSha256?:unknown}).artifactSha256==='string'&&/^[a-f0-9]{64}$/.test((value as {artifactSha256:string}).artifactSha256);
function received(value:unknown){if(valid(value))for(const listener of [...listeners])listener();}
const local=(event:Event)=>received((event as CustomEvent).detail);
/** A notification requests a fresh read. It grants no source or financial authority. */
export function subscribePublicLedgerSync(listener:()=>void){
 if(!listeners.size){window.addEventListener(eventName,local);try{channel=typeof BroadcastChannel==='function'?new BroadcastChannel(topic):null;if(channel)channel.onmessage=event=>received(event.data);}catch{channel=null;}}
 listeners.add(listener);
 return()=>{listeners.delete(listener);if(!listeners.size){window.removeEventListener(eventName,local);channel?.close();channel=null;}};
}
export function announcePublicLedgerPublication(artifactSha256:string){
 const value={type:topic,artifactSha256};if(!valid(value))throw Error('PUBLIC_LEDGER_SYNC_DIGEST_INVALID');
 window.dispatchEvent(new CustomEvent(eventName,{detail:value}));
 try{channel?.postMessage(value);}catch{/* The shared HTTP source remains the synchronization path. */}
}
