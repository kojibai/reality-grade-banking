import {afterEach,expect,it} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createReceizClient,createReceizWebhookSignature} from '@receiz/sdk';
import {createBankeizPayments} from '../integrations/payments/src/index';
import {createSqliteOrderStore} from '../integrations/payments/src/sqlite';
const merchant={username:'merchant',userId:'10000000-0000-4000-8000-000000000002'},secret='synthetic-endpoint-secret';
const cleanup:(()=>Promise<void>|void)[]=[];afterEach(async()=>{for(const fn of cleanup.splice(0).reverse())await fn();});
async function fixture(){const dir=await mkdtemp(join(tmpdir(),'bankeiz-webhook-'));cleanup.push(()=>rm(dir,{recursive:true,force:true}));const store=createSqliteOrderStore(join(dir,'orders.sqlite'));cleanup.push(()=>store.close());let online=false,reads=0;
 const receiz=createReceizClient({fetchImpl:async input=>{reads++;if(!online)return new Response('{}',{status:503});const digest=new URL(String(input)).searchParams.get('saleDigest');return Response.json({ok:true,accountUserId:merchant.userId,saleDigest:digest,candidates:[],nextCursor:null});}});
 const api=createBankeizPayments({merchant,receiz,store});await api.checkout({orderId:'one',amountUsdCents:'1000'});return{api,reads:()=>reads,online:()=>{online=true;}};
}
async function request(options:{body?:string;timestamp?:string;tamper?:boolean}={}){const body=options.body??JSON.stringify({schema:'receiz.webhook_event.v1',id:'evt_one',type:'payment.settled',createdAt:new Date().toISOString(),data:{test:true,paid:true,orderId:'one'}}),timestamp=options.timestamp??String(Math.floor(Date.now()/1000)),signature=await createReceizWebhookSignature({secret,timestamp,body});return new Request('https://store.example/webhook',{method:'POST',headers:{'x-receiz-signature':options.tamper?signature+'bad':signature,'x-receiz-timestamp':timestamp},body});}

it('verifies raw delivery, retains failed work and retries the same event without accepting its paid flag',async()=>{
 const f=await fixture(),raw=await request(),body=await raw.text(),options={secret,resolveOrders:()=>['one']};
 expect(await f.api.handleWebhook(await request({body}),options)).toMatchObject({eventId:'evt_one',complete:false,orders:[{status:'pending',receiving:'unavailable'}]});
 f.online();expect(await f.api.handleWebhook(await request({body}),options)).toMatchObject({complete:true,orders:[{status:'pending'}]});
 const reads=f.reads();expect(await f.api.handleWebhook(await request({body}),options)).toMatchObject({complete:true,orders:[]});expect(f.reads()).toBe(reads);
 expect((await f.api.get('one')).status).toBe('pending');
});

it('rejects tampering, expired signatures, oversized requests and changed payloads under an existing event ID before payment reads',async()=>{
 const f=await fixture(),options={secret,resolveOrders:()=>['one']};
 for(const bad of [await request({tamper:true}),await request({timestamp:'1'}),await request({body:'x'.repeat(262145)})])await expect(f.api.handleWebhook(bad,options)).rejects.toThrow();
 expect(f.reads()).toBe(0);
 const valid=await request();await f.api.handleWebhook(valid,options);
 const altered=JSON.stringify({schema:'receiz.webhook_event.v1',id:'evt_one',type:'payment.settled',createdAt:new Date().toISOString(),data:{orderId:'other'}});
 await expect(f.api.handleWebhook(await request({body:altered}),options)).rejects.toThrow('WEBHOOK_EVENT_CONFLICT');
});

it('keeps an unknown mapped order pending while independently processing later valid work',async()=>{
 const f=await fixture();f.online();expect(await f.api.handleWebhook(await request(),{secret,resolveOrders:()=>['missing','one']})).toMatchObject({complete:false,orders:[{orderId:'one',receiving:'complete'}]});
});
