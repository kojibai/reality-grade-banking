import type {OpenIdentity} from './native-identity';
import {TwinUpgradeError,type TwinUpgradeInput,type TwinUpgradeResult} from './twin-upgrade';

type UpgradeState={result:TwinUpgradeResult|null;pending:boolean;uncertain:boolean;error:string;notice:string};
type UpgradeSession={known():UpgradeState;subscribe(listener:()=>void):()=>void;run(input:TwinUpgradeInput):Promise<void>};
const sessions=new WeakMap<OpenIdentity,UpgradeSession>();
/** Keep a chosen checkout through view changes, scoped to the open identity.
 * Nothing is fetched, persisted or charged by opening this display state. */
export function twinUpgradeSession(identity:OpenIdentity):UpgradeSession{
 const existing=sessions.get(identity);if(existing)return existing;
 let state:UpgradeState={result:null,pending:false,uncertain:false,error:'',notice:''},inFlight:Promise<void>|null=null;
 const listeners=new Set<()=>void>(),publish=(change:Partial<UpgradeState>)=>{state={...state,...change};listeners.forEach(listener=>listener());};
 const session:UpgradeSession={known:()=>state,subscribe:listener=>{listeners.add(listener);return()=>{listeners.delete(listener);};},run(input){
  if(inFlight)return inFlight;
  if(!identity.upgradeTwin||input.action==='checkout'&&(state.uncertain||state.result?.checkout||state.result?.billingPortal))return Promise.resolve();
  publish({pending:true,error:'',notice:''});
  inFlight=Promise.resolve().then(async()=>{
   try{
    const result=await identity.upgradeTwin!(input);
    publish(result.twinAccess||input.action!=='status'?{result,uncertain:false}:{notice:'Your account has not yet confirmed the upgrade.'});
   }catch(error){
    publish({...(input.action==='checkout'?{uncertain:!(error instanceof TwinUpgradeError&&error.checkoutNotStarted)}:{}),error:'The upgrade outcome is not confirmed. Check your account before starting another payment.'});
   }finally{inFlight=null;publish({pending:false});}
  });
  return inFlight;
 }};
 sessions.set(identity,session);return session;
}
