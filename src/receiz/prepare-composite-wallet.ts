import type {WalletObservation} from './wallet-observation';
import type {CompositeWalletSource} from './composite-wallet-history';
import {compositeWalletObservation} from './composite-wallet-source';
/** First capture prepares one complete chart. Retained device resume never
 * starts this worker or recalculates held historical samples. */
export function prepareCompositeWallet(value:WalletObservation,source:CompositeWalletSource,signal:AbortSignal,retained?:WalletObservation):Promise<WalletObservation|null>{
 if(signal.aborted)return Promise.reject(signal.reason);
 if(typeof Worker==='undefined')return Promise.resolve(compositeWalletObservation(value,source,retained));
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./composite-wallet-worker.ts',import.meta.url),{type:'module'});
  const close=()=>{worker.terminate();signal.removeEventListener('abort',abort);};
  const abort=()=>{close();reject(signal.reason);};signal.addEventListener('abort',abort,{once:true});
  worker.onmessage=event=>{close();resolve(event.data?.ok===true?event.data.value:null);};
  worker.onerror=()=>{close();resolve(null);};
  worker.postMessage({value,source,retained});
 });
}
