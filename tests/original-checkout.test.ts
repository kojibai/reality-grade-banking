import {expect,it} from 'vitest';
import {createFixedSale,fixedSalePaymentNote} from '../src/receiz/fixed-checkout';
import {parseCheckoutRequest} from '../src/receiz/checkout-request';
import {publicOriginalCheckoutUrl} from '../src/receiz/public-original-purchase';

const id='imported-'+'a'.repeat(64);
const nonce='10000000-0000-4000-8000-000000000001';
const saleId='20000000-0000-4000-8000-000000000001';
const recipientUserId='30000000-0000-4000-8000-000000000001';

it('opens an exact Original in Bankeiz and takes price only from its purchase quote',()=>{
 const url=publicOriginalCheckoutUrl('https://receiz.com/artist/verified/'+id,id);
 expect(url).toBe('/pay/artist/?original='+id);
 expect(parseCheckoutRequest(url!)).toEqual({username:'artist',originalId:id});
 expect(()=>parseCheckoutRequest(url+'&amount=0.01')).toThrow();
});

it('binds the Original and purpose into the existing fixed checkout approval and Wallet Original',async()=>{
 const fields={schema:'bank.fixed-checkout.v1' as const,saleId,recipientUserId,username:'artist',currency:'usd' as const,amountUsdCents:'599'};
 const original=await createFixedSale({...fields,originalId:id,originalSha256:'b'.repeat(64)});
 const plain=await createFixedSale(fields);
 expect(original.digest).not.toBe(plain.digest);
 expect(fixedSalePaymentNote(original,nonce)).toBe(`bank.original.v1:${id}:${original.digest}:${nonce}`);
});

it('streams only the authenticated purchased-file path without forwarding cookies',async()=>{
 const {vi}=await import('vitest');
 const {relayNativeAccount}=await import('../server/native-account');
 const {originalPurchasePath,createOriginalPurchaseClient}=await import('../src/receiz/original-checkout');
 const path=originalPurchasePath(id),payload=new TextEncoder().encode('exact Original');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',payload)),byte=>byte.toString(16).padStart(2,'0')).join('');
 const fetcher=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>new Response(payload,{headers:{
  'content-disposition':"attachment; filename*=UTF-8''work.txt",'content-length':String(payload.byteLength),
  'content-type':'text/plain','x-receiz-original-sha256':digest,
 }}));
 try{
  const client=createOriginalPurchaseClient(route=>relayNativeAccount(new Request('https://bankeiz.com/api/bank/native'+route,{
   headers:{authorization:'Bearer purchase-fixture',cookie:'unrelated=cookie-fixture'},
  })));
  const file=await client.download(id,digest);
  expect(await file.bytes.text()).toBe('exact Original');
  expect(file.filename).toBe('work.txt');
  expect(fetcher).toHaveBeenCalledWith('https://receiz.com'+path,expect.objectContaining({credentials:'omit',redirect:'error'}));
  const upstream=new Headers(fetcher.mock.calls[0][1]?.headers);
  expect(upstream.get('authorization')).toBe('Bearer purchase-fixture');
  expect(upstream.get('cookie')).toBeNull();
  await expect(client.download(id,'b'.repeat(64))).rejects.toThrow('ORIGINAL_DOWNLOAD_MISMATCH');
  const invalid=await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native'+path+'&disposition=inline'));
  expect(invalid.status).toBe(400);
 }finally{fetcher.mockRestore();}
});
