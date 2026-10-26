import {expect,it,vi} from 'vitest';
import {createMoneyWorkspace,type MoneyState} from '../src/receiz/money-workspace';
import {createMerchantCounter} from '../src/receiz/merchant-counter';
import {fixedSalePaymentNote} from '../src/receiz/fixed-checkout';
import {syntheticWalletRecord} from './fixtures/wallet-send';
import {inspectMerchantPayment} from '../src/receiz/merchant-receive';
const uid='10000000-0000-4000-8000-000000000002',peer='10000000-0000-4000-8000-000000000001',digest='a'.repeat(64);
export function fixture(){
 let state:MoneyState|null=null,counterState:unknown=null,open=true;let tail=Promise.resolve();const sent=vi.fn(async()=>({id:'message-one'}) as import('../src/receiz/native-messaging').ChatMessage);
 const receive={remember(){},unresolved:()=>false,check:vi.fn(async()=>[] as {saleId:string;evidence:Awaited<ReturnType<typeof inspectMerchantPayment>>}[])};
 const counter=createMerchantCounter({identityDigest:digest,accountUid:uid,username:'owner',assertCurrent(){if(!open)throw Error('closed');},store:{read:async()=>counterState,write:async next=>{counterState=structuredClone(next);}},lock:async work=>work(),receive});
 const input={accountUid:uid,identityDigest:digest,assertOpen(){if(!open)throw Error('closed');},store:{read:async()=>structuredClone(state),write:async(next:MoneyState,expected:unknown)=>{expect(state).toEqual(expected);state=structuredClone(next);}},lock:async<T,>(work:()=>Promise<T>)=>{const prior=tail;let release!:()=>void;tail=new Promise(resolve=>{release=resolve;});await prior;try{return await work();}finally{release();}},counter:async()=>counter,messages:async()=>({search:async()=>[{kind:'user' as const,userId:peer,username:'acme',displayName:'Acme',avatarUrl:null}],createConversation:async()=> '10000000-0000-4000-8000-000000000003',send:sent}),history:async()=>({transactions:[]})};
 return{input,sent,counter,receive,get state(){return state;},set state(value:MoneyState|null){state=value;},close(){open=false;}};
}
const record={tool:'money_record_commitment',args:{title:'Acme project',direction:'receivable',counterparty:'Acme',amountUsdCents:'12500',dueAt:'2026-10-20T17:00:00.000Z'}};
const turn=(id:string,text:string)=>({requestId:id,humanText:text});
it('keeps exact planning and checkout continuity through the private native journal on another device',async()=>{
 const events:import('../src/receiz/money-continuity').MoneyJournalEvent[]=[];
 const journal={claim:async()=>true,read:async(cursor?:string)=>({events:cursor?[]:[...events],hasMore:false,nextCursor:null,resumeCursor:events.length?'journal-head':null}),append:async(event:import('../src/receiz/money-continuity').MoneyJournalEvent)=>{if(!events.some(e=>e.operationId===event.operationId))events.push(structuredClone(event));}};
 const first=fixture(),a=createMoneyWorkspace({...first.input,journal}),c=await a.execute(turn('owner-turn-0001','Acme owes me $125'),record),id=c.data!.id;
 await a.execute(turn('owner-turn-0002','Prepare their request'),{tool:'money_prepare_request',args:{id}});await a.synchronize();
 const second=fixture(),b=createMoneyWorkspace({...second.input,journal});const result=await b.execute(turn('owner-turn-0003','What is owed?'),{tool:'money_list_commitments',args:{}});
 expect(result.data!.totalOutstandingUsdCents).toBe('12500');expect((result.data!.commitments as any[])[0].requests).toHaveLength(1);expect(second.state!.commitments[0].source.humanText).toBe('Acme owes me $125');
});
it('resolves people through the existing account messaging directory without sending',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input),result=await a.execute(turn('owner-turn-0000','Find Acme'),{tool:'money_find_person',args:{query:'Acme'}});
 expect(result.status).toBe('accepted');expect(result.data!.people).toMatchObject([{username:'acme'}]);expect(f.sent).not.toHaveBeenCalled();
});
it('records, reopens and cancels a private reported commitment without inventing paid money',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input);const created=await a.execute(turn('owner-turn-0001','Acme owes me $125, due October 20'),record);expect(created.status).toBe('accepted');const id=String(created.data!.id);
 const reopened=createMoneyWorkspace(f.input),view=await reopened.execute(turn('owner-turn-0002','Who owes me?'),{tool:'money_list_commitments',args:{direction:'receivable'}});
 expect(view.data).toMatchObject({totalOutstandingUsdCents:'12500',count:1});expect(JSON.stringify(view)).toContain('owner-reported');
 await reopened.execute(turn('owner-turn-0003','Cancel Acme'),{tool:'money_cancel_commitment',args:{id}});
 expect((await reopened.execute(turn('owner-turn-0004','What is owed?'),{tool:'money_list_commitments',args:{}})).data).toMatchObject({count:0,totalOutstandingUsdCents:'0'});
 expect(f.state!.commitments[0].status).toBe('cancelled');expect(f.state!.commitments[0].source.humanText).toContain('Acme owes');
});
it('reduces an obligation only with its exact verified checkout original, supports installments, and stops paid reminders',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input),created=await a.execute(turn('owner-turn-0001','Track Acme'),record),id=created.data!.id;
 const request=await a.execute(turn('owner-turn-0002','Request $50'),{tool:'money_prepare_request',args:{id,amountUsdCents:'5000'}}),sale=await f.counter.sale(String(request.data!.saleId));
 const nonce='20000000-0000-4000-8000-000000000001';const original=syntheticWalletRecord({conversationId:'10000000-0000-4000-8000-000000000003',recipientUserId:uid,unit:'usd',amountUsd:'50.00',clientNonce:nonce,note:fixedSalePaymentNote(sale.request,nonce),noteVisibility:'public'},peer,'5000');
 const evidence=await inspectMerchantPayment(original,sale.request,uid);f.receive.check.mockResolvedValue([{saleId:sale.request.saleId,evidence}]);
 await a.execute(turn('owner-turn-0003','Check payments'),{tool:'money_check_payments',args:{}});
 const list=await a.execute(turn('owner-turn-0004','What is still owed?'),{tool:'money_list_commitments',args:{}});expect(list.data!.totalOutstandingUsdCents).toBe('7500');expect((list.data!.commitments as any[])[0].paymentState).toBe('partially-paid');
 const review=await a.execute(turn('owner-turn-0005','Remind Acme about that payment'),{tool:'money_review_message',args:{id,username:'acme'}});expect(review.status).toBe('refused');expect(f.sent).not.toHaveBeenCalled();
 const next=await a.execute(turn('owner-turn-0006','Request what remains'),{tool:'money_prepare_request',args:{id}});expect(next.data!.amountUsdCents).toBe('7500');
});
it('replays accepted actions once and refuses different arguments under the same operation',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input),t=turn('owner-turn-0001','Track Acme');await a.execute(t,record);await createMoneyWorkspace(f.input).execute(t,record);expect(f.state!.commitments).toHaveLength(1);
 await expect(a.execute(t,{...record,args:{...record.args,amountUsdCents:'20000'}})).rejects.toThrow('ACTION_CHANGED');
});
it('creates an immutable partial checkout and shows its exact reviewed message before conversational sending',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input),created=await a.execute(turn('owner-turn-0001','Track Acme'),record),id=String(created.data!.id);
 const req=await a.execute(turn('owner-turn-0002','Request $50 from Acme'),{tool:'money_prepare_request',args:{id,amountUsdCents:'5000'}});
 expect(req.data).toMatchObject({amountUsdCents:'5000'});expect(String(req.data!.url)).toContain('bankeiz.com');expect(f.sent).not.toHaveBeenCalled();
 const review=await a.execute(turn('owner-turn-0003','Send the request to @acme'),{tool:'money_review_message',args:{id,username:'acme'}});
 expect(review.data).toMatchObject({username:'acme',amountUsdCents:'5000'});expect(String(review.data!.body)).toContain('$50.00');
 const reviewId=String(review.data!.reviewId);a.markReviewDisplayed(reviewId,'owner-turn-0003');
 expect((await a.execute({...turn('owner-action-0003','Send the request to @acme'),humanTurnId:'owner-turn-0003'},{tool:'money_send_reviewed',args:{reviewId}})).status).toBe('needs-confirmation');
 expect((await a.execute(turn('owner-turn-0004','yes but change it'),{tool:'money_send_reviewed',args:{reviewId}})).status).toBe('needs-confirmation');
 expect(f.sent).not.toHaveBeenCalled();
 const sent=await a.execute(turn('owner-turn-0005','Yes, send it'),{tool:'money_send_reviewed',args:{reviewId}});expect(sent.status).toBe('accepted');expect(f.sent).toHaveBeenCalledTimes(1);
 await createMoneyWorkspace(f.input).execute(turn('owner-turn-0005','Yes, send it'),{tool:'money_send_reviewed',args:{reviewId}});expect(f.sent).toHaveBeenCalledTimes(1);
});
it('does not issue overlapping unpaid installments and never confirms from an automatic continuation',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input),c=await a.execute(turn('owner-turn-0001','Track Acme'),record),id=c.data!.id;
 await a.execute(turn('owner-turn-0002','Request $50'),{tool:'money_prepare_request',args:{id,amountUsdCents:'5000'}});
 expect((await a.execute(turn('owner-turn-0003','Request the full amount'),{tool:'money_prepare_request',args:{id,amountUsdCents:'12500'}})).status).toBe('refused');
 const review=await a.execute({...turn('owner-action-0004','Send it'),humanTurnId:'owner-turn-0004'},{tool:'money_review_message',args:{id,username:'acme'}});
 const sent=await a.execute({...turn('owner-action-0005','Send it'),humanTurnId:'owner-turn-0004'},{tool:'money_send_reviewed',args:{reviewId:review.data!.reviewId}});
 expect(sent.status).toBe('needs-confirmation');expect(f.sent).not.toHaveBeenCalled();
});
it('never automatically resends an unknown message after reopen',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input);const c=await a.execute(turn('owner-turn-0001','Track Acme'),record),id=String(c.data!.id);await a.execute(turn('owner-turn-0002','Prepare request'),{tool:'money_prepare_request',args:{id}});const r=await a.execute(turn('owner-turn-0003','Review to Acme'),{tool:'money_review_message',args:{id,username:'acme'}});a.markReviewDisplayed(String(r.data!.reviewId),'owner-turn-0003');f.sent.mockRejectedValueOnce(Error('Connection ended'));
 const action={tool:'money_send_reviewed',args:{reviewId:String(r.data!.reviewId)}};expect((await a.execute(turn('owner-turn-0004','Send it'),action)).status).toBe('unknown');await createMoneyWorkspace(f.input).execute(turn('owner-turn-0005','Send it'),action);expect(f.sent).toHaveBeenCalledTimes(1);
});
it('keeps reported completion distinct from verified payment and refuses cross-owner state',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input),c=await a.execute(turn('owner-turn-0001','Track Acme'),record);await a.execute(turn('owner-turn-0002','I paid this externally'),{tool:'money_report_completed',args:{id:c.data!.id}});
 expect(f.state!.commitments[0].status).toBe('reported-completed');expect(f.state!.commitments[0]).not.toHaveProperty('verifiedPaid');
 f.state={...f.state!,accountUid:peer};await expect(createMoneyWorkspace(f.input).execute(turn('owner-turn-0003','What is owed?'),{tool:'money_list_commitments',args:{}})).rejects.toThrow('OWNER_MISMATCH');
});
it('requires a rendered exact review again after reload and uses a durable cross-device delivery claim',async()=>{
 const events:import('../src/receiz/money-continuity').MoneyJournalEvent[]=[],claims=new Set<string>();const journal={claim:async(r:{id:string})=>{if(claims.has(r.id))return false;claims.add(r.id);return true;},read:async()=>({events:[...events],hasMore:false,nextCursor:null,resumeCursor:null}),append:async(e:import('../src/receiz/money-continuity').MoneyJournalEvent)=>{if(!events.some(x=>x.operationId===e.operationId))events.push(structuredClone(e));}};
 const fa=fixture(),a=createMoneyWorkspace({...fa.input,journal}),c=await a.execute(turn('owner-turn-0001','Track Acme'),record),id=c.data!.id;await a.execute(turn('owner-turn-0002','Prepare request'),{tool:'money_prepare_request',args:{id}});const r=await a.execute(turn('owner-turn-0003','Review request'),{tool:'money_review_message',args:{id,username:'acme'}});await a.synchronize();const reviewId=String(r.data!.reviewId);
 const fb=fixture(),b=createMoneyWorkspace({...fb.input,journal});await b.synchronize();expect((await b.execute(turn('owner-turn-0004','Send it'),{tool:'money_send_reviewed',args:{reviewId}})).status).toBe('needs-confirmation');expect(fb.sent).not.toHaveBeenCalled();b.markReviewDisplayed(reviewId,'owner-turn-0004');a.markReviewDisplayed(reviewId,'owner-turn-0003');
 await Promise.all([a.execute(turn('owner-turn-0005','Send it'),{tool:'money_send_reviewed',args:{reviewId}}),b.execute(turn('owner-turn-0006','Send it'),{tool:'money_send_reviewed',args:{reviewId}})]);expect(fa.sent.mock.calls.length+fb.sent.mock.calls.length).toBe(1);
});
it('canonicalizes identical primitive action arguments before replay admission',async()=>{
 const f=fixture(),a=createMoneyWorkspace(f.input);await a.execute(turn('owner-turn-0001','Track Acme'),record);await a.execute(turn('owner-turn-0001','Track Acme'),{tool:record.tool,args:Object.fromEntries(Object.entries(record.args).reverse())});expect(f.state!.commitments).toHaveLength(1);
});
