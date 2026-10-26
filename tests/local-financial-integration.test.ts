import {beforeAll,expect,it} from 'vitest';
import {createLocalFinancialSession} from '../src/receiz/local-financial';
import {createLocalFinancialFixtureFactory} from './helpers/local-financial-fixture';

let localFinancialFixture:Awaited<ReturnType<typeof createLocalFinancialFixtureFactory>>;
beforeAll(async()=>{localFinancialFixture=await createLocalFinancialFixtureFactory();},60000);

it('commits offline at the original pulse and publishes the exact causal prefix without executing again',async()=>{
 const f=await localFinancialFixture();
 const session=await createLocalFinancialSession(f.options);
 const first=await session.execute({operationId:'55555555-5555-4555-8555-555555555555',action:{kind:'buy',marketItemId:'asset:held',amountUsdCents:'100'}});
 expect(first.status).toBe('committed');if(first.status!=='committed')throw Error('Fixture commit');expect(f.requests).toHaveLength(0);
 const second=await session.execute({operationId:'66666666-6666-4666-8666-666666666666',action:{kind:'sell',marketItemId:'asset:held',shareQuantityMicro:'500000'}});
 expect(second.status).toBe('committed');if(second.status!=='committed')throw Error('Fixture commit');expect(f.requests).toHaveLength(0);
 f.connect();expect((await session.flush()).status).toBe('published');
 expect(f.requests.flatMap(b=>b.originals.map(o=>o.operationId))).toEqual([first.operation.operationId,second.operation.operationId]);
 expect(f.requests.flatMap(b=>b.originals.map(o=>JSON.parse(new TextDecoder().decode(f.runtime.decode(o.artifactBytesB64u))).atKaiUPulse))).toEqual([first.operation.atKaiUPulse,second.operation.atKaiUPulse]);
 const sent=f.requests.length;await session.flush();expect(f.requests).toHaveLength(sent);
 session.dispose();
});

it('uses the existing shared native SDK module for financial functions instead of another verifier bundle',async()=>{
 const {readFile}=await import('node:fs/promises');
 const text=await readFile(new URL('../public/native/offline-notes.v129.mjs',import.meta.url),'utf8');
 const {build}=await import('esbuild');
 const result=await build({stdin:{contents:text,sourcefile:'shared-sdk.mjs',loader:'js'},write:false,format:'esm',metafile:true});
 const exported=Object.values(result.metafile!.outputs)[0].exports;
 for(const key of ['admitReceizAccountFinancialSource','createReceizAccountFinancialExecutor','createReceizAccountFinancialPublisher','projectReceizAccountFinancialAction','financialSourceApplicationId','financialKaiNow'])expect(exported,key).toContain(key);
});


it('recovers exact retained commits on cold reopen and does not depend on optional presentation or delivery',async()=>{
 const f=await localFinancialFixture(),first=await createLocalFinancialSession({...f.options,onCommitted(){throw Error('Display unavailable');}});
 const request={operationId:'77777777-7777-4777-8777-777777777777',action:{kind:'send' as const,recipientUserId:'33333333-3333-4333-8333-333333333333',conversationId:'44444444-4444-4444-8444-444444444444',amountUsdCents:'100'}};
 const committed=await first.execute(request);expect(committed.status).toBe('committed');
 const before=await first.current();first.dispose();expect(f.listeners.size).toBe(0);
 const cold=await createLocalFinancialSession(f.options);expect(await cold.current()).toEqual(before);
 expect(await cold.execute(request)).toEqual(committed);expect(f.requests).toHaveLength(0);expect(f.listeners.size).toBe(1);
 f.connect();expect((await cold.flush()).status).toBe('published');expect(f.requests.flatMap(b=>b.originals)).toHaveLength(1);
 cold.dispose();expect(f.listeners.size).toBe(0);
});

it('projects genuine retained Kai growth offline and retains every committed debit',async()=>{
 const f=await localFinancialFixture({growth:true}),session=await createLocalFinancialSession(f.options);
 const before=await session.wallet();f.at(14017492000000n);const grown=await session.wallet();expect(BigInt(grown.availableUsdCents)).toBeGreaterThan(BigInt(before.availableUsdCents));
 const sent=await session.execute({operationId:'88888888-8888-4888-8888-888888888888',action:{kind:'send',recipientUserId:'33333333-3333-4333-8333-333333333333',conversationId:'44444444-4444-4444-8444-444444444444',amountUsdCents:'100'}});
 expect(sent.status).toBe('committed');expect(BigInt((await session.wallet()).availableUsdCents)).toBe(BigInt(grown.availableUsdCents)-100n);
 expect(f.requests).toHaveLength(0);session.dispose();
});

it('refuses a foreign admitted Source scope before creating local financial state',async()=>{
 const f=await localFinancialFixture();
 await expect(createLocalFinancialSession({...f.options,accountUid:'99999999-9999-4999-8999-999999999999'})).rejects.toThrow('BANK_LOCAL_FINANCIAL_IDENTITY_MISMATCH');
 expect(f.originals.size).toBe(0);expect(f.requests).toHaveLength(0);expect(f.listeners.size).toBe(0);
});

it('uses actual Kai asset growth for local Buy and Sell and reconnects with the exact original prices',async()=>{
 const f=await localFinancialFixture({dynamicMarket:true,growth:true}),session=await createLocalFinancialSession(f.options);
 const request={operationId:'99999999-9999-4999-8999-999999999999',action:{kind:'buy' as const,marketItemId:'asset:held',amountUsdCents:'100'}};
 const buy=await session.execute(request);expect(buy.status).toBe('committed');if(buy.status!=='committed')throw Error('Missing Buy Original');
 f.at(14017492000123n);
 const sell=await session.execute({operationId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',action:{kind:'sell',marketItemId:'asset:held',shareQuantityMicro:'100000'}});expect(sell.status).toBe('committed');if(sell.status!=='committed')throw Error('Missing Sell Original');
 expect(buy.operation.effect.executionPriceUsdCents).toBe('1030149');expect(sell.operation.effect.executionPriceUsdCents).not.toBe('100');expect(sell.operation.atKaiUPulse).toBe('14017492000123');expect(f.requests).toHaveLength(0);
 f.at(18000000000123n);expect(await session.execute(request)).toEqual(buy);
 f.connect();expect((await session.flush()).status).toBe('published');
 const originals=f.requests.flatMap(batch=>batch.originals).map(row=>JSON.parse(new TextDecoder().decode(f.runtime.decode(row.artifactBytesB64u))));
 expect(originals.map(row=>row.effect.executionPriceUsdCents)).toEqual([buy.operation.effect.executionPriceUsdCents,sell.operation.effect.executionPriceUsdCents]);expect(originals.map(row=>row.atKaiUPulse)).toEqual([buy.operation.atKaiUPulse,sell.operation.atKaiUPulse]);session.dispose();
});


it('uses finite quantity rights with dynamic prices and keeps Send independent of a refused Buy',async()=>{
 const f=await localFinancialFixture({dynamicMarket:true,growth:true,quantityMarket:'1'}),session=await createLocalFinancialSession(f.options);
 await expect(session.execute({operationId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',action:{kind:'buy',marketItemId:'asset:held',amountUsdCents:'100'}})).rejects.toThrow('ACCOUNT_FINANCIAL_BUY_CAPACITY');
 expect((await session.current()).state.sequence).toBe('0');
 const sent=await session.execute({operationId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',action:{kind:'send',recipientUserId:'33333333-3333-4333-8333-333333333333',conversationId:'44444444-4444-4444-8444-444444444444',amountUsdCents:'100'}});
 expect(sent.status).toBe('committed');expect(f.requests).toHaveLength(0);
 f.connect();expect((await session.flush()).status).toBe('published');expect(f.requests.flatMap(batch=>batch.originals)).toHaveLength(1);session.dispose();
});

it('consumes and restores quantity rights once while retaining the original pulse and exact dynamic Buy/Sell prices',async()=>{
 const f=await localFinancialFixture({dynamicMarket:true,growth:true,quantityMarket:'2000000'}),session=await createLocalFinancialSession(f.options);
 const request={operationId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',action:{kind:'buy' as const,marketItemId:'asset:held',amountUsdCents:'100'}};
 const buy=await session.execute(request);expect(buy.status).toBe('committed');if(buy.status!=='committed')throw Error('Missing Buy Original');
 const next=JSON.parse(JSON.stringify(buy.operation.nextState));expect(next.marketCapacity[0].buyShareQuantityMicro).toBe(String(2000000n-BigInt(String(buy.operation.effect.shareQuantityMicro))));
 f.at(14017492000123n);
 const sell=await session.execute({operationId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',action:{kind:'sell',marketItemId:'asset:held',shareQuantityMicro:String(buy.operation.effect.shareQuantityMicro)}});expect(sell.status).toBe('committed');if(sell.status!=='committed')throw Error('Missing Sell Original');
 expect(JSON.parse(JSON.stringify(sell.operation.nextState)).marketCapacity[0].buyShareQuantityMicro).toBe('2000000');
 f.at(18000000000123n);expect(await session.execute(request)).toEqual(buy);expect(f.requests).toHaveLength(0);
 f.connect();expect((await session.flush()).status).toBe('published');
 const originals=f.requests.flatMap(batch=>batch.originals).map(row=>JSON.parse(new TextDecoder().decode(f.runtime.decode(row.artifactBytesB64u))));
 expect(originals.map(row=>row.atKaiUPulse)).toEqual([buy.operation.atKaiUPulse,sell.operation.atKaiUPulse]);expect(originals.map(row=>row.effect.executionPriceUsdCents)).toEqual([buy.operation.effect.executionPriceUsdCents,sell.operation.effect.executionPriceUsdCents]);
 const count=f.requests.length;await session.flush();expect(f.requests).toHaveLength(count);session.dispose();
});

it('uses the full verified growing wallet within finite share rights without freezing a preparation-time dollar ceiling',async()=>{
 const restricted=await localFinancialFixture({dynamicMarket:true,growth:true,quantityMarket:'2000000'}),limited=await createLocalFinancialSession(restricted.options);
 await expect(limited.execute({operationId:'f1111111-1111-4111-8111-111111111111',action:{kind:'buy',marketItemId:'asset:held',amountUsdCents:'25000'}})).rejects.toThrow('ACCOUNT_FINANCIAL_BUY_CAPACITY');limited.dispose();
 const f=await localFinancialFixture({dynamicMarket:true,growth:true,quantityMarket:'2000000',fullGrowthBudget:true}),session=await createLocalFinancialSession(f.options);
 const opening=await session.wallet();f.at(14017492000123n);const current=await session.wallet();expect(BigInt(current.availableUsdCents)).toBeGreaterThan(BigInt(opening.availableUsdCents));
 const buy=await session.execute({operationId:'f2222222-2222-4222-8222-222222222222',action:{kind:'buy',marketItemId:'asset:held',amountUsdCents:'25000'}});expect(buy.status).toBe('committed');if(buy.status!=='committed')throw Error('Missing Buy Original');
 expect(BigInt(String(buy.operation.effect.shareQuantityMicro))).toBeLessThan(2000000n);expect(buy.operation.atKaiUPulse).toBe('14017492000124');expect(f.requests).toHaveLength(0);
 f.connect();expect((await session.flush()).status).toBe('published');expect(f.requests.flatMap(batch=>batch.originals)).toHaveLength(1);session.dispose();
});

it('shares immutable cryptographic setup while isolating each scenario financial state and exact originals',async()=>{
 const first=await localFinancialFixture(),second=await localFinancialFixture();
 expect(first.runtime.admitReceizAccountFinancialSource).toBe(second.runtime.admitReceizAccountFinancialSource);
 expect(first.options.store).not.toBe(second.options.store);expect(first.originals).not.toBe(second.originals);
 const sender=await createLocalFinancialSession(first.options),untouched=await createLocalFinancialSession(second.options);
 const before=await untouched.current(),retainedBefore=new Map(second.originals);
 try{
  expect((await sender.execute({operationId:'f3333333-3333-4333-8333-333333333333',action:{kind:'send',recipientUserId:'33333333-3333-4333-8333-333333333333',conversationId:'44444444-4444-4444-8444-444444444444',amountUsdCents:'100'}})).status).toBe('committed');
  expect(await untouched.current()).toEqual(before);expect(first.originals.size).toBeGreaterThan(retainedBefore.size);expect(second.originals).toEqual(retainedBefore);
  expect(first.requests).toHaveLength(0);expect(second.requests).toHaveLength(0);
 }finally{sender.dispose();untouched.dispose();}
});

it('keeps local sealing distinct from received status and never asks the network to inspect that status',async()=>{
 const f=await localFinancialFixture(),session=await createLocalFinancialSession(f.options);
 const result=await session.execute({operationId:'f4444444-4444-4444-8444-444444444444',action:{kind:'send',recipientUserId:'33333333-3333-4333-8333-333333333333',conversationId:'44444444-4444-4444-8444-444444444444',amountUsdCents:'100'}});
 expect(result.status).toBe('committed');expect(await session.received('f4444444-4444-4444-8444-444444444444')).toBeNull();expect(f.requests).toHaveLength(0);
 f.connect();expect((await session.flush()).status).toBe('published');const count=f.requests.length;
 expect(await session.received('f4444444-4444-4444-8444-444444444444')).toBeNull();expect(f.requests).toHaveLength(count);session.dispose();
});

it('retains the verified received proof on reconnect and reopens it offline with both original and accepted Kai',async()=>{
 const f=await localFinancialFixture({receivedProof:true}),session=await createLocalFinancialSession(f.options);
 const id='f5555555-5555-4555-8555-555555555555',result=await session.execute({operationId:id,action:{kind:'send',recipientUserId:'33333333-3333-4333-8333-333333333333',conversationId:'44444444-4444-4444-8444-444444444444',amountUsdCents:'100'}});
 expect(result.status).toBe('committed');if(result.status!=='committed')throw Error('Fixture send');
 expect(await session.received(id)).toBeNull();expect(f.requests).toHaveLength(0);f.connect();expect((await session.flush()).status).toBe('published');
 const proof=await session.received(id);expect(proof?.schema).toBe('receiz.account-financial-receipt.v2');expect(proof?.atKaiUPulse).toBe(result.operation.atKaiUPulse);expect(BigInt(proof!.receivedAtKaiUPulse)).toBeGreaterThan(BigInt(proof!.atKaiUPulse));expect(proof?.financialOriginalSha256).toBe(result.operation.artifactSha256);
 const requestCount=f.requests.length;session.dispose();const cold=await createLocalFinancialSession({...f.options,online:()=>false});
 expect(await cold.received(id)).toEqual(proof);expect(await cold.resolve(id)).toEqual(result);expect(f.requests).toHaveLength(requestCount);cold.dispose();
});

it('keeps a locally sealed Send pending when delivery lacks its genuine received proof',async()=>{
 const f=await localFinancialFixture({receivedProof:true}),publish=f.options.publish,session=await createLocalFinancialSession({...f.options,publish:async batch=>({...await publish(batch) as object,schema:'receiz.account-financial-publication-ack.v2',received:[{operationId:batch.originals[0].operationId,receiptOriginalB64u:'AA'}]})});
 const id='f6666666-6666-4666-8666-666666666666',sent=await session.execute({operationId:id,action:{kind:'send',recipientUserId:'33333333-3333-4333-8333-333333333333',conversationId:'44444444-4444-4444-8444-444444444444',amountUsdCents:'100'}});
 expect(sent.status).toBe('committed');f.connect();expect((await session.flush()).status).toBe('pending');expect(await session.received(id)).toBeNull();expect(await session.resolve(id)).toEqual(sent);session.dispose();
});
