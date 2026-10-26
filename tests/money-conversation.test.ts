import {expect,it,vi} from 'vitest';
import {runMoneyConversation} from '../src/receiz/money-conversation';
import type {NativeTwinReply} from '../src/receiz/native-twin';
const base={message:'Who owes me?',requestId:'question-0001',quoteExpiresAt:new Date().toISOString(),moneyTools:true};
const reply=(id:string,actions:unknown[]=[])=>({requestId:id,message:actions.length?'Checking…':'Acme owes you $125.',moneyActions:actions,authority:'generated-interpretation',source:'upstream',memoryScope:'relationship',memory:[],sourceReferences:[],sharedContext:[],actionHandoffs:[]}) as NativeTwinReply;
it('continues the actual Twin with actual money tool results in the same human turn',async()=>{
 const checkpoints:unknown[]=[],progress:string[]=[],execute=vi.fn(async(_turn:import('../src/receiz/money-workspace').MoneyTurn,_action:import('../src/receiz/money-tools').MoneyAction)=>({id:'result-1',tool:'money_list_commitments',status:'accepted' as const,summary:'Tracked amounts',data:{outstandingUsdCents:'12500'}}));
 const ask=vi.fn(async q=>ask.mock.calls.length===1?reply(q.requestId,[{tool:'money_list_commitments',args:{direction:'receivable'}}]):reply(q.requestId));
 const result=await runMoneyConversation({accountUid:'owner',question:base,ask,execute,onCheckpoint:q=>{checkpoints.push(q);},onProgress:s=>progress.push(s)});
 expect(ask).toHaveBeenCalledTimes(2);expect(execute.mock.calls[0][0]).toMatchObject({humanText:base.message,humanTurnId:base.requestId});
 expect(JSON.parse(ask.mock.calls[1][0].moneyContext.results)[0].data.outstandingUsdCents).toBe('12500');expect(ask.mock.calls[1][0].message).toBe(base.message);expect(result.reply.message).toContain('$125');expect(checkpoints).toHaveLength(2);expect(progress.length).toBeGreaterThan(0);
});
it('retains the exact continuation for recovery and never executes a repeated tool twice',async()=>{
 let checkpoint:any;const execute=vi.fn(async(_turn:import('../src/receiz/money-workspace').MoneyTurn,_action:import('../src/receiz/money-tools').MoneyAction)=>({id:'r',tool:'money_list_commitments',status:'accepted' as const,summary:'Records',data:{count:1}}));
 const action={tool:'money_list_commitments',args:{}};let round=0;
 const ask=vi.fn(async q=>{round++;if(round===2)throw Error('transport ended');return reply(q.requestId,round===1?[action]:[]);});
 await expect(runMoneyConversation({accountUid:'owner',question:base,ask,execute,onCheckpoint:q=>{checkpoint=q;}})).rejects.toThrow('transport ended');
 const retriedId=checkpoint.requestId;await runMoneyConversation({accountUid:'owner',question:checkpoint,ask,execute});expect(ask.mock.calls.at(-1)![0].requestId).toBe(retriedId);expect(execute).toHaveBeenCalledTimes(1);
});
it('does not execute any effects after cancellation and bounds generated action loops',async()=>{
 const abort=new AbortController(),execute=vi.fn();abort.abort();await expect(runMoneyConversation({accountUid:'owner',question:base,signal:abort.signal,ask:vi.fn(),execute})).rejects.toThrow();expect(execute).not.toHaveBeenCalled();
});
it('returns actual tool failure to the Twin instead of trapping an already accepted reply as unconfirmed',async()=>{
 let count=0;const ask=vi.fn(async q=>reply(q.requestId,++count===1?[{tool:'money_search_history',args:{}}]:[])),execute=vi.fn(async()=>{throw Error('MONEY_SOURCE_UNAVAILABLE');});
 const result=await runMoneyConversation({accountUid:'owner',question:base,ask,execute});expect(result.receipts[0].status).toBe('refused');expect(result.receipts[0].summary).toContain('MONEY_SOURCE_UNAVAILABLE');expect(ask).toHaveBeenCalledTimes(2);
});
it('keeps full tool receipts for recovery while bounding only the next model working context',async()=>{
 let calls=0;const ask=vi.fn(async q=>reply(q.requestId,++calls<=2?[{tool:'money_search_history',args:{offset:calls}}]:[]));const execute=vi.fn(async(turn)=>({id:turn.requestId,tool:'money_search_history',status:'accepted' as const,summary:'Actual retained source',data:{sourceDigest:'a'.repeat(64),transactions:[{description:'x'.repeat(18000)}]}}));
 const result=await runMoneyConversation({accountUid:'owner',question:base,ask,execute});expect(result.receipts).toHaveLength(2);expect((result.receipts[0].data!.transactions as any[])[0].description.length).toBe(18000);const context=ask.mock.calls[2][0].moneyContext.results;expect(context.length).toBeLessThanOrEqual(32000);expect(context).toContain('retained');expect(JSON.parse(context).at(-1).data.transactions[0].description.length).toBe(18000);
});
