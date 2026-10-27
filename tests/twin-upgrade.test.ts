import {afterEach,expect,it,vi} from 'vitest';
import {relayNativeAccount} from '../server/native-account';
const uid='11111111-1111-4111-8111-111111111111',sessionId='cs_test_upgrade12345678',sessionCookie='receiz_session='+('signed-session.'.repeat(4));
const original=' { "keyId":"synthetic-public-proof", "signatureB64Url":"not-live" } ';
const request=(body:Record<string,unknown>,origin='https://bankeiz.com')=>new Request('https://bankeiz.com/api/bank/native/twin-upgrade',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({accountUid:uid,continuation:original,...body})});
afterEach(()=>vi.unstubAllGlobals());
it('uses only the fresh same-account Receiz session for canonical subscription checkout, without exposing it',async()=>{
 const fetcher=vi.fn<typeof fetch>(async(url,init)=>{
  const headers=new Headers(init?.headers);expect(init?.redirect).toBe('error');expect(init?.credentials).toBe('omit');expect(headers.has('authorization')).toBe(false);
  if(String(url).endsWith('/api/auth/receiz-id/continue')){expect(headers.has('cookie')).toBe(false);expect(init?.body).toBe(original);return Response.json({ok:true,session:{uid,plan:'free',entitlementPlan:'free'}},{headers:{'set-cookie':sessionCookie+'; Path=/; HttpOnly; Secure; SameSite=Lax'}});}
  if(String(url).endsWith('/api/stripe/billing/summary'))return Response.json({ok:true,summary:null});
  expect(String(url)).toBe('https://receiz.com/api/stripe/checkout');expect(headers.get('cookie')).toBe(sessionCookie);expect(JSON.parse(String(init?.body))).toEqual({plan:'business',interval:'year',uiMode:'embedded'});
  return Response.json({ok:true,mode:'embedded',clientSecret:sessionId+'_secret_fixture',sessionId});
 });vi.stubGlobal('fetch',fetcher);
 const reply=await relayNativeAccount(request({action:'checkout',interval:'year'}));expect(reply.status).toBe(200);expect(reply.headers.get('set-cookie')).toBeNull();expect(reply.headers.get('cache-control')).toBe('no-store');const raw=await reply.text();expect(raw).not.toContain('signed-session');expect(JSON.parse(raw)).toEqual({ok:true,accountUid:uid,twinAccess:false,checkout:{sessionId,clientSecret:sessionId+'_secret_fixture',interval:'year'}});expect(fetcher).toHaveBeenCalledTimes(3);
});
it.each(['wrong-owner','no-fresh-cookie','signin-refused'])('refuses %s before any checkout',async mode=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json({ok:mode!=='signin-refused',session:{uid:mode==='wrong-owner'?'22222222-2222-4222-8222-222222222222':uid,plan:'free'}},{status:mode==='signin-refused'?403:200,headers:mode==='no-fresh-cookie'?{}:{'set-cookie':sessionCookie+'; HttpOnly; Secure'}}));vi.stubGlobal('fetch',fetcher);
 expect((await relayNativeAccount(request({action:'checkout',interval:'month'}))).status).toBeGreaterThanOrEqual(400);expect(fetcher).toHaveBeenCalledTimes(1);
});
it('rejects foreign origins and unsupported plans before any upstream work',async()=>{
 const fetcher=vi.fn<typeof fetch>();vi.stubGlobal('fetch',fetcher);
 const ambient=request({action:'checkout',interval:'month'});ambient.headers.set('cookie','private-bank-cookie');
 for(const entry of [ambient,request({action:'checkout',interval:'month'},'https://foreign.example'),request({action:'checkout',interval:'month',plan:'enterprise'}),request({action:'checkout',interval:'weekly'})])expect((await relayNativeAccount(entry)).status).toBeGreaterThanOrEqual(400);
 expect(fetcher).not.toHaveBeenCalled();
});
it('does not create another subscription for an already entitled account',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json({ok:true,session:{uid,plan:'premium',entitlementPlan:'business'}}));vi.stubGlobal('fetch',fetcher);
 const reply=await relayNativeAccount(request({action:'checkout',interval:'month'}));expect(await reply.json()).toEqual({ok:true,accountUid:uid,twinAccess:true});expect(fetcher).toHaveBeenCalledTimes(1);
});
it('routes an existing subscription to Receiz billing management rather than opening a second subscription',async()=>{
 const fetcher=vi.fn<typeof fetch>(async(url)=>{
  if(String(url).endsWith('/continue'))return Response.json({ok:true,session:{uid,plan:'premium'}},{headers:{'set-cookie':sessionCookie+'; HttpOnly; Secure'}});
  if(String(url).endsWith('/summary'))return Response.json({ok:true,summary:{subscriptionId:'sub_existing',status:'active',plan:'premium'}});
  expect(String(url)).toBe('https://receiz.com/api/stripe/portal');return new Response(null,{status:303,headers:{location:'https://billing.stripe.com/p/session/test_current'}});
 });vi.stubGlobal('fetch',fetcher);
 expect(await(await relayNativeAccount(request({action:'checkout',interval:'month'}))).json()).toEqual({ok:true,accountUid:uid,twinAccess:false,billingPortal:'https://billing.stripe.com/p/session/test_current'});expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('/checkout'))).toBe(false);
});
it('confirms the original checkout through Receiz and enables Twin only from its actual upgraded account plan',async()=>{
 for(const plan of ['free','business']){
  const fetcher=vi.fn<typeof fetch>(async(url,init)=>String(url).endsWith('/continue')?Response.json({ok:true,session:{uid,plan:'free'}},{headers:{'set-cookie':sessionCookie+'; HttpOnly; Secure'}}):(()=>{expect(String(url)).toBe('https://receiz.com/api/premium/sync?session_id='+sessionId);expect(new Headers(init?.headers).get('cookie')).toBe(sessionCookie);return Response.json({ok:true,plan,status:plan==='business'?'active':'incomplete'});})());vi.stubGlobal('fetch',fetcher);
  const reply=await relayNativeAccount(request({action:'status',sessionId}));expect(await reply.json()).toEqual({ok:true,accountUid:uid,twinAccess:plan==='business'});expect(fetcher).toHaveBeenCalledTimes(2);
 }
});
it('distinguishes a refused billing preflight from a checkout whose response was lost',async()=>{
 for(const lostCheckout of [false,true]){
  const fetcher=vi.fn<typeof fetch>(async url=>{
   if(String(url).endsWith('/continue'))return Response.json({ok:true,session:{uid,plan:'free'}},{headers:{'set-cookie':sessionCookie+'; HttpOnly; Secure'}});
   if(String(url).endsWith('/summary'))return lostCheckout?Response.json({ok:true,summary:null}):Response.json({ok:false},{status:503});
   throw Error('Checkout response lost');
  });vi.stubGlobal('fetch',fetcher);
  const reply=await relayNativeAccount(request({action:'checkout',interval:'month'}));
  expect(reply.status).toBe(503);expect((await reply.json()).checkoutOutcome).toBe(lostCheckout?'unknown':'not-started');
 }
});
it('refreshes billing access without creating a subscription, even if the previous subscription has ended',async()=>{
 for(const active of [false,true]){
  const fetcher=vi.fn<typeof fetch>(async url=>{
   if(String(url).endsWith('/continue'))return Response.json({ok:true,session:{uid,plan:'free'}},{headers:{'set-cookie':sessionCookie+'; HttpOnly; Secure'}});
   if(String(url).endsWith('/summary'))return Response.json({ok:true,summary:active?{subscriptionId:'sub_existing',status:'active'}:null});
   expect(String(url)).toBe('https://receiz.com/api/stripe/portal');return new Response(null,{status:303,headers:{location:'https://billing.stripe.com/p/session/fresh'}});
  });vi.stubGlobal('fetch',fetcher);
  const reply=await relayNativeAccount(request({action:'billing'}));expect(reply.status).toBe(200);
  expect((await reply.json()).billingPortal).toBe(active?'https://billing.stripe.com/p/session/fresh':undefined);
  expect(fetcher.mock.calls.some(([url])=>String(url).endsWith('/checkout'))).toBe(false);
 }
});
it('uses the additive native balance endpoint only for its explicitly selected funding policy',async()=>{
 const operationId='balance-operation-001',quote={schema:'receiz.usage.balance-purchase.quote.v1',ownerUserId:uid,clientOperationId:operationId,fundingPolicy:'reserve-settlement-card',credits:'1000',amountUsdCents:'1000',bankContributionUsdCents:'975',reserveContributionUsdCents:'600',settlementContributionUsdCents:'375',cardShortfallUsdCents:'25',minimumCardDepositUsdCents:'50',exactCardDepositAvailable:false,expiresAt:'2099-01-01T00:00:00Z'};
 const fetcher=vi.fn<typeof fetch>(async(url,init)=>String(url).endsWith('/continue')?Response.json({ok:true,session:{uid,plan:'business'}},{headers:{'set-cookie':sessionCookie+'; HttpOnly; Secure'}}):(()=>{expect(String(url)).toBe('https://receiz.com/api/usage/balance-purchase');expect(JSON.parse(String(init?.body))).toEqual({action:'quote',clientOperationId:operationId,amountUsd:'10'});return Response.json({ok:true,quote});})());vi.stubGlobal('fetch',fetcher);
 const response=await relayNativeAccount(request({action:'credits-quote',fundingMode:'balance',operationId,amountUsd:'10'}));expect(response.status).toBe(200);expect((await response.json()).creditFunding.quote).toEqual(quote);expect(fetcher).toHaveBeenCalledTimes(2);
});
