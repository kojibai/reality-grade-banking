import {expect,it} from 'vitest';
import {createNativeTwin} from '../src/receiz/native-twin';
import {runMoneyConversation,type MoneyQuestion} from '../src/receiz/money-conversation';
import {createMoneyWorkspace} from '../src/receiz/money-workspace';
import {createMoneyLedgerHistory} from '../src/receiz/money-ledger-history';
import {createMoneyConversationRetention} from '../src/receiz/money-conversation-retention';
import {moneyActionFingerprint} from '../src/receiz/money-tools';
import {parsePrivateHistoryPage} from '../src/receiz/private-history';
import type {PrivateHistoryCache} from '../src/receiz/identity-vault';

const uid='10000000-0000-4000-8000-000000000001';
const humanText='Can you recap my finances for me of my recent transactions';
const question:MoneyQuestion={message:humanText,requestId:'financial-review-0001',quoteExpiresAt:'2026-11-07T15:00:00.000Z',moneyTools:true};
const action={tool:'money_search_history',args:{query:null,from:null,to:null,direction:null,offset:0,limit:50}};

function fixture(request:(path:string,init?:RequestInit)=>Promise<Response>){
 const page=parsePrivateHistoryPage({ok:true,accountUserId:uid,nextCursor:null,events:Array.from({length:21},(_,index)=>({id:'transaction-'+index,kind:'reserve_credit',summary:index===0?'Studio payment':'Recorded funding '+index,createdAt:new Date(Date.UTC(2026,10,7,13,0,0)-index*60000).toISOString(),amountUsdCents:index===0?'9007199254740993':'100'}))},uid);
 let cache:PrivateHistoryCache={schema:'bank.private-history-cache.v1',accountUid:uid,observedAt:'2026-11-07T14:00:00.000Z',records:page.records,nextCursor:null,pages:[{cursor:null,json:page.sourceJson}]};
 const history=createMoneyLedgerHistory({accountUid:uid,assertOpen(){},retained:async()=>cache,read:async()=>{throw Error('UNEXPECTED_HISTORY_REFETCH');},remember:value=>{cache=value;}});
 const workspace=createMoneyWorkspace({accountUid:uid,identityDigest:'a'.repeat(64),assertOpen(){},history:query=>history.search(query),store:{read:async()=>{throw Error('UNEXPECTED_PLANNING_READ');},write:async()=>{throw Error('UNEXPECTED_PLANNING_WRITE');}},lock:async work=>work(),counter:async()=>{throw Error('UNEXPECTED_PAYMENT_ACCESS');},messages:async()=>{throw Error('UNEXPECTED_MESSAGE_ACCESS');}});
 let saved:unknown=null;
 const retention=createMoneyConversationRetention({accountUid:uid,identityDigest:'a'.repeat(64),assertOpen(){},store:{read:async()=>structuredClone(saved),write:async next=>{saved=structuredClone(next);}},lock:async work=>work()});
 const twin=createNativeTwin({accountUid:uid,username:'owner',assertOpen(){},request});
 return{workspace,retention,twin};
}

function response(requestId:string,actions:unknown[],message='I’m checking your recorded transactions.'){
 const result={ok:true,requestId,world:{username:'owner'},moneyToolsSupported:true,moneyActions:actions,reply:{message,source:'upstream',actions:[],memory:[]}};
 return new Response(`event: delta\ndata: ${JSON.stringify({text:message})}\n\nevent: result\ndata: ${JSON.stringify(result)}\n\n`,{headers:{'content-type':'text/event-stream'}});
}

it('completes a recent-finances recap through native transport, bounded Ledger pages and retained exact results',async()=>{
 const received:Record<string,unknown>[]=[];
 const f=fixture(async(path,init)=>{
  expect(path).toBe('/api/developers/twin/owner/message');
  const body=JSON.parse(String(init?.body));received.push(body);
  expect(body.message).toBe(humanText);expect(body.moneyTools).toBe(true);
  expect(body.stream).toBe(true);
  expect(body).not.toHaveProperty('moneyTask');
  if(!body.moneyContext)return response(body.requestId,[action]);
  const receipts=JSON.parse(body.moneyContext.results);
  expect(body.moneyContext.ownerUid).toBe(uid);
  expect(receipts.every((row:{status:string})=>row.status==='accepted')).toBe(true);
  expect(receipts[0].data.transactions).toHaveLength(20);
  expect(receipts[0].data.transactions[0]).toMatchObject({transactionId:'transaction-0',amountUsdCents:'9007199254740993'});
  expect(receipts[0].data.coverage.source).toBe('private-account-ledger');
  if(receipts.length===1){expect(receipts[0].data.nextOffset).toBe(20);return response(body.requestId,[{tool:'money_search_history',args:{offset:20,limit:50}}]);}
  expect(receipts[1].data.transactions).toHaveLength(1);expect(receipts[1].data.nextOffset).toBeNull();
  return response(body.requestId,[],'Your recent recorded activity includes the Studio payment and 20 other funding entries.');
 });
 const deltas:string[]=[];
 const result=await runMoneyConversation({accountUid:uid,question,ask:q=>f.twin.ask(q),execute:(turn,next)=>f.workspace.execute(turn,next),onCheckpoint:q=>f.retention.checkpoint(q),onDelta:text=>{deltas.push(text);}});
 expect(result.reply.message).toContain('Studio payment');expect(result.reply.moneyActions).toEqual([]);
 expect(result.receipts.map(row=>row.status)).toEqual(['accepted','accepted']);
 expect(result.humanRequestId).toBe(question.requestId);expect(received).toHaveLength(3);
 expect(deltas.at(-1)).toBe(result.reply.message);
 const held=await f.retention.recoverQuestion();expect(held?.moneyTask?.receipts).toEqual(result.receipts);
 await f.retention.checkpoint(null);expect(await f.retention.recoverQuestion()).toBeNull();
});

it.each([
 {tool:'money_search_history',args:{from:'yesterday'}},
 {tool:'money_prepare_request',args:{id:'commitment-1'}},
 {tool:'money_send_reviewed',args:{reviewId:'review-1'}},
])('does not replay an invalid read or financial effect during recovery: $tool',async next=>{
 const fingerprint=moneyActionFingerprint(next),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))].map(value=>value.toString(16).padStart(2,'0')).join('').slice(0,24);
 const refused={id:question.requestId+':'+hash,tool:next.tool,status:'refused' as const,summary:'MONEY_QUERY_INVALID'};
 const held:MoneyQuestion={...question,moneyTask:{humanRequestId:question.requestId,humanText,step:1,receipts:[refused],completed:{[fingerprint]:refused}}};
 let calls=0;
 const f=fixture(async(_path,init)=>{const body=JSON.parse(String(init?.body));if(++calls===1)return response(body.requestId,[next]);expect(JSON.parse(body.moneyContext.results)[0].status).toBe('refused');return response(body.requestId,[],'The held result is unchanged.');});
 let executions=0;
 const result=await runMoneyConversation({accountUid:uid,question:held,ask:f.twin.ask,execute:async()=>{executions++;throw Error('MUST_NOT_REPLAY');},onCheckpoint:q=>f.retention.checkpoint(q)});
 expect(executions).toBe(0);expect(result.receipts).toEqual([refused]);
});

it('resumes an interrupted recap with its accepted read and exact original human turn intact',async()=>{
 let interrupted=true,repeated=false;
 const f=fixture(async(_path,init)=>{
  const body=JSON.parse(String(init?.body));
  if(!body.moneyContext)return response(body.requestId,[action]);
  if(interrupted){interrupted=false;throw Error('CONNECTION_ENDED');}
  expect(JSON.parse(body.moneyContext.results)[0].status).toBe('accepted');
  // A repeated proposal must reuse the retained read, without re-executing it.
  if(!repeated){repeated=true;return response(body.requestId,[action]);}
  return response(body.requestId,[], 'Your recorded transactions are ready.');
 });
 let executions=0;
 const execute:typeof f.workspace.execute=async(turn,next)=>{executions++;return f.workspace.execute(turn,next);};
 const callbacks={accountUid:uid,ask:f.twin.ask,execute,onCheckpoint:(q:MoneyQuestion)=>f.retention.checkpoint(q)};
 await expect(runMoneyConversation({...callbacks,question})).rejects.toThrow('CONNECTION_ENDED');
 const held=(await f.retention.recoverQuestion())!;
 const result=await runMoneyConversation({...callbacks,question:held});
 expect(result.reply.message).toBe('Your recorded transactions are ready.');expect(executions).toBe(1);
 expect(result.humanText).toBe(humanText);expect(result.receipts).toEqual(held.moneyTask!.receipts);
});

it('recovers a saved query-format refusal when the same read now satisfies the aligned contract',async()=>{
 const fingerprint=moneyActionFingerprint(action),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))].map(value=>value.toString(16).padStart(2,'0')).join('').slice(0,24);
 const refused={id:question.requestId+':'+hash,tool:action.tool,status:'refused' as const,summary:'MONEY_QUERY_INVALID'};
 const held:MoneyQuestion={...question,moneyTask:{humanRequestId:question.requestId,humanText,step:1,receipts:[refused],completed:{[fingerprint]:refused}}};
 let calls=0;
 const f=fixture(async(_path,init)=>{
  const body=JSON.parse(String(init?.body));
  if(++calls===1)return response(body.requestId,[action]);
  expect(JSON.parse(body.moneyContext.results)[0].status).toBe('accepted');
  return response(body.requestId,[],'Your recorded transactions are ready.');
 });
 await f.retention.checkpoint(held);
 const result=await runMoneyConversation({accountUid:uid,question:(await f.retention.recoverQuestion())!,ask:f.twin.ask,execute:f.workspace.execute,onCheckpoint:q=>f.retention.checkpoint(q)});
 expect(result.receipts).toHaveLength(1);expect(result.receipts[0]).toMatchObject({id:refused.id,status:'accepted'});
 expect((await f.retention.recoverQuestion())?.moneyTask?.receipts).toEqual(result.receipts);
});
