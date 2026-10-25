export function watchMerchantCounter(input:{check(signal:AbortSignal):Promise<'changed'|'unchanged'>;onError():void;isVisible():boolean;isOnline():boolean;shouldPoll?():boolean}){
 let disposed=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined,running=false,wanted=false,step=0;
 const clear=()=>{clearTimeout(timer);timer=undefined;},available=()=>!disposed&&input.isVisible()&&input.isOnline();
 function schedule(delay:number){clear();if(available())timer=setTimeout(()=>void run(),delay);}
 async function run(){
  clear();if(!available())return;if(running){wanted=true;return;}running=true;wanted=false;const abort=new AbortController();controller=abort;let changed=false;
  const deadline=setTimeout(()=>abort.abort(Error('MERCHANT_CHECK_TIMEOUT')),15000);let onAbort!:()=>void;
  try{const aborted=new Promise<never>((_,reject)=>{onAbort=()=>reject(abort.signal.reason);abort.signal.addEventListener('abort',onAbort,{once:true});});changed=await Promise.race([input.check(abort.signal),aborted])==='changed';}
  catch{if(available())input.onError();}
  finally{clearTimeout(deadline);abort.signal.removeEventListener('abort',onAbort);if(controller===abort)controller=undefined;running=false;if(disposed)return;if(wanted){schedule(0);return;}if(input.shouldPoll?.()===false)return;if(changed)step=0;const delay=[2000,5000,15000][Math.min(step,2)];step++;schedule(delay);}
 }
 function wake(){if(disposed)return;clear();if(!available()){wanted=false;controller?.abort();return;}if(running){wanted=true;return;}step=0;schedule(0);}
 const events=['online','offline','focus','bankeiz:wallet-send-recorded'];if(typeof window!=='undefined')for(const event of events)window.addEventListener(event,wake);if(typeof document!=='undefined')document.addEventListener('visibilitychange',wake);schedule(0);
 return{wake,dispose(){disposed=true;clear();controller?.abort();if(typeof window!=='undefined')for(const event of events)window.removeEventListener(event,wake);if(typeof document!=='undefined')document.removeEventListener('visibilitychange',wake);}};
}
