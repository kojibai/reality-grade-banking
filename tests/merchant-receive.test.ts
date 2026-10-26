import {expect,it,vi} from 'vitest';
import {createMerchantReceive} from '../src/receiz/merchant-receive';
import {createFixedSale,fixedSalePaymentNote,type FixedSale} from '../src/receiz/fixed-checkout';
import {syntheticWalletRecord} from './fixtures/wallet-send';
import {permittedNativePath} from '../src/receiz/native-transport';
const sender='10000000-0000-4000-8000-000000000001',recipient='10000000-0000-4000-8000-000000000002',nonce='20000000-0000-4000-8000-000000000001',conversation='10000000-0000-4000-8000-000000000003';
async function fixture(){const sale=await createFixedSale({schema:'bank.fixed-checkout.v1',saleId:nonce,username:'merchant',recipientUserId:recipient,currency:'usd',amountUsdCents:'1000'}),note=fixedSalePaymentNote(sale,nonce),raw=syntheticWalletRecord({conversationId:conversation,recipientUserId:recipient,clientNonce:nonce,amountUsd:'10.00',unit:'usd',note,noteVisibility:'public'},sender),candidate={transferId:raw.transfer.id,clientNonce:nonce};return{sale,raw,candidate};}
const page=(sale:FixedSale,candidates:unknown[]=[],nextCursor:string|null=null)=>({ok:true,accountUserId:recipient,saleDigest:sale.digest,candidates,nextCursor});
const isDiscovery=(path:string)=>new URL(path,'https://receiz.com').searchParams.has('saleDigest');
const signal=()=>new AbortController().signal;
it('discovers only the exact recipient sale and reuses its admitted complete original',async()=>{
 const{sale,raw,candidate}=await fixture(),request=vi.fn(async(path:string)=>isDiscovery(path)?page(sale,[candidate,candidate]):raw),api=createMerchantReceive({accountUid:recipient,request});
 expect(await api.check([sale],signal())).toMatchObject([{saleId:sale.saleId,evidence:{source:raw}}]);expect(await api.check([sale],signal())).toHaveLength(1);
 expect(request.mock.calls.map(([path])=>path)).toEqual([`/api/connect/transfers?saleDigest=${sale.digest}`,`/api/connect/transfers?clientNonce=${nonce}&transferId=${raw.transfer.id}`]);
 api.remember((await api.check([sale],signal()))[0].evidence);expect(await api.check([sale],signal())).toHaveLength(0);expect(api.unresolved()).toBe(false);
 expect(request.mock.calls.filter(([path])=>!isDiscovery(path))).toHaveLength(1);expect(request.mock.calls.every(([path])=>!path.includes('/api/wallet/')&&!path.includes('portfolio'))).toBe(true);
});
it('retains incomplete discovery across bounded checks and retries an older original after its page advances',async()=>{
 const{sale,raw,candidate}=await fixture();let available=false;
 const request=vi.fn(async(path:string)=>{if(!isDiscovery(path))return available?raw:{ok:true,found:false};const cursor=new URL(path,'https://receiz.com').searchParams.get('cursor');return cursor==='older2'?page(sale,[candidate]):page(sale,[],cursor==='older1'?'older2':'older1');}),api=createMerchantReceive({accountUid:recipient,request});
 expect(await api.check([sale],signal())).toHaveLength(0);expect(api.unresolved()).toBe(true);expect(request).toHaveBeenCalledTimes(2);
 expect(await api.check([sale],signal())).toHaveLength(0);expect(api.unresolved()).toBe(true);available=true;expect(await api.check([sale],signal())).toHaveLength(1);
 expect(request.mock.calls.filter(([path])=>path.includes('cursor=older1'))).toHaveLength(1);expect(request.mock.calls.filter(([path])=>path.includes('cursor=older2'))).toHaveLength(1);
});
it('never accepts discovery paid flags, foreign account/digest pages, forged originals or a late aborted read',async()=>{
 const{sale,raw,candidate}=await fixture(),abort=new AbortController(),request=vi.fn(async(path:string)=>{if(isDiscovery(path))return page(sale,[candidate]);abort.abort();return raw;});
 await expect(createMerchantReceive({accountUid:recipient,request}).check([sale],abort.signal)).rejects.toThrow();
 for(const changed of [{accountUserId:sender},{saleDigest:'a'.repeat(64)},{candidates:[{transferId:'bad',clientNonce:nonce}]},{nextCursor:'bad cursor'},{candidates:Array(101).fill(candidate)}])await expect(createMerchantReceive({accountUid:recipient,request:async()=>({...page(sale,[candidate]),...changed})}).check([sale],signal())).rejects.toThrow('HISTORY_UNAVAILABLE');
 const forged=createMerchantReceive({accountUid:recipient,request:async path=>isDiscovery(path)?{...page(sale,[candidate]),paid:true}:{ok:true,found:true,transfer:raw.transfer,sealedOriginalAvailable:true}});expect(await forged.check([sale],signal())).toHaveLength(0);expect(forged.unresolved()).toBe(true);
});
it('permits only exact protected original coordinates and bounded digest/cursor discovery through Bank transport',()=>{
 const path=`/api/connect/transfers?clientNonce=${nonce}&transferId=${conversation}`;expect(permittedNativePath(path,'GET')).toBe(true);
 for(const changed of [path+'&userId='+recipient,path+'&transferId='+conversation,path.replace('&transferId='+conversation,'&transferId=bad'),path.replace('clientNonce='+nonce+'&',''),path.replace('clientNonce='+nonce,'amountUsd=10.00')])expect(permittedNativePath(changed,'GET')).toBe(false);expect(permittedNativePath(path,'POST')).toBe(false);
 const discovery='/api/connect/transfers?saleDigest='+'a'.repeat(64);expect(permittedNativePath(discovery,'GET')).toBe(true);expect(permittedNativePath(discovery+'&cursor=older_2','GET')).toBe(true);
 for(const changed of [discovery+'&userId='+recipient,discovery+'&saleDigest='+'a'.repeat(64),discovery+'&cursor=',discovery+'&cursor=bad%20cursor',discovery+'&cursor='+'a'.repeat(2049),discovery+'&cursor=a&cursor=b',discovery+'&clientNonce='+nonce,discovery.replace('a'.repeat(64),'bad')])expect(permittedNativePath(changed,'GET')).toBe(false);
 expect(permittedNativePath(discovery,'POST')).toBe(false);
});
it('rejects a valid original returned under different candidate coordinates',async()=>{
 const{sale,raw,candidate}=await fixture(),api=createMerchantReceive({accountUid:recipient,request:async path=>isDiscovery(path)?page(sale,[{...candidate,transferId:conversation}]):raw});expect(await api.check([sale],signal())).toHaveLength(0);expect(api.unresolved()).toBe(true);
});
it('fairly reaches a valid fifth original while earlier candidates remain unavailable',async()=>{
 const{sale,raw,candidate}=await fixture(),candidates=Array.from({length:5},(_,i)=>({...candidate,transferId:i===4?raw.transfer.id:`40000000-0000-4000-8000-${String(i).padStart(12,'0')}`})),request=vi.fn(async(path:string)=>isDiscovery(path)?page(sale,candidates):path.includes(raw.transfer.id)?raw:{ok:true,found:false}),api=createMerchantReceive({accountUid:recipient,request});
 expect(await api.check([sale],signal())).toHaveLength(0);expect(request.mock.calls.filter(([path])=>!isDiscovery(path))).toHaveLength(4);expect(await api.check([sale],signal())).toHaveLength(1);
});
it('re-emits an admitted older original until durable retention acknowledges it without double credit',async()=>{
 const{sale,raw,candidate}=await fixture(),request=vi.fn(async(path:string)=>isDiscovery(path)?new URL(path,'https://receiz.com').searchParams.has('cursor')?page(sale,[candidate]):page(sale,[],'older'):raw),api=createMerchantReceive({accountUid:recipient,request});
 const found=await api.check([sale],signal());expect(found).toHaveLength(1);expect(await api.check([sale],signal())).toHaveLength(1);expect(request.mock.calls.filter(([path])=>!isDiscovery(path))).toHaveLength(1);
 api.remember(found[0].evidence);expect(await api.check([sale],signal())).toHaveLength(0);expect(request.mock.calls.filter(([path])=>!isDiscovery(path))).toHaveLength(1);
});
it('rotates retained sales and keeps observation unresolved until every selected history is complete',async()=>{
 const{sale}=await fixture(),sales=[sale,...await Promise.all([2,3].map(n=>createFixedSale({schema:sale.schema,saleId:`20000000-0000-4000-8000-${String(n).padStart(12,'0')}`,username:sale.username,recipientUserId:sale.recipientUserId,currency:sale.currency,amountUsdCents:sale.amountUsdCents})))];
 const request=vi.fn(async(path:string)=>{const digest=new URL(path,'https://receiz.com').searchParams.get('saleDigest'),target=sales.find(value=>value.digest===digest);if(!target)throw Error('Broad account scan forbidden');return page(target);}),api=createMerchantReceive({accountUid:recipient,request});
 for(let i=0;i<3;i++){expect(await api.check(sales,signal())).toHaveLength(0);expect(api.unresolved()).toBe(i<2);}
 expect(request.mock.calls.map(([path])=>path)).toEqual(sales.map(value=>`/api/connect/transfers?saleDigest=${value.digest}`));
});
it('refuses repeated cursors without claiming an unpaid history',async()=>{
 const{sale}=await fixture(),api=createMerchantReceive({accountUid:recipient,request:async()=>page(sale,[],'older')});await expect(api.check([sale],signal())).rejects.toThrow('HISTORY_INCOMPLETE');expect(api.unresolved()).toBe(true);
});
it('recovers a failed live observation without forgetting the completed retained discovery window',async()=>{
 const{sale}=await fixture();let available=true;const api=createMerchantReceive({accountUid:recipient,request:async()=>{if(!available)throw Error('MERCHANT_HISTORY_UNAVAILABLE');return page(sale);}});
 expect(await api.check([sale],signal())).toHaveLength(0);expect(api.unresolved()).toBe(false);available=false;await expect(api.check([sale],signal())).rejects.toThrow('HISTORY_UNAVAILABLE');expect(api.unresolved()).toBe(true);
 available=true;expect(await api.check([sale],signal())).toHaveLength(0);expect(api.unresolved()).toBe(false);
});
