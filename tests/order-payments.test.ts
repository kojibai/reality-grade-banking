import {afterEach,expect,it,vi} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createReceizClient} from '@receiz/sdk';
import {createBankeizPayments} from '../integrations/payments/src/index';
import {createSqliteOrderStore} from '../integrations/payments/src/sqlite';
import {fixedSalePaymentNote} from '../src/receiz/fixed-checkout';
import {parseCheckoutRequest} from '../src/receiz/checkout-request';
import {syntheticWalletRecord} from './fixtures/wallet-send';
import {hostedFixture} from './fixtures/hosted-checkout';

const merchant={username:'merchant',userId:'10000000-0000-4000-8000-000000000002'},sender='10000000-0000-4000-8000-000000000001';
const cleanup:(()=>Promise<void>|void)[]=[];
afterEach(async()=>{vi.useRealTimers();for(const work of cleanup.splice(0).reverse())await work();});
async function fixture(){
 const dir=await mkdtemp(join(tmpdir(),'bankeiz-orders-'));cleanup.push(()=>rm(dir,{recursive:true,force:true}));const path=join(dir,'orders.sqlite');
 const store=createSqliteOrderStore(path);cleanup.push(()=>store.close());let online=true;const originals=new Map<string,unknown>(),calls:string[]=[];
 const receiz=createReceizClient({baseUrl:'https://receiz.com',fetchImpl:async(input,init)=>{const url=new URL(String(input));calls.push(url.pathname+url.search);expect(init?.method??'GET').toBe('GET');if(!online)return new Response('{}',{status:503});
  const digest=url.searchParams.get('saleDigest');if(digest){const candidates=[...originals.values()].filter((r:any)=>r.source?.transfer.metadata.note.startsWith(`bank.sale.v1:${digest}:`)).map((r:any)=>({transferId:r.transfer.id,clientNonce:r.transfer.clientNonce}));return Response.json({ok:true,accountUserId:merchant.userId,saleDigest:digest,candidates,nextCursor:null});}
  return Response.json(originals.get(url.searchParams.get('transferId')!)??{ok:true,found:false});}});
 const api=createBankeizPayments({merchant,receiz,store});
 async function pay(orderId:string,n=1){const status=await api.get(orderId),sale=parseCheckoutRequest(status.checkoutUrl)!.fixedSale!;
  const{createFixedSale}=await import('../src/receiz/fixed-checkout');const request=await createFixedSale(sale),nonce=`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const raw=syntheticWalletRecord({recipientUserId:merchant.userId,clientNonce:nonce,conversationId:'30000000-0000-4000-8000-000000000001',amountUsd:'10.00',unit:'usd',note:fixedSalePaymentNote(request,nonce),noteVisibility:'public'},sender,status.amountUsdCents);
  const id=`40000000-0000-4000-8000-${String(n).padStart(12,'0')}`;raw.transfer.id=id;raw.transfer.messageId=id;raw.source.transfer.id=id;raw.source.transfer.message_id=id;raw.source.message.id=id;raw.source.message.sealed_original.messageId=id;
  originals.set(id,raw);return raw;
 }
 return{api,receiz,store,path,originals,calls,pay,offline:()=>{online=false;}};
}

it('persists one immutable checkout across concurrent callers, independent instances and restart without creating payments',async()=>{
 const f=await fixture(),second=createSqliteOrderStore(f.path);cleanup.push(()=>second.close());const other=createBankeizPayments({merchant,receiz:f.receiz,store:second});
 const results=await Promise.all([f.api.checkout({orderId:'store/order 1',amountUsdCents:'1000'}),other.checkout({orderId:'store/order 1',amountUsdCents:'1000'})]);
 expect(results[0].checkoutUrl).toBe(results[1].checkoutUrl);expect(results[0].status).toBe('pending');expect(f.calls).toEqual([]);
 expect(parseCheckoutRequest(results[0].checkoutUrl)?.fixedSale).toMatchObject({recipientUserId:merchant.userId,amountUsdCents:'1000'});
 expect(results[0].buttonHtml).toContain('&amp;recipient=');await expect(other.checkout({orderId:'store/order 1',amountUsdCents:'1001'})).rejects.toThrow('ORDER_CHANGED');
 const reopened=createBankeizPayments({merchant,receiz:f.receiz,store:second});expect((await reopened.get('store/order 1')).checkoutUrl).toBe(results[0].checkoutUrl);
 for(const amount of ['0','-1','1.00','01','1e3'])await expect(f.api.checkout({orderId:'invalid',amountUsdCents:amount})).rejects.toThrow();
});

it('accepts only the matching complete merchant original and durably fulfills once despite racing checks and a second payment',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});expect((await f.api.check('one')).status).toBe('pending');
 const original=await f.pay('one');const second=createSqliteOrderStore(f.path);cleanup.push(()=>second.close());const other=createBankeizPayments({merchant,receiz:f.receiz,store:second});
 await Promise.all([f.api.check('one'),other.check('one')]);expect(await f.api.get('one')).toMatchObject({status:'paid',paymentCount:1,additionalPayments:0,fulfillment:'pending'});
 const delivered=new Set<string>();const deliver=async(job:{idempotencyKey:string})=>{delivered.add(job.idempotencyKey);};
 await Promise.all([f.api.fulfill(deliver),other.fulfill(deliver)]);expect(delivered.size).toBe(1);expect((await f.api.get('one')).fulfillment).toBe('complete');
 await f.pay('one',2);await other.reconcile({limit:1});expect(await other.get('one')).toMatchObject({paymentCount:2,additionalPayments:1,fulfillment:'complete'});await other.fulfill(deliver);expect(delivered.size).toBe(1);
 expect(JSON.stringify(await other.get('one'))).not.toContain('sealed_original');f.offline();expect(await other.check('one')).toMatchObject({status:'paid',paymentCount:2,receiving:'unavailable'});
 expect(original.source.message.sealed_original.primitive).toBe('receiz.chat.message.original.v1');
});

it('refuses payer flags, missing originals and wrong amounts while preserving recovery',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});const raw=await f.pay('one');
 f.originals.set(raw.transfer.id,{...raw,source:null,paid:true});expect((await f.api.check('one')).status).toBe('pending');
 f.originals.set(raw.transfer.id,{...raw,transfer:{...raw.transfer,amountUsdCents:'999'}});expect((await f.api.check('one')).status).toBe('pending');
 f.originals.set(raw.transfer.id,raw);expect((await f.api.check('one')).status).toBe('paid');
});

it('rotates paid and unpaid orders across persisted reconciliation batches',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'a',amountUsdCents:'1000'});await f.api.checkout({orderId:'b',amountUsdCents:'1000'});await f.pay('b');
 expect((await f.api.reconcile({limit:1})).orders[0].orderId).toBe('a');
 const reopened=createBankeizPayments({merchant,receiz:f.receiz,store:f.store});expect((await reopened.reconcile({limit:1})).orders[0]).toMatchObject({orderId:'b',status:'paid'});
 await f.pay('a',2);await reopened.reconcile({limit:1});await reopened.reconcile({limit:1});expect((await f.api.get('a')).status).toBe('paid');
});

it('retries interrupted fulfillment with a stable key and refuses stale worker acknowledgments',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});await f.pay('one');await f.api.check('one');const effects=new Set<string>();
 await f.api.fulfill(async job=>{effects.add(job.idempotencyKey);throw Error('lost response after delivery');});expect((await f.api.get('one')).fulfillment).toBe('pending');
 await f.api.fulfill(async job=>{effects.add(job.idempotencyKey);});expect(effects.size).toBe(1);expect((await f.api.get('one')).fulfillment).toBe('complete');
});

it('rolls back failed storage transactions without losing the prior saved order',async()=>{
 const f=await fixture();const before=await f.api.checkout({orderId:'one',amountUsdCents:'1000'});
 await expect(f.store.transaction(tx=>{tx.put('rollback','do not retain');throw Error('disk transaction failed');})).rejects.toThrow('disk transaction failed');
 expect(await f.store.transaction(tx=>tx.get('rollback'))).toBeNull();expect((await f.api.get('one')).checkoutUrl).toBe(before.checkoutUrl);
});

it('a storage failure after original inspection leaves the same payment available for recovery',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});await f.pay('one');let writes=0;
 const failing={transaction:async<T>(work:Parameters<typeof f.store.transaction<T>>[0])=>f.store.transaction(tx=>work({...tx,put:(key,value)=>{if(++writes===2)throw Error('disk unavailable');tx.put(key,value);}}))};
 const broken=createBankeizPayments({merchant,receiz:f.receiz,store:failing});await expect(broken.check('one')).rejects.toThrow('disk unavailable');expect((await f.api.get('one')).status).toBe('pending');
 expect((await f.api.check('one')).status).toBe('paid');expect((await f.api.fulfill(async()=>{})).completed).toBe(1);
});

it('an expired worker cannot acknowledge a replacement lease or create a second external effect',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});await f.pay('one');await f.api.check('one');vi.useFakeTimers();
 let release!:()=>void,started!:()=>void;const waiting=new Promise<void>(resolve=>started=resolve),gate=new Promise<void>(resolve=>release=resolve),effects=new Set<string>();
 const first=f.api.fulfill(async job=>{effects.add(job.idempotencyKey);started();await gate;},{leaseMs:1000});await waiting;vi.setSystemTime(Date.now()+1001);
 const second=await f.api.fulfill(async job=>{effects.add(job.idempotencyKey);},{leaseMs:1000});expect(second.completed).toBe(1);release();expect((await first).completed).toBe(0);
 expect(effects.size).toBe(1);expect((await f.api.get('one')).fulfillment).toBe('complete');
});

it('aborts a stalled SDK observation without committing or accepting its late response',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});let release!:(value:unknown)=>void,started!:()=>void;const ready=new Promise<void>(resolve=>started=resolve);
 const request=async<T>()=>{started();return new Promise<T>(resolve=>release=value=>resolve(value as T));};
 const api=createBankeizPayments({merchant,store:f.store,receiz:{request}}),controller=new AbortController(),checking=api.check('one',{signal:controller.signal});await ready;controller.abort(Error('cancelled'));
 await expect(checking).rejects.toThrow('cancelled');release({ok:true,paid:true});expect((await f.api.get('one')).status).toBe('pending');
});

it.each(['balance','card','reserve','settlement','composite'] as const)('connects an actual hosted %s checkout approval to merchant receiving and one fulfillment',async method=>{
 const f=await fixture(),order=await f.api.checkout({orderId:'whole-flow',amountUsdCents:'1000'}),sale=parseCheckoutRequest(order.checkoutUrl)!.fixedSale!,payer=hostedFixture(method==='balance'?1000:0),controller=payer.newController();await controller.ready;
 const isNote=!['balance','card'].includes(method);
 if(isNote){payer.deps.notes.inspect.mockResolvedValueOnce({...payer.deps.note,rail:method as 'reserve'|'settlement'|'composite',inspection:{...payer.deps.note.inspection,rail:method as 'reserve'|'settlement'|'composite'}});await controller.inspectNote({} as File);}
 const approval=await controller.prepare({recipient:'merchant',amountUsdCents:'1000',method:isNote?'note':method as 'balance'|'card',fixedSale:sale});await controller.approve(approval.digest);
 if(method==='card'){expect((await f.api.check('whole-flow')).status).toBe('pending');payer.creditCard();}
 if(isNote){expect((await f.api.check('whole-flow')).status).toBe('pending');payer.confirmNote();}
 await controller.check();if(controller.snapshot().phase==='reviewed')await controller.approve(controller.snapshot().approval!.digest);
 expect(controller.snapshot().phase).toBe('paid');const original=await payer.request('/api/connect/transfers?clientNonce='+approval.clientNonce);f.originals.set(original.transfer.id,original);
 expect((await f.api.check('whole-flow')).status).toBe('paid');const effects=new Set<string>();await f.api.fulfill(async job=>{effects.add(job.idempotencyKey);});await f.api.fulfill(async job=>{effects.add(job.idempotencyKey);});
 expect(effects.size).toBe(1);expect((await f.api.get('whole-flow')).fulfillment).toBe('complete');controller.dispose();
});

it('retains successful siblings and rotates past stalled originals through cold checks',async()=>{
 const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});const original=await f.pay('one'),digest=original.source.transfer.metadata.note!.split(':')[1];vi.useFakeTimers();
 let began!:()=>void,readCount=0;const ready=new Promise<void>(resolve=>began=resolve),candidates=Array.from({length:5},(_,n)=>({transferId:n===4?original.transfer.id:`50000000-0000-4000-8000-${String(n).padStart(12,'0')}`,clientNonce:original.transfer.clientNonce}));
 const request=async<T>(path:string):Promise<T>=>{if(path.includes('saleDigest='))return{ok:true,accountUserId:merchant.userId,saleDigest:digest,candidates,nextCursor:null} as T;if(path.includes(original.transfer.id))return original as T;if(++readCount===4)began();return new Promise<T>(()=>{});};
 let api=createBankeizPayments({merchant,store:f.store,receiz:{request}}),checking=api.check('one'),first=expect(checking).resolves.toMatchObject({status:'pending',receiving:'incomplete'});await ready;await vi.advanceTimersByTimeAsync(15001);await first;
 api=createBankeizPayments({merchant,store:f.store,receiz:{request}});checking=api.check('one');const second=expect(checking).resolves.toMatchObject({status:'paid'});await vi.advanceTimersByTimeAsync(15001);await second;
});

it('an interrupted batch advances only examined orders and fixes a lap boundary while new orders arrive',async()=>{
 const f=await fixture();for(const id of ['a','b','c'])await f.api.checkout({orderId:id,amountUsdCents:'1000'});let observed!:()=>void;const ready=new Promise<void>(resolve=>observed=resolve),controller=new AbortController();
 const request=async<T>():Promise<T>=>{observed();return new Promise<T>(()=>{});};const stalled=createBankeizPayments({merchant,store:f.store,receiz:{request}}),running=stalled.reconcile({limit:3,signal:controller.signal}),interrupted=expect(running).rejects.toThrow('stop');await ready;controller.abort(Error('stop'));await interrupted;
 expect((await f.api.reconcile({limit:1})).orders[0].orderId).toBe('b');await f.api.checkout({orderId:'z1',amountUsdCents:'1000'});expect((await f.api.reconcile({limit:1})).orders[0].orderId).toBe('c');await f.api.checkout({orderId:'z2',amountUsdCents:'1000'});expect((await f.api.reconcile({limit:1})).orders[0].orderId).toBe('a');
});

it('bounds a stalled delivery by its lease and continues to another paid order',async()=>{
 const f=await fixture();for(const[id,n]of [['a',1],['b',2]] as const){await f.api.checkout({orderId:id,amountUsdCents:'1000'});await f.pay(id,n);await f.api.check(id);}vi.useFakeTimers();let began!:()=>void;const ready=new Promise<void>(resolve=>began=resolve),delivered:string[]=[];
 const running=f.api.fulfill(async job=>{if(job.orderId==='a'){began();return new Promise<void>(()=>{});}delivered.push(job.orderId);},{limit:2,leaseMs:1000});await ready;await vi.advanceTimersByTimeAsync(1001);expect(await running).toMatchObject({completed:1,failed:1});expect(delivered).toEqual(['b']);
});

it('shares a merchant-order fulfillment claim across payment providers and routes a late Bankeiz payment to review',async()=>{
 const {deliverExampleOrder}=await import('../integrations/payments/example/fulfillment.mjs');const f=await fixture();await f.api.checkout({orderId:'one',amountUsdCents:'1000'});
 await deliverExampleOrder(f.store,{orderId:'one',amountUsdCents:'1000',merchantUserId:merchant.userId,idempotencyKey:'other-provider-attempt',payment:{transferId:'another-provider-payment',clientNonce:'another-attempt'}},'other-provider');
 await f.pay('one');await f.api.check('one');await f.api.fulfill(async job=>{await deliverExampleOrder(f.store,job);});
 expect(await f.store.transaction(tx=>tx.scan('demo-effect:',{limit:100}).length)).toBe(1);expect(await f.store.transaction(tx=>tx.scan('demo-review:',{limit:100}).length)).toBe(1);
});
