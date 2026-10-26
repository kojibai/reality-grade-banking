import type {LocalFinancialRuntime,FinancialExecutorOptions,FinancialCommit,FinancialAction,FinancialPublication} from './local-financial-runtime';
export type {LocalFinancialRuntime} from './local-financial-runtime';
type FinancialRuntime=LocalFinancialRuntime;
type ExecutorOptions=FinancialExecutorOptions;
let loading:Promise<FinancialRuntime>|undefined;
export function loadLocalFinancialRuntime():Promise<FinancialRuntime>{
 return loading??=import('./offline-notes').then(({loadBankNoteRuntime})=>loadBankNoteRuntime()).then(runtime=>runtime as unknown as FinancialRuntime).catch(error=>{loading=undefined;throw error;});
}
export type LocalFinancialSessionOptions=Readonly<{
 sourceBytes:Uint8Array;applicationId:string;accountUid:string;ownerReceizId:string;
 originals:ExecutorOptions['originals'];store:ExecutorOptions['store'];
 signOwner:ExecutorOptions['signOwner'];signRecord:ExecutorOptions['signRecord'];
 publish(batch:FinancialPublication):Promise<unknown>;
 assertOpen():void;online():boolean;
 /** Host lifecycle connection, shared with its existing synchronization. */
 subscribeReconnect?(listener:()=>void):()=>void;
 onCommitted?(commit:FinancialCommit):void|Promise<void>;
 runtime?:FinancialRuntime;kai?:()=>string;
}>;
/** Thin composition only. The SDK admits the whole funded Source and owns all
 * arithmetic, signatures, atomic commitment, recovery and publication checks.
 * No observation, callback result or queued request can report completion. */
export async function createLocalFinancialSession(input:LocalFinancialSessionOptions){
 input.assertOpen();
 const runtime=input.runtime??await loadLocalFinancialRuntime();
 const source=await runtime.admitReceizAccountFinancialSource(input.sourceBytes.slice());
 input.assertOpen();
 if(source.accountUserId!==input.accountUid||source.ownerReceizId!==input.ownerReceizId||runtime.financialSourceApplicationId(source)!==input.applicationId)throw Error('BANK_LOCAL_FINANCIAL_IDENTITY_MISMATCH');
 const kai=input.kai??runtime.financialKaiNow;
 const executor=await runtime.createReceizAccountFinancialExecutor({source,store:input.store,originals:input.originals,signOwner:input.signOwner,signRecord:input.signRecord,kai});
 const publisher=await runtime.createReceizAccountFinancialPublisher({source,executor,store:input.store,originals:input.originals,publish:async batch=>{input.assertOpen();if(!input.online())throw Error('BANK_LOCAL_FINANCIAL_OFFLINE');return input.publish(batch);}});
 let closed=false,scheduled=false;
 function open(){input.assertOpen();if(closed)throw Error('BANK_LOCAL_FINANCIAL_CLOSED');}
 function nudge(){
  if(closed||scheduled||!input.online())return;
  scheduled=true;queueMicrotask(()=>{scheduled=false;if(!closed)void publisher.flush();});
 }
 const unsubscribe=input.subscribeReconnect?.(nudge);
 nudge();
 return Object.freeze({
  async preview(action:FinancialAction){open();const current=await executor.current();open();return runtime.projectReceizAccountFinancialAction(source,current.state,action,kai());},
  async execute(request:Parameters<typeof executor.execute>[0]){
   open();const result=await executor.execute(request);
   if(result.status==='committed'){
    // Optional presentation and delivery are subsequent to the SDK's durable
    // accepted Original. Their failure cannot turn it into another execution.
    try{void Promise.resolve(input.onCommitted?.(result)).catch(()=>{});}catch{/* Retained completion remains available through resolve. */}
    nudge();
   }
   return result;
  },
  current(){open();return executor.current();},
  async wallet(){open();const current=await executor.current();open();return runtime.financialSourceWalletAt(source,current.state,kai());},
  resolve(operationId:string){open();return executor.resolve(operationId);},
  async received(operationId:string){open();const proof=await publisher.received(operationId);open();return proof;},
  flush(){open();return publisher.flush();},
  dispose(){if(closed)return;closed=true;unsubscribe?.();publisher.dispose();},
 });
}
