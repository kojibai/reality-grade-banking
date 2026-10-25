import type {BusinessDnsView} from './business-dns-tools';
const pause=(ms:number,signal:AbortSignal)=>new Promise<void>(resolve=>{if(signal.aborted){resolve();return;}const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',finish);resolve();},timer=setTimeout(finish,ms);signal.addEventListener('abort',finish,{once:true});});
/** Continue only native domain inspection/verification. This never reconnects a
 * provider or applies DNS again. Known receipts stay visible during propagation. */
export async function monitorBusinessDomain(input:{hostname:string;inspect():Promise<BusinessDnsView>;check():Promise<BusinessDnsView>;signal:AbortSignal;onUpdate(view:BusinessDnsView):void;pause?:(ms:number,signal:AbortSignal)=>Promise<void>}){
 let failures=0;
 for(let attempt=0;attempt<60&&!input.signal.aborted;attempt++){
  if(attempt)await(input.pause??pause)(Math.min(30000,2000*2**Math.min(attempt-1,4)),input.signal);if(input.signal.aborted)return;
  try{
   const current=await input.inspect();if(input.signal.aborted)return;
   if(current.hostname!==input.hostname){input.onUpdate({...current,status:'domain_changed',summary:'The saved domain changed. The previous setup has stopped.'});return;}
   const view=await input.check();if(input.signal.aborted)return;
   if(view.hostname!==input.hostname){input.onUpdate({...view,status:'domain_changed',summary:'The saved domain changed. The previous setup has stopped.'});return;}
   failures=0;input.onUpdate(view);if(['live','domain_changed'].includes(view.status))return;
  }catch{if(input.signal.aborted||++failures>=3)return;}
 }
}
