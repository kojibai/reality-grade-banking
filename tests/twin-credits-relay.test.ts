import {afterEach,expect,it,vi} from 'vitest';
import {relayTwinUpgrade} from '../server/twin-upgrade';
const uid='11111111-1111-4111-8111-111111111111',sessionId='cs_test_credits12345678',cookie='receiz_session='+('signed-session.'.repeat(4)),operationId='credits-operation-0001';
const request=(body:Record<string,unknown>)=>new Request('https://bankeiz.com/api/bank/native/twin-upgrade',{method:'POST',headers:{origin:'https://bankeiz.com','content-type':'application/json'},body:JSON.stringify({accountUid:uid,continuation:JSON.stringify({keyId:'synthetic-public',signatureB64Url:'fixture-only'}),...body})});
afterEach(()=>vi.unstubAllGlobals());
it('opens native credit checkout for an already active Business user, without creating another subscription',async()=>{
 const fetcher=vi.fn<typeof fetch>(async(url,init)=>{
  if(String(url).endsWith('/continue'))return Response.json({ok:true,session:{uid,plan:'business'}},{headers:{'set-cookie':cookie+'; HttpOnly; Secure'}});
  expect(String(url)).toBe('https://receiz.com/api/usage/checkout');expect(new Headers(init?.headers).get('cookie')).toBe(cookie);expect(JSON.parse(String(init?.body))).toEqual({amountUsd:'25',uiMode:'embedded',returnPath:'/upgrade',clientOperationId:operationId});
  return Response.json({ok:true,mode:'embedded',checkout:{sessionId,clientSecret:sessionId+'_secret_fixture',credits:'2500',amountUsdCents:'2500'}});
 });vi.stubGlobal('fetch',fetcher);
 const reply=await relayTwinUpgrade(request({action:'credits-checkout',amountUsd:'25',operationId}));expect(reply.status).toBe(200);expect(await reply.json()).toMatchObject({accountUid:uid,twinAccess:true,creditsCheckout:{sessionId,credits:'2500',amountUsdCents:'2500'}});expect(fetcher).toHaveBeenCalledTimes(2);expect(reply.headers.has('set-cookie')).toBe(false);
});
it('confirms a top-up only through the exact native session settlement and balance',async()=>{
 vi.stubGlobal('fetch',vi.fn<typeof fetch>(async(url,init)=>{
  if(String(url).endsWith('/continue'))return Response.json({ok:true,session:{uid,plan:'business'}},{headers:{'set-cookie':cookie+'; HttpOnly; Secure'}});
  expect(String(url)).toBe('https://receiz.com/api/usage/checkout/session?session_id='+sessionId);expect(init?.method).toBe('POST');return Response.json({ok:true,session:{sessionId,state:'paid',settled:true},balance:{grantRemaining:'100',purchasedRemaining:'2500',totalRemaining:'2600'}});
 }));
 expect(await(await relayTwinUpgrade(request({action:'credits-status',sessionId}))).json()).toMatchObject({creditsStatus:{sessionId,settled:true},creditsBalance:{totalRemaining:'2600'}});
});
it('rejects malformed amounts and operation identifiers before native checkout',async()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);for(const input of [{amountUsd:'0',operationId},{amountUsd:'25',operationId:'bad!'}])expect((await relayTwinUpgrade(request({action:'credits-checkout',...input}))).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
