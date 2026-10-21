import { expect, it, vi, afterEach } from 'vitest';
import { nativeRequestPath } from '../server/native-account';
import { nativeFetch } from '../src/receiz/native-transport';
import { createReceizClient } from '@receiz/sdk';
import { BANK_APPLICATION_ID } from '../src/receiz/config';
import {relayNativeAccount} from '../server/native-account';
afterEach(() => vi.unstubAllGlobals());
it('allows only named identity, shared-read and card contracts, with no arbitrary destination or unlisted transfer', () => {
  expect(nativeRequestPath('/api/bank/native/api/connect/wallet/me', 'GET')).toBe('/api/connect/wallet/me');
  for (const path of [ '/api/bank/nativehttps://other.example', '/api/bank/native/api/connect/wallet/me?user=foreign']) expect(nativeRequestPath(path, 'POST')).toBeNull();
  expect(nativeRequestPath('/api/bank/native/api/connect/wallet/me', 'POST')).toBeNull();
  expect(nativeRequestPath('/api/bank/native/api/connect/payments/checkout', 'POST')).toBe('/api/connect/payments/checkout');
  expect(nativeRequestPath('/api/bank/native/api/connect/payments/session?sessionId=cs_test_12345678', 'GET')).toBe('/api/connect/payments/session?sessionId=cs_test_12345678');
  for (const suffix of ['?sessionId=cs_test_12345678&sessionId=cs_other_12345678', '?sessionId=bad', '?sessionId=cs_test_12345678&url=https://evil.example']) expect(nativeRequestPath(`/api/bank/native/api/connect/payments/session${suffix}`, 'GET')).toBeNull();
  expect(nativeRequestPath('/api/bank/nativehttps://receiz.com/api/connect/payments/checkout', 'POST')).toBeNull();
});
it('sends the exact SDK request only to the same-origin bank transport without cookies or redirects', async () => {
  const request = vi.fn<typeof fetch>(async () => new Response('{}')); vi.stubGlobal('fetch', request);
  await nativeFetch('https://receiz.com/api/connect/wallet/me', { headers: { Authorization: 'Bearer held-in-test' } });
  expect(request.mock.calls[0][0]).toBe('/api/bank/native/api/connect/wallet/me');
  expect(request.mock.calls[0][1]).toMatchObject({ credentials: 'omit', redirect: 'error' });
  expect(() => nativeFetch('https://foreign.example/api/connect/wallet/me')).toThrow();
});
it('carries SDK Wallet Send and only its bounded quote, recipient and original-nonce reads',async()=>{
  for(const path of ['/api/connect/transfers','/api/chat/conversations']){
    expect(nativeRequestPath(`/api/bank/native${path}`,'POST')).toBe(path);
    expect(nativeRequestPath(`/api/bank/native${path}?accountId=other`,'POST')).toBeNull();
  }
  for(const path of ['/api/connect/transfers?amountUsd=10.00','/api/connect/transfers?clientNonce=retained_nonce','/api/chat/users/search?q=receiver'])expect(nativeRequestPath(`/api/bank/native${path}`,'GET')).toBe(path);
  for(const query of ['?clientNonce=retained_nonce&userId=foreign','?clientNonce=retained_nonce&clientNonce=another_nonce','?amountUsd=1.00&recipient=foreign','?url=https://foreign.example'])expect(nativeRequestPath(`/api/bank/native/api/connect/transfers${query}`,'GET')).toBeNull();
  expect(nativeRequestPath('/api/bank/native/api/chat/conversations/foreign/messages','POST')).toBeNull();
  const request=vi.fn<typeof fetch>(async()=>new Response('{}',{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',request);
  const client=createReceizClient({applicationId:BANK_APPLICATION_ID,accessToken:'synthetic-wallet-grant',fetchImpl:nativeFetch});
  await client.connect.transfer({recipientUserId:'recipient',conversationId:'conversation',unit:'usd',amountUsd:'10.00',clientNonce:'retained_nonce'});
  expect(request.mock.calls[0][0]).toBe('/api/bank/native/api/connect/transfers');
  expect(JSON.parse(String(request.mock.calls[0][1]?.body))).toMatchObject({amountUsd:'10.00',clientNonce:'retained_nonce'});
  expect(request.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error'});
});
it('carries the real SDK qualification application coordinate without opening arbitrary native queries', async () => {
  const target = `/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`;
  expect(nativeRequestPath(`/api/bank/native${target}`, 'POST')).toBe(target);
  for (const query of ['', '?applicationId=foreign', `?applicationId=${BANK_APPLICATION_ID}&applicationId=${BANK_APPLICATION_ID}`, `?applicationId=${BANK_APPLICATION_ID}&url=https://evil.example`]) {
    expect(nativeRequestPath(`/api/bank/native/api/sdk/v1/runtime/qualify${query}`, 'POST')).toBeNull();
  }
  expect(nativeRequestPath(`/api/bank/native${target}`, 'GET')).toBeNull();
});
it('forwards the actual SDK qualification wire instead of refusing its application query locally', async () => {
  const target = `/api/sdk/v1/runtime/qualify?applicationId=${BANK_APPLICATION_ID}`;
  // Real SDK wire composition, with a refused transport reply. This admits no
  // identity, session or capability report and exercises no live private ID.
  const request = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ ok: false, code: 'APPLICATION_MISMATCH', writes: 0 }), { status: 400, headers: { 'Content-Type': 'application/json' } }));
  vi.stubGlobal('fetch', request);
  const client = createReceizClient({ applicationId: BANK_APPLICATION_ID, accessToken: 'boundary-fixture', fetchImpl: nativeFetch });
  await expect(client.runtime.qualifyV124({ applicationId: BANK_APPLICATION_ID, operations: ['subject-admission'] })).rejects.toMatchObject({ status: 400 });
  expect(request).toHaveBeenCalledTimes(1);
  expect(request.mock.calls[0][0]).toBe(`/api/bank/native${target}`);
  expect(JSON.parse(request.mock.calls[0][1]!.body as string)).toEqual({ applicationId: BANK_APPLICATION_ID, operations: ['subject-admission'] });
});
it('bounds Market quote and exact nonce reads and uses the installed SDK Market create endpoint',async()=>{
 const quote='/api/connect/market/shares/quote?marketItemId=asset%3Aone&side=buy&amountUsd=10.00';
 expect(nativeRequestPath(`/api/bank/native${quote}`,'GET')).toBe(quote);
 for(const suffix of ['&ownerUserId=foreign','&amountUsd=11.00','&url=https://evil.example'])expect(nativeRequestPath(`/api/bank/native${quote}${suffix}`,'GET')).toBeNull();
 for(const path of ['/api/connect/market/shares/trade?clientNonce=retained_nonce','/api/connect/market/shares/quote?marketItemId=asset%3Aone&side=sell&shareQuantity=1.250000'])expect(nativeRequestPath(`/api/bank/native${path}`,'GET')).toBe(path);
 expect(nativeRequestPath('/api/bank/native/api/connect/market/shares/trade','GET')).toBeNull();
 const request=vi.fn<typeof fetch>(async()=>new Response('{}',{headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',request);const client=createReceizClient({applicationId:BANK_APPLICATION_ID,accessToken:'synthetic',fetchImpl:nativeFetch});
 await client.request('/api/connect/market/shares/trade',{method:'POST',body:{marketItemId:'asset:one',side:'buy',amountUsd:'10.00',clientNonce:'retained_nonce'}});
 expect(request.mock.calls[0][0]).toBe('/api/bank/native/api/connect/market/shares/trade');
});
it('permits only exact connected Note creation and original issue or claim recovery coordinates',()=>{
 const base='/api/connect/offline-notes/connected?origin=https%3A%2F%2Fbankeiz.com';
 expect(nativeRequestPath('/api/bank/native'+base,'POST')).toBe(base);
 for(const query of ['&allocationId='+'a'.repeat(64),'&noteId=22222222-2222-4222-8222-222222222222'])expect(nativeRequestPath('/api/bank/native'+base+query,'GET')).toBe(base+query);
 for(const query of ['','&allocationId=wrong','&noteId=wrong','&allocationId='+'a'.repeat(64)+'&noteId=22222222-2222-4222-8222-222222222222','&owner=foreign'])expect(nativeRequestPath('/api/bank/native'+base+query,'GET')).toBeNull();
 expect(nativeRequestPath('/api/bank/native'+base+'&origin=https%3A%2F%2Fbankeiz.com','POST')).toBeNull();
});
it('forwards only the signed Showcase publication headers to its explicit connected endpoint',async()=>{
 const route=`/api/connect/profile/showcase/publication?applicationId=${BANK_APPLICATION_ID}`;
 const upstream=vi.fn<typeof fetch>(async()=>Response.json({status:'pending'}));vi.stubGlobal('fetch',upstream);
 const headers={'Content-Type':'application/json',Authorization:'Bearer synthetic',Cookie:'never-forward','x-receiz-owner-id':'owner.receiz.id','x-receiz-profile-username':'owner','x-receiz-local-action-id':'action','x-receiz-local-action-key-id':'a'.repeat(64),'x-receiz-local-action-public-key':'public','x-receiz-local-action-challenge':'challenge','x-receiz-local-action-signature':'signature','x-unlisted-header':'strip'};
 expect((await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native'+route,{method:'POST',headers,body:'{}'}))).status).toBe(200);
 const passed=new Headers(upstream.mock.calls[0][1]?.headers);
 for(const [key,value]of Object.entries(headers))if(key.startsWith('x-receiz'))expect(passed.get(key)).toBe(value);
 expect(passed.get('cookie')).toBeNull();expect(passed.get('x-unlisted-header')).toBeNull();
 expect(nativeRequestPath('/api/bank/native'+route+'&username=owner&action=inventory&cursor=next','GET')).not.toBeNull();
 for(const suffix of ['&url=https://foreign.example','&applicationId=rc_foreign','&username=owner&block=x&action=inventory'])expect(nativeRequestPath('/api/bank/native'+route+suffix,'GET')).toBeNull();
});
it('relays only bounded multipart profile photos through the existing protected transport',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json({ok:true}));vi.stubGlobal('fetch',fetcher);const form=new FormData();form.set('kind','avatar');form.set('file',new File(['photo'],'photo.webp',{type:'image/webp'}));const response=await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native/api/profile/me/media',{method:'POST',headers:{authorization:'Bearer profile-fixture',origin:'https://bankeiz.com'},body:form}));expect(response.status).toBe(200);expect(fetcher.mock.calls[0][0]).toBe('https://receiz.com/api/profile/me/media');expect(fetcher.mock.calls[0][1]).toMatchObject({credentials:'omit',redirect:'error'});expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('content-type')).toMatch(/^multipart\/form-data; boundary=/);expect(new Headers(fetcher.mock.calls[0][1]?.headers).get('authorization')).toBe('Bearer profile-fixture');
 const invalid=await relayNativeAccount(new Request('https://bankeiz.com/api/bank/native/api/profile/me/media',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));expect(invalid.status).toBe(415);expect(fetcher).toHaveBeenCalledTimes(1);
});
