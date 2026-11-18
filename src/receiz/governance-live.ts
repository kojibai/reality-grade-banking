/** Hints only trigger the existing namespace reader. A different tab or the
 * device clock cannot introduce a new Original into the public directory. */
export function followGovernanceAdditions(refresh:()=>Promise<void>,doc=document,page=window){
  let closed=false,running=false,again=false,delay=6000,timer:ReturnType<typeof setTimeout>|undefined;
  const visible=()=>doc.visibilityState!=='hidden'&&page.navigator.onLine!==false;
  function schedule(){
    clearTimeout(timer);
    if(!closed&&visible())timer=setTimeout(wake,delay);
  }
  function wake(){
    if(closed||!visible())return;
    if(running){again=true;return;}
    clearTimeout(timer);running=true;
    void refresh().then(()=>{delay=6000;},()=>{delay=Math.min(60000,delay*2);}).finally(()=>{
      running=false;if(closed)return;
      if(again){again=false;wake();}else schedule();
    });
  }
  const channel=typeof BroadcastChannel==='function'?new BroadcastChannel('bankeiz-public-governance-additions.v1'):null;
  if(channel)channel.onmessage=event=>{if(event.data==='published')wake();};
  page.addEventListener('online',wake);doc.addEventListener('visibilitychange',wake);
  wake();
  return ()=>{closed=true;clearTimeout(timer);channel?.close();page.removeEventListener('online',wake);doc.removeEventListener('visibilitychange',wake);};
}
export function notifyGovernancePublication(){
  if(typeof BroadcastChannel!=='function')return;
  try{const channel=new BroadcastChannel('bankeiz-public-governance-additions.v1');channel.postMessage('published');channel.close();}catch{/* The next directory read discovers this addition. */}
}
