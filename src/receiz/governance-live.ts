type GovernancePollSchedule={nextReadAt:number;retryDelay?:number};
const pollInterval=6000;

/** Hints only trigger the existing namespace reader. A different tab or the
 * device clock cannot introduce a new Original into the public directory. */
export function followGovernanceAdditions(refresh:()=>Promise<void>,doc=document,page=window,poll:GovernancePollSchedule={nextReadAt:0}){
  let closed=false,running=false,again=false,timer:ReturnType<typeof setTimeout>|undefined;
  const visible=()=>doc.visibilityState!=='hidden'&&page.navigator.onLine!==false;
  function schedule(){
    clearTimeout(timer);
    if(!closed&&visible())timer=setTimeout(wake,Math.max(0,poll.nextReadAt-Date.now()));
  }
  function wake(){
    if(closed||!visible())return;
    if(running){again=true;return;}
    clearTimeout(timer);running=true;
    const retryDelay=Math.min(60000,(poll.retryDelay??pollInterval)*2);
    const settle=(delay:number)=>{poll.retryDelay=delay;poll.nextReadAt=Date.now()+delay;};
    void refresh().then(()=>settle(pollInterval),()=>settle(retryDelay)).finally(()=>{
      running=false;if(closed)return;
      if(again){again=false;wake();}else schedule();
    });
  }
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('bankeiz-public-governance-additions.v1'):null;
  if(channel)channel.onmessage=event=>{if(event.data==='published')wake();};
  page.addEventListener('online',wake);doc.addEventListener('visibilitychange',wake);
  if(poll.nextReadAt>Date.now())schedule();else wake();
  return ()=>{closed=true;clearTimeout(timer);channel?.close();page.removeEventListener('online',wake);doc.removeEventListener('visibilitychange',wake);};
}
export function notifyGovernancePublication(){
  if(typeof BroadcastChannel!=='function')return;
  try{const channel=new BroadcastChannel('bankeiz-public-governance-additions.v1');channel.postMessage('published');channel.close();}catch{/* The next directory read discovers this addition. */}
}
