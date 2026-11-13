import type {NativeTwinAsk,NativeTwinReply} from './native-twin';
import {moneyActionFingerprint,type MoneyAction} from './money-tools';
import {readMoneyHistoryQuery} from './money-history-query';
import type {MoneyReceipt,MoneyTurn} from './money-workspace';
export type MoneyTask={humanRequestId:string;humanText:string;step:number;receipts:MoneyReceipt[];completed:Record<string,MoneyReceipt>};
export type MoneyQuestion=Omit<NativeTwinAsk,'onDelta'|'signal'>&{moneyTask?:MoneyTask;moneyPaused?:'credits'};
export const moneyProgress:Record<string,string>={money_find_person:'Finding the right person',money_search_history:'Reading your financial history',money_list_commitments:'Checking what’s owed and due',money_record_commitment:'Saving your commitment',money_cancel_commitment:'Closing your commitment',money_report_completed:'Recording your update',money_prepare_request:'Preparing your payment request',money_check_payments:'Checking payment originals',money_review_message:'Preparing the exact message for review',money_send_reviewed:'Checking payment and delivery'};
function failureCode(cause:unknown){const status=(cause as {status?:unknown}|null)?.status;if(typeof status==='number'&&Number.isInteger(status)&&status>=400&&status<=599)return `HTTP_${status}`;return cause instanceof Error&&/^[A-Z][A-Z0-9_]{1,100}$/.test(cause.message)?cause.message:'MONEY_TOOL_RESULT_UNCONFIRMED';}
function compactHistory(receipt:MoneyReceipt):MoneyReceipt{
 if(receipt.tool!=='money_search_history'||!Array.isArray(receipt.data?.transactions))return receipt;
 const fields=['transactionId','recordId','recordLink','paymentReference','sequence','kind','displayTime','kaiUPulse','direction','amountUsdCents','amountPhiMicro','reserveDeltaUsdCents','settlementDeltaPhiMicro','balanceDeltaPhiMicro'];
 const tradeFields=['side','tradeId','shareQuantityMicro','priceUsdCents','notionalUsdCents','settlementUsdCents','feeUsdCents','realizedCostBasisUsdCents'];
 return{...receipt,data:{...receipt.data,workingProjection:'Full records are retained in the conversation and Ledger; long descriptive text is shortened only in this model working context.',transactions:receipt.data.transactions.map(value=>{
  const row=value as Record<string,unknown>,trade=row.assetTrade&&typeof row.assetTrade==='object'?row.assetTrade as Record<string,unknown>:null;return{...Object.fromEntries(fields.filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]])),...(typeof row.title==='string'?{title:row.title.slice(0,80)}:{}),...(typeof row.description==='string'?{description:row.description.slice(0,160)}:{}),...(trade?{assetTrade:Object.fromEntries(tradeFields.filter(key=>Object.hasOwn(trade,key)).map(key=>[key,trade[key]]))}:{})};
 })}};
}
/** Continue the SAME real Twin with actual results. Local recovery metadata is
 * never sent as human text or permission; only the original owner text is. */
export async function runMoneyConversation(input:{accountUid:string;question:MoneyQuestion;ask(question:NativeTwinAsk):Promise<NativeTwinReply>;execute(turn:MoneyTurn,action:MoneyAction):Promise<MoneyReceipt>;signal?:AbortSignal;onDelta?:(text:string)=>void;onReply?:(reply:NativeTwinReply)=>void;onCheckpoint?:(question:MoneyQuestion)=>Promise<void>|void;onProgress?:(status:string)=>void;onReceipt?:(receipt:MoneyReceipt)=>void}){
 let question={...input.question},task:MoneyTask=question.moneyTask??{humanRequestId:question.requestId,humanText:question.message,step:0,receipts:[],completed:{}};
 // Explicit recovery may check a previously invalid read once under the aligned
 // query contract. Accepted reads, unknown effects and writes remain retained.
 const recoverableReads=new Set<string>();
 if(input.question.moneyTask)for(const[fingerprint,receipt]of Object.entries(task.completed)){
  if(receipt.tool==='money_search_history'&&receipt.status==='refused'&&receipt.summary==='MONEY_QUERY_INVALID')try{readMoneyHistoryQuery(JSON.parse(fingerprint).args);recoverableReads.add(fingerprint);}catch{/* The query is still invalid. */}
 }
 for(;;){
  input.signal?.throwIfAborted();question={...question,moneyTask:task};await input.onCheckpoint?.(question);
  const reply=await input.ask({...question,signal:input.signal,onDelta:input.onDelta});input.signal?.throwIfAborted();input.onReply?.(reply);
  if(!reply.moneyActions?.length||task.step>=6)return{reply:task.step>=6&&reply.moneyActions?.length?{...reply,message:reply.message+'\n\nI’ve reached the work limit for this turn. Those last proposed actions have not run. Reply to continue.',moneyActions:[]}:reply,receipts:task.receipts,humanRequestId:task.humanRequestId,humanText:task.humanText};
  for(const action of reply.moneyActions){
   input.signal?.throwIfAborted();const fingerprint=moneyActionFingerprint(action);let receipt:MoneyReceipt|undefined=task.completed[fingerprint];
   if(recoverableReads.delete(fingerprint))receipt=undefined;
   if(!receipt){
    input.onProgress?.(moneyProgress[action.tool]??'Working on your money task');
    const bytes=new TextEncoder().encode(fingerprint),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
    try{receipt=await input.execute({requestId:`${task.humanRequestId.slice(0,100)}:${hash}`,humanTurnId:task.humanRequestId,humanText:task.humanText},action);}catch(cause){input.signal?.throwIfAborted();receipt={id:`${task.humanRequestId.slice(0,100)}:${hash}`,tool:action.tool,status:['money_search_history','money_find_person','money_list_commitments','money_check_payments'].includes(action.tool)?'refused':'unknown',summary:failureCode(cause)};}input.signal?.throwIfAborted();
    const nextReceipt=receipt;
    task={...task,receipts:task.receipts.some(row=>row.id===nextReceipt.id)?task.receipts.map(row=>row.id===nextReceipt.id?nextReceipt:row):[...task.receipts,nextReceipt],completed:{...task.completed,[fingerprint]:nextReceipt}};input.onReceipt?.(nextReceipt);
   }
  }
  // Keep every exact receipt in durable recovery state. Only older working
  // projections are summarized; their source coordinates stay retrievable.
  const working=task.receipts.map(receipt=>({...receipt}));let results=JSON.stringify(working);
  for(let i=0;results.length>32000&&i<working.length-1;i++){const receipt=working[i];working[i]={id:receipt.id,tool:receipt.tool,status:receipt.status,summary:receipt.summary+' Full result retained in this conversation; query its source again for details.',...(typeof receipt.data?.sourceDigest==='string'?{data:{sourceDigest:receipt.data.sourceDigest}}:{})};results=JSON.stringify(working);}
  if(results.length>32000){working[working.length-1]=compactHistory(working[working.length-1]);results=JSON.stringify(working);}
  if(results.length>32000)throw Error('MONEY_RESULT_CONTEXT_CAPACITY');
  task={...task,step:task.step+1};input.onProgress?.('Putting your money records together');
  question={...question,message:task.humanText,requestId:crypto.randomUUID(),quoteExpiresAt:new Date(Date.now()+5*60*1000).toISOString(),moneyContext:{schema:'bank.money-tool-results.v1',ownerUid:input.accountUid,results},moneyTask:task};
 }
}
