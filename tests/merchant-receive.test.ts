import {expect,it,vi} from 'vitest';
import {createMerchantReceive} from '../src/receiz/merchant-receive';
import {createFixedSale,fixedSalePaymentNote} from '../src/receiz/fixed-checkout';
import {syntheticWalletRecord} from './fixtures/wallet-send';
import {permittedNativePath} from '../src/receiz/native-transport';
const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',nonce='20000000-0000-4000-8000-000000000001',conversation='10000000-0000-4000-8000-000000000003';
async function fixture(){const sale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:nonce,username:'merchant',recipientUserId:recipient,currency:'usd',amountUsdCents:'1000'}),note=fixedSalePaymentNote(sale,nonce),raw=syntheticWalletRecord({conversationId:conversation,recipientUserId:recipient,clientNonce:nonce,amountUsd:'10.00',unit:'usd',note,noteVisibility:'public'},sender),event={id:'transfer:'+raw.transfer.id,kind:'chat_transfer',transferId:raw.transfer.id,publicNote:note,recipient:{userId:recipient}};return{sale,raw,event};}
it('reads only relevant exact originals and reuses their admitted source on repeated head observations',async()=>{
 const{sale,raw,event}=await fixture(),request=vi.fn(async(path:string)=>path.startsWith('/api/wallet/ledger')?{ok:true,accountUserId:recipient,events:[event,event,{...event,publicNote:'unrelated'}],nextCursor:null}:raw),api=createMerchantReceive({accountUid:recipient,request}),signal=new AbortController().signal;
 expect(await api.check([sale],signal)).toMatchObject([{saleId:sale.saleId,evidence:{source:raw}}]);expect(await api.check([sale],signal)).toHaveLength(1);expect(request.mock.calls.filter(([path])=>path.startsWith('/api/connect/transfers'))).toHaveLength(1);expect(request.mock.calls.every(([path])=>!path.includes('portfolio')&&!path.includes('wallet/me'))).toBe(true);
});
it('continues bounded older discovery and retries an unavailable original after its page has advanced',async()=>{
 const{sale,raw,event}=await fixture();let available=false;const request=vi.fn(async(path:string)=>path.startsWith('/api/connect/transfers')?available?raw:{ok:true,found:false}:{ok:true,accountUserId:recipient,events:path.includes('cursor=older')?[event]:[{id:'head'}],nextCursor:path.includes('cursor=older')?null:'older'}),api=createMerchantReceive({accountUid:recipient,request}),signal=new AbortController().signal;
 expect(await api.check([sale],signal)).toHaveLength(0);expect(api.unresolved()).toBe(true);available=true;expect(await api.check([sale],signal)).toHaveLength(1);expect(request.mock.calls.filter(([path])=>path.includes('cursor=older'))).toHaveLength(1);
});
it('never accepts discovery flags, foreign account pages, forged originals or a late aborted read',async()=>{
 const{sale,raw,event}=await fixture(),abort=new AbortController(),request=vi.fn(async(path:string)=>{if(path.startsWith('/api/wallet/ledger'))return{ok:true,accountUserId:recipient,events:[event],nextCursor:null};abort.abort();return raw;}),api=createMerchantReceive({accountUid:recipient,request});await expect(api.check([sale],abort.signal)).rejects.toThrow();
 await expect(createMerchantReceive({accountUid:recipient,request:async()=>({ok:true,accountUserId:sender,events:[event],nextCursor:null})}).check([sale],new AbortController().signal)).rejects.toThrow('HISTORY_UNAVAILABLE');
 const forged=createMerchantReceive({accountUid:recipient,request:async path=>path.startsWith('/api/wallet/ledger')?{ok:true,accountUserId:recipient,events:[event],nextCursor:null}:{ok:true,found:true,transfer:raw.transfer,sealedOriginalAvailable:true}});expect(await forged.check([sale],new AbortController().signal)).toHaveLength(0);expect(forged.unresolved()).toBe(true);
});
it('permits only the exact protected original selector pair through Bank transport',()=>{
 const path=`/api/connect/transfers?clientNonce=${nonce}&transferId=${conversation}`;expect(permittedNativePath(path,'GET')).toBe(true);for(const changed of [path+'&userId='+recipient,path+'&transferId='+conversation,path.replace('&transferId='+conversation,'&transferId=bad'),path.replace('clientNonce='+nonce+'&',''),path.replace('clientNonce='+nonce,'amountUsd=10.00')])expect(permittedNativePath(changed,'GET')).toBe(false);expect(permittedNativePath(path,'POST')).toBe(false);
});
it('rejects a valid original returned under different discovery coordinates',async()=>{
 const{sale,raw,event}=await fixture(),api=createMerchantReceive({accountUid:recipient,request:async path=>path.startsWith('/api/wallet/ledger')?{ok:true,accountUserId:recipient,events:[{...event,transferId:conversation}],nextCursor:null}:raw});expect(await api.check([sale],new AbortController().signal)).toHaveLength(0);expect(api.unresolved()).toBe(true);
});
it('fairly reaches a valid fifth payment while earlier candidate originals remain unavailable',async()=>{
 const{sale,raw,event}=await fixture(),events=Array.from({length:5},(_,i)=>({...event,id:'event'+i,transferId:i===4?raw.transfer.id:`40000000-0000-4000-8000-${String(i).padStart(12,'0')}`})),request=vi.fn(async(path:string)=>path.startsWith('/api/wallet/ledger')?{ok:true,accountUserId:recipient,events,nextCursor:null}:path.includes(raw.transfer.id)?raw:{ok:true,found:false}),api=createMerchantReceive({accountUid:recipient,request});let accepted=false;for(let i=0;i<3;i++)if((await api.check([sale],new AbortController().signal)).length)accepted=true;expect(accepted).toBe(true);
});
it('re-emits an admitted older original until durable retention acknowledges it',async()=>{
 const{sale,raw,event}=await fixture(),request=vi.fn(async(path:string)=>path.startsWith('/api/connect/transfers')?raw:{ok:true,accountUserId:recipient,events:path.includes('cursor=older')?[event]:[{id:'head'}],nextCursor:path.includes('cursor=older')?null:'older'}),api=createMerchantReceive({accountUid:recipient,request});expect(await api.check([sale],new AbortController().signal)).toHaveLength(1);expect(await api.check([sale],new AbortController().signal)).toHaveLength(1);expect(request.mock.calls.filter(([path])=>path.startsWith('/api/connect/transfers'))).toHaveLength(1);api.remember((await api.check([sale],new AbortController().signal))[0].evidence);expect(await api.check([sale],new AbortController().signal)).toHaveLength(0);
});
