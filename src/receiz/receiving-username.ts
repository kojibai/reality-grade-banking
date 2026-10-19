import {publicReceizId} from './payment-request';

export type ReceivingUsernameSession={uid:string;username:unknown;profileProjectionPending:boolean};
export const publicAccountUsername=(value:unknown)=>publicReceizId(value)?.slice(0,-10)??null;
function pause(ms:number,signal:AbortSignal):Promise<void>{
 signal.throwIfAborted();return new Promise((resolve,reject)=>{const abort=()=>{clearTimeout(timer);reject(signal.reason);};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},ms);signal.addEventListener('abort',abort,{once:true});});
}
/** A public profile name comes from the same confirmed account, never a
 * shortened local Identity Seal name or an internal Wallet address. */
export function createReceivingUsernamePreparation(options:{signal:AbortSignal;confirmed():string|null;connect():Promise<string>;read():Promise<ReceivingUsernameSession>;publish(username:string,uid:string):void;wait?:(ms:number,signal:AbortSignal)=>Promise<void>}){
 let pending:Promise<string>|undefined;
 return function prepareReceivingUsername():Promise<string>{
  if(pending)return pending;
  const work=(async()=>{
   options.signal.throwIfAborted();const retained=publicAccountUsername(options.confirmed());if(retained)return retained;
   const uid=await options.connect();options.signal.throwIfAborted();
   const connected=publicAccountUsername(options.confirmed());if(connected)return connected;
   for(const delay of [250,750,1500]){
    await (options.wait??pause)(delay,options.signal);options.signal.throwIfAborted();
    const session=await options.read();options.signal.throwIfAborted();
    if(session.uid!==uid)throw Error('RECEIVING_USERNAME_IDENTITY_CHANGED');
    const username=publicAccountUsername(session.username);
    if(username){options.publish(username,uid);return username;}
    if(!session.profileProjectionPending)throw Error('RECEIVING_USERNAME_UNAVAILABLE');
   }
   throw Error('RECEIVING_USERNAME_PENDING');
  })();pending=work;void work.finally(()=>{if(pending===work)pending=undefined;}).catch(()=>{});return work;
 };
}
