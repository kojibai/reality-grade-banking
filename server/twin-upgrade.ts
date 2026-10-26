import {readTwinCreditFunding} from '../src/receiz/twin-credit-funding.js';
import {ownerTwinAccountAccess} from '../src/receiz/twin-access.js';
import {twinCheckoutSession,twinCheckoutSecret,twinBillingPortalUrl} from '../src/receiz/twin-upgrade.js';
const root='https://receiz.com';
function creditCents(value:unknown):string|null{if(typeof value!=='string'||!/^\d{1,4}(?:\.\d{1,2})?$/.test(value))return null;const [whole,fraction='']=value.split('.'),cents=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));return cents>=1000n&&cents<=100000n?String(cents):null;}
const object=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
const json=(value:unknown,status=200)=>Response.json(value,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
async function boundedText(response:Response|Request,limit:number){
 if(!response.body)return '';const reader=response.body.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let raw='',length=0;
 try{for(;;){const part=await reader.read();if(part.done)break;length+=part.value.byteLength;if(length>limit)throw Error('UPGRADE_CAPACITY');raw+=decoder.decode(part.value,{stream:true});}return raw+decoder.decode();}finally{await reader.cancel().catch(()=>{});}
}
function freshSession(headers:Headers):string|null {
 const cookies=headers.getSetCookie(),matches=cookies.flatMap(cookie=>{const match=/^receiz_session=([A-Za-z0-9_.-]{20,8192})(?:;|$)/.exec(cookie);return match&&/;\s*HttpOnly(?:;|$)/i.test(cookie)?['receiz_session='+match[1]]:[];});
 return matches.length===1?matches[0]:null;
}
/** A single-request adapter to the existing Receiz website checkout. Its fresh
 * session stays in server memory and never becomes a Bank cookie or bearer. */
export async function relayTwinUpgrade(request:Request):Promise<Response>{
 let checkoutStarted=false;
 const url=new URL(request.url),fail=(status=503)=>json({ok:false,error:'Account upgrade could not be confirmed.',checkoutOutcome:checkoutStarted?'unknown':'not-started'},status);
 if(request.method!=='POST'||url.search||request.headers.get('origin')!==url.origin||request.headers.has('cookie')||request.headers.has('authorization')||request.headers.get('content-type')?.split(';')[0]!=='application/json')return fail(403);
 try{
  const input=object(JSON.parse(await boundedText(request,64*1024))),action=input.action;
  const reserve=['credits-quote','credits-purchase','credits-purchase-status'].includes(String(action));const credits=reserve||['credits-checkout','credits-status','credits-balance'].includes(String(action));
  const allowed=reserve?(action==='credits-quote'?['accountUid','action','continuation','amountUsd','operationId']:['accountUid','action','continuation','operationId']):action==='credits-checkout'?['accountUid','action','continuation','amountUsd','operationId']:action==='credits-status'?['accountUid','action','continuation','sessionId']:action==='credits-balance'?['accountUid','action','continuation']:action==='checkout'?['accountUid','action','continuation','interval']:action==='status'?['accountUid','action','continuation','sessionId']:action==='billing'?['accountUid','action','continuation']:[];
  if(!allowed.length||Object.keys(input).some(key=>!allowed.includes(key))||typeof input.accountUid!=='string'||!/^[a-f\d]{8}-[a-f\d]{4}-[1-8][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(input.accountUid)||typeof input.continuation!=='string'||input.continuation.length>32*1024||action==='checkout'&&!['month','year'].includes(String(input.interval))||action==='status'&&input.sessionId!==undefined&&!twinCheckoutSession(input.sessionId))return fail(400);
  if(action==='credits-checkout'&&(!creditCents(input.amountUsd)||typeof input.operationId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/.test(input.operationId))||action==='credits-status'&&!twinCheckoutSession(input.sessionId))return fail(400);
  if(reserve&&(typeof input.operationId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/.test(input.operationId)||action==='credits-quote'&&!creditCents(input.amountUsd)))return fail(400);
  const proof=object(JSON.parse(input.continuation));
  if(typeof proof.keyId!=='string'||typeof proof.signatureB64Url!=='string'||Object.keys(proof).some(key=>!['keyId','alg','publicKeyRawB64u','localUid','username','displayName','deviceName','createdAt','challengeB64Url','signatureB64Url','next'].includes(key)))return fail(400);
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(60_000)]),base={credentials:'omit' as const,redirect:'error' as const,signal};
  const continued=await fetch(root+'/api/auth/receiz-id/continue',{...base,method:'POST',headers:{'content-type':'application/json'},body:input.continuation});
  const data=object(JSON.parse(await boundedText(continued,4*1024*1024))),session=object(data.session);
  if(!continued.ok||data.ok!==true||session.uid!==input.accountUid)return fail(403);
  if(!credits&&ownerTwinAccountAccess(session)===true)return json({ok:true,accountUid:input.accountUid,twinAccess:true});
  if(action==='status'&&!input.sessionId)return json({ok:true,accountUid:input.accountUid,twinAccess:false});
  const cookie=freshSession(continued.headers);if(!cookie)return fail(403);
  if(reserve){const status=action==='credits-purchase-status';if(action==='credits-purchase')checkoutStarted=true;const response=await fetch(root+'/api/usage/reserve-purchase'+(status?'?clientOperationId='+encodeURIComponent(String(input.operationId)):''),{...base,method:status?'GET':'POST',headers:{cookie,...(status?{}:{'content-type':'application/json'})},...(status?{}:{body:JSON.stringify({action:action==='credits-quote'?'quote':'purchase',clientOperationId:input.operationId,...(action==='credits-quote'?{amountUsd:input.amountUsd}:{})})})}),outcome=object(JSON.parse(await boundedText(response,8192)));if(!response.ok||outcome.ok!==true)return fail();const creditFunding=readTwinCreditFunding(outcome,input.accountUid,input.operationId as string);return json({ok:true,accountUid:input.accountUid,twinAccess:ownerTwinAccountAccess(session)===true,creditFunding});}
  if(credits){
   const post=action!=='credits-balance';if(action==='credits-checkout')checkoutStarted=true;
   const path=action==='credits-checkout'?'/api/usage/checkout':action==='credits-status'?'/api/usage/checkout/session?session_id='+encodeURIComponent(String(input.sessionId)):'/api/usage/balance';
   const response=await fetch(root+path,{...base,method:post?'POST':'GET',headers:{cookie,...(post?{'content-type':'application/json'}:{})},...(action==='credits-checkout'?{body:JSON.stringify({amountUsd:input.amountUsd,uiMode:'embedded',returnPath:'/upgrade',clientOperationId:input.operationId})}:{})});
   const outcome=object(JSON.parse(await boundedText(response,8192)));if(!response.ok||outcome.ok!==true)return fail();
   const reply:Record<string,unknown>={ok:true,accountUid:input.accountUid,twinAccess:ownerTwinAccountAccess(session)===true};
   if(action==='credits-checkout'){
    const c=object(outcome.checkout),cents=creditCents(input.amountUsd);if(outcome.mode!=='embedded'||!twinCheckoutSession(c.sessionId)||!twinCheckoutSecret(c.sessionId,c.clientSecret)||c.credits!==cents||c.amountUsdCents!==cents)return fail();reply.creditsCheckout={sessionId:c.sessionId,clientSecret:c.clientSecret,credits:c.credits,amountUsdCents:c.amountUsdCents};
   }else{
    const b=object(outcome.balance);if(outcome.balance!==null){if(!['grantRemaining','purchasedRemaining','totalRemaining'].every(key=>typeof b[key]==='string'&&/^\d{1,40}$/.test(b[key] as string))||BigInt(b.grantRemaining as string)+BigInt(b.purchasedRemaining as string)!==BigInt(b.totalRemaining as string))return fail();reply.creditsBalance=b;}
    if(action==='credits-status'){const status=object(outcome.session);if(status.sessionId!==input.sessionId||typeof status.settled!=='boolean'||typeof status.state!=='string'||status.settled&&outcome.balance===null)return fail();reply.creditsStatus=status;}
   }
   return json(reply);
  }
  const checkout=action==='checkout';
  if(checkout||action==='billing'){
   const billing=await fetch(root+'/api/stripe/billing/summary',{...base,headers:{cookie}}),summaryReply=object(JSON.parse(await boundedText(billing,64*1024)));
   if(!billing.ok||summaryReply.ok!==true)return fail();
   const summary=object(summaryReply.summary);
   if(summary.subscriptionId&&!['canceled','incomplete_expired'].includes(String(summary.status))){
    const portal=await fetch(root+'/api/stripe/portal',{...base,redirect:'manual',headers:{cookie}});await portal.body?.cancel();
    const location=portal.headers.get('location');if(![302,303,307,308].includes(portal.status)||!twinBillingPortalUrl(location))return fail();
    return json({ok:true,accountUid:input.accountUid,twinAccess:false,billingPortal:location});
   }
   if(action==='billing')return json({ok:true,accountUid:input.accountUid,twinAccess:false});
  }
  if(checkout)checkoutStarted=true;
  const result=await fetch(root+(checkout?'/api/stripe/checkout':'/api/premium/sync?session_id='+encodeURIComponent(input.sessionId as string)),{...base,method:checkout?'POST':'GET',headers:{'content-type':'application/json',cookie},...(checkout?{body:JSON.stringify({plan:'business',interval:input.interval,uiMode:'embedded'})}:{})});
  const outcome=object(JSON.parse(await boundedText(result,8192)));if(!result.ok||outcome.ok!==true)return fail(result.status===403?403:503);
  if(!checkout)return json({ok:true,accountUid:input.accountUid,twinAccess:ownerTwinAccountAccess({plan:outcome.plan})===true});
  if(!twinCheckoutSession(outcome.sessionId)||!twinCheckoutSecret(outcome.sessionId,outcome.clientSecret)||outcome.mode!=='embedded')return fail();
  return json({ok:true,accountUid:input.accountUid,twinAccess:false,checkout:{sessionId:outcome.sessionId,clientSecret:outcome.clientSecret,interval:input.interval}});
 }catch{return fail();}
}
