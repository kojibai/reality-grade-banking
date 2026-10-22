import {afterEach,expect,it,vi} from 'vitest';
import {createReceizClient} from '@receiz/sdk';
import {createMarketTrade} from '../src/receiz/market-trade';
import {nativeFetch} from '../src/receiz/native-transport';
import {nativeRequestPath,relayNativeAccount} from '../server/native-account';
import {BANK_APPLICATION_ID} from '../src/receiz/config';
import {marketFixtureUid,syntheticMarketQuote} from './fixtures/market-trade';
afterEach(()=>vi.unstubAllGlobals());
it('closes the exact saved attempt through both production proxy boundaries and permits another review',async()=>{
 let state:unknown=null;const upstream:{path:string;method:string;body:unknown}[]=[];
 vi.stubGlobal('fetch',async(input:RequestInfo|URL,init?:RequestInit)=>{
  const target=String(input);
  if(target.startsWith('/api/bank/native/'))return relayNativeAccount(new Request('https://bankeiz.com'+target,init));
  const url=new URL(target),method=init?.method??'GET',body=init?.body?JSON.parse(String(init.body)):null;upstream.push({path:url.pathname,method,body});
  if(url.origin!=='https://receiz.com')throw Error('Unexpected origin');
  if(url.pathname.endsWith('/quote'))return Response.json(syntheticMarketQuote(url.searchParams));
  if(url.pathname.endsWith('/trade')&&method==='POST')return Response.json({ok:false,error:'market_trade_failed'},{status:503});
  if(url.pathname.endsWith('/trade')&&method==='GET')return Response.json({ok:true,authority:'market-observation',actorUserId:marketFixtureUid,found:false,recorded:false});
  if(url.pathname.endsWith('/trade/cancel')&&method==='POST')return Response.json({ok:true,authority:'market-observation',actorUserId:marketFixtureUid,found:false,recorded:false,closed:true,clientNonce:body.clientNonce,reason:'canceled'});
  throw Error('Unexpected contract');
 });
 const client=createReceizClient({applicationId:BANK_APPLICATION_ID,accessToken:'synthetic-only',fetchImpl:nativeFetch});
 const options={ownerReceizId:'synthetic.receiz.id',assertOpen(){},assertNoOtherPending:async()=>{},lock:async<T,>(operation:()=>Promise<T>)=>operation(),store:{read:async()=>state,write:async(next:unknown,previous:unknown)=>{expect(state).toEqual(previous);state=structuredClone(next);}},connect:async()=>({client,accountUid:marketFixtureUid})};
 const api=createMarketTrade(options),review=await api.prepare({marketItemId:'asset:one',side:'buy',amountUsdCents:'1000'});
 expect((await api.execute(review,review.digest)).status).toBe('unknown');
 expect(await api.stop(true,review.body.clientNonce)).toMatchObject({status:'not-sent',reason:'market_trade_canceled',clientNonce:review.body.clientNonce});
 expect((await createMarketTrade(options).status())?.status).toBe('not-sent');
 await expect(api.prepare({marketItemId:'asset:two',side:'buy',amountUsdCents:'1000'})).resolves.toBeDefined();
 expect(upstream.filter(call=>call.path.endsWith('/trade')&&call.method==='POST')).toHaveLength(1);
 expect(upstream.find(call=>call.path.endsWith('/cancel'))?.body).toEqual({clientNonce:review.body.clientNonce});
});
it('keeps cancellation limited to its exact POST contract with no owner or destination query',()=>{
 const path='/api/bank/native/api/connect/market/shares/trade/cancel';expect(nativeRequestPath(path,'POST')).toBe('/api/connect/market/shares/trade/cancel');
 for(const method of ['GET','PUT','DELETE'])expect(nativeRequestPath(path,method)).toBeNull();
 for(const suffix of ['?ownerUserId=foreign','?clientNonce=unreviewed_nonce','/other','?url=https://foreign.example'])expect(nativeRequestPath(path+suffix,'POST')).toBeNull();
});
