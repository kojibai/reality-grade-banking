import {compositeWalletObservation} from './composite-wallet-source';
// Deterministic display work stays off the animation/input thread. No fetch,
// database, signer or execution capability is available to this worker.
self.onmessage=event=>{
 try{self.postMessage({ok:true,value:compositeWalletObservation(event.data.value,event.data.source,event.data.retained)});}
 catch{self.postMessage({ok:false});}
};
