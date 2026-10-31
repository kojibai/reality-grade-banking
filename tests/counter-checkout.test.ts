import {expect,it,vi} from 'vitest';
import {createCounterCatalogTransport,counterRequestStatus} from '../src/receiz/counter/transport';
import {createFixedSale,buildFixedSaleUrl} from '../src/receiz/fixed-checkout';
import {parseCheckoutRequest} from '../src/receiz/checkout-request';
const owner='10000000-0000-4000-8000-000000000002';
async function sale(){return createFixedSale({schema:'bank.fixed-checkout.v1',saleId:'20000000-0000-4000-8000-000000000002',recipientUserId:owner,username:'merchant',currency:'usd',amountUsdCents:'1000'});}
it('keeps the fixed request unchanged while marking new registered Counter links for immediate public status',async()=>{
 const request=await sale(),url=buildFixedSaleUrl(request,{counter:true});expect(new URL(url).searchParams.get('counter')).toBe('1');expect(parseCheckoutRequest(url)).toMatchObject({counter:true,fixedSale:{amountUsdCents:'1000',saleId:request.saleId}});expect(parseCheckoutRequest(buildFixedSaleUrl(request))).not.toHaveProperty('counter');
});
it('binds public closure to the exact request and rejects a forged recipient or amount',async()=>{
 const request=await sale(),read=vi.fn(async()=>({ok:true,schema:'receiz.merchant-counter.v1',found:true,saleDigest:request.digest,recipientUserId:owner,amountUsdCents:'1000',status:'cancelled'}));expect(await counterRequestStatus(read,request)).toBe('cancelled');read.mockResolvedValueOnce({ok:true,schema:'receiz.merchant-counter.v1',found:true,saleDigest:request.digest,recipientUserId:owner,amountUsdCents:'999',status:'cancelled'});await expect(counterRequestStatus(read,request)).rejects.toThrow('match');
});
it('allows only current owner-bound catalog responses and forwards the exact revision when closing',async()=>{
 const request=await sale(),send=vi.fn(async()=>({ok:true,schema:'receiz.merchant-counter.v1',ownerUid:owner,revision:7,items:[],reserved:{},status:'cancelled'})),api=createCounterCatalogTransport(send,owner);await api.cancel(request,6);expect(send).toHaveBeenCalledWith('/api/connect/merchant-counter',{method:'POST',body:{action:'cancel',request,afterRevision:6}});const wrong=createCounterCatalogTransport(send,'someone-else');await expect(wrong.read()).rejects.toThrow('unavailable');
});
it('includes saved request indexes on recovery only and requests stock deltas without resending them',async()=>{
 const send=vi.fn(async(_path:string)=>({ok:true,schema:'receiz.merchant-counter.v1',ownerUid:owner,revision:7,items:[],reserved:{}})),api=createCounterCatalogTransport(send,owner);await api.read(3,true);await api.read(7,false);expect(send.mock.calls.map(c=>c[0])).toEqual(['/api/connect/merchant-counter?resume=3','/api/connect/merchant-counter?after=7']);
});
