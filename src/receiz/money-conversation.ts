import type {NativeTwinAsk,NativeTwinReply} from './native-twin';
import {moneyActionFingerprint,type MoneyAction} from './money-tools';
import type {MoneyReceipt,MoneyTurn} from './money-workspace';
export type MoneyTask={humanRequestId:string;humanText:string;step:number;receipts:MoneyReceipt[];completed:Record<string,MoneyReceipt>};
export type MoneyQuestion=Omit<NativeTwinAsk,'onDelta'|'signal'>&{moneyTask?:MoneyTask;moneyPaused?:'credits'};
export const moneyProgress:Record<string,string>={money_find_person:'Finding the right person',money_search_history:'Reading your financial history',money_list_commitments:'Checking what’s owed and due',money_record_commitment:'Saving your commitment',money_cancel_commitment:'Closing your commitment',money_report_completed:'Recording your update',money_prepare_request:'Preparing your payment request',money_check_payments:'Checking payment originals',money_review_message:'Preparing the exact message for review',money_send_reviewed:'Checking payment and delivery'};
/** Continue the SAME real Twin with actual results. Local recovery metadata is
 * never sent as human text or permission; only the original owner text is. */
export async function runMoneyConversation(input:{accountUid:string;question:MoneyQuestion;ask(question:NativeTwinAsk):Promise<NativeTwinReply>;execute(turn:MoneyTurn,action:MoneyAction):Promise<MoneyReceipt>;signal?:AbortSignal;onDelta?:(text:string)=>void;onCheckpoint?:(question:MoneyQuestion)=>Promise<void>|void;onProgress?:(status:string)=>void;onReceipt?:(receipt:MoneyReceipt)=>void}){
 let question={...input.question},task:MoneyTask=question.moneyTask??{humanRequestId:question.requestId,humanText:question.message,step:0,receipts:[],completed:{}};
 for(;;){
  input.signal?.throwIfAborted();question={...question,moneyTask:task};await input.onCheckpoint?.(question);
  const reply=await input.ask({...question,signal:input.signal,onDelta:input.onDelta});input.signal?.throwIfAborted();
  if(!reply.moneyActions?.length||task.step>=6)return{reply:task.step>=6&&reply.moneyActions?.length?{...reply,message:reply.message+'\n\nI’ve reached the work limit for this turn. Those last proposed actions have not run. Reply to continue.',moneyActions:[]}:reply,receipts:task.receipts,humanRequestId:task.humanRequestId,humanText:task.humanText};
  for(const action of reply.moneyActions){
   input.signal?.throwIfAborted();const fingerprint=moneyActionFingerprint(action);let receipt=task.completed[fingerprint];
   if(!receipt){
    input.onProgress?.(moneyProgress[action.tool]??'Working on your money task');
    const bytes=new TextEncoder().encode(fingerprint),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
    try{receipt=await input.execute({requestId:`${task.humanRequestId.slice(0,100)}:${hash}`,humanTurnId:task.humanRequestId,humanText:task.humanText},action);}catch(cause){input.signal?.throwIfAborted();const code=cause instanceof Error&&/^[A-Z][A-Z0-9_]{1,100}$/.test(cause.message)?cause.message:'MONEY_TOOL_RESULT_UNCONFIRMED';receipt={id:`${task.humanRequestId.slice(0,100)}:${hash}`,tool:action.tool,status:['money_search_history','money_find_person','money_list_commitments','money_check_payments'].includes(action.tool)?'refused':'unknown',summary:code};}input.signal?.throwIfAborted();
    task={...task,receipts:[...task.receipts,receipt],completed:{...task.completed,[fingerprint]:receipt}};input.onReceipt?.(receipt);
   }
  }
  // Keep every exact receipt in durable recovery state. Only older working
  // projections are summarized; their source coordinates stay retrievable.
  const working=task.receipts.map(receipt=>({...receipt}));let results=JSON.stringify(working);
  for(let i=0;results.length>32000&&i<working.length-1;i++){const receipt=working[i];working[i]={id:receipt.id,tool:receipt.tool,status:receipt.status,summary:receipt.summary+' Full result retained in this conversation; query its source again for details.',...(typeof receipt.data?.sourceDigest==='string'?{data:{sourceDigest:receipt.data.sourceDigest}}:{})};results=JSON.stringify(working);}
  if(results.length>32000)throw Error('MONEY_RESULT_CONTEXT_CAPACITY');
  task={...task,step:task.step+1};input.onProgress?.('Putting your money records together');
  question={...question,message:task.humanText,requestId:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+5*60*1000).toISOString(),moneyContext:{schema:'bank.money-tool-results.v1',ownerUid:input.accountUid,results},moneyTask:task};
 }
}
