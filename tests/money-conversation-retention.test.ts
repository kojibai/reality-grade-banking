import {expect,it,vi} from 'vitest';
import {existsSync} from 'node:fs';
import type {MoneyQuestion} from '../src/receiz/money-conversation';
import type {MoneyReceipt} from '../src/receiz/money-workspace';
const accountUid='10000000-0000-4000-8000-000000000001',identityDigest='a'.repeat(64),humanRequestId='human-root-0001',humanText='List what is due this week.';
async function question():Promise<MoneyQuestion>{
 const action={tool:'money_list_commitments',args:{direction:'payable'}},fingerprint=JSON.stringify(action),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint)))].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,24);
 const receipt:MoneyReceipt={id:humanRequestId+':'+hash,tool:action.tool,status:'accepted',summary:'Your tracked commitments.',data:{sourceDigest:'b'.repeat(64),transactions:[{description:'x'.repeat(40000),amountUsdCents:'12500'}]}};
 return{message:humanText,requestId:'generation-0002',quoteExpiresAt:'2020-01-01T00:00:00.000Z',moneyTools:true,moneyTask:{humanRequestId,humanText,step:1,receipts:[receipt],completed:{[fingerprint]:receipt}},moneyContext:{schema:'bank.money-tool-results.v1',ownerUid:accountUid,results:JSON.stringify([{id:receipt.id,tool:receipt.tool,status:receipt.status,summary:receipt.summary,data:{sourceDigest:receipt.data!.sourceDigest}}])}};
}
async function fixture(initial:unknown=null){
 expect(existsSync('src/receiz/money-conversation-retention.ts')).toBe(true);
 const {createMoneyConversationRetention}=await import('../src/receiz/money-conversation-retention');let saved=initial,open=true,tail=Promise.resolve();
 const store={read:vi.fn(async()=>structuredClone(saved)),write:vi.fn(async(next:unknown,expected:unknown)=>{if(JSON.stringify(saved)!==JSON.stringify(expected))throw Error('INTENT_CHANGED');saved=structuredClone(next);})};
 const api=createMoneyConversationRetention({accountUid,identityDigest,assertOpen(){if(!open)throw Error('IDENTITY_CLOSED');},store,lock<T>(work:()=>Promise<T>){const next=tail.then(work);tail=next.then(()=>{},()=>{});return next;}});
 return{api,store,saved:()=>saved,close:()=>{open=false;}};
}
it('retains the complete same-owner continuation, original human root and exact completed tool receipts',async()=>{
 const f=await fixture(),q=await question();await f.api.checkpoint(q);const restored=await f.api.recoverQuestion();expect(restored).toEqual(q);expect(JSON.stringify(restored)).toContain('x'.repeat(40000));
 (restored!.moneyTask!.receipts[0].data!.transactions as any[])[0].description='changed';expect(await f.api.recoverQuestion()).toEqual(q);
 expect(f.store.write).toHaveBeenCalledOnce();expect(f.saved()).toMatchObject({schema:'bank.money-conversation.v1',identityDigest,accountUid,revision:1});
});
it('holds credit-paused recovery without granting approval or automatically changing the generation request',async()=>{
 const f=await fixture(),q={...await question(),moneyPaused:'credits' as const};await f.api.checkpoint(q);expect(await f.api.recoverQuestion()).toEqual(q);
 expect((await f.api.recoverQuestion())!.requestId).toBe('generation-0002');expect(f.store.write).toHaveBeenCalledOnce();
});
it('clears only the accepted conversation checkpoint under exact owner and compare-and-swap state',async()=>{
 const f=await fixture();await f.api.checkpoint(await question());await f.api.checkpoint(null);expect(await f.api.recoverQuestion()).toBeNull();expect(f.saved()).toMatchObject({question:null,revision:2});
});
it('refuses foreign account or identity envelopes rather than importing or clearing them',async()=>{
 const q=await question();for(const changed of [{accountUid:'foreign'},{identityDigest:'c'.repeat(64)}]){const f=await fixture({schema:'bank.money-conversation.v1',accountUid,identityDigest,revision:1,question:q,...changed});await expect(f.api.recoverQuestion()).rejects.toThrow('MONEY_CONVERSATION_OWNER_MISMATCH');await expect(f.api.checkpoint(null)).rejects.toThrow('MONEY_CONVERSATION_OWNER_MISMATCH');expect(f.store.write).not.toHaveBeenCalled();}
});
it('rejects changed human roots, foreign contexts and arbitrary approval or runtime fields without overwriting the held question',async()=>{
 const f=await fixture(),q=await question();await f.api.checkpoint(q);
 const changes:any[]=[{message:'send it'},{moneyTools:false},{businessSetup:'true'},{approved:true},{signal:new AbortController().signal},{onDelta:()=>{}},{moneyPaused:'resume'},{moneyContext:{schema:'bank.money-tool-results.v1',ownerUid:'foreign',results:'[]'}},{context:{schema:'receiz.owner-twin.context.v1',ownerUid:'foreign',disclosure:'owner-approved-for-this-request',records:[]}}];
 for(const change of changes)await expect(f.api.checkpoint({...q,...change})).rejects.toThrow('MONEY_CONVERSATION_INVALID');
 expect(await f.api.recoverQuestion()).toEqual(q);expect(f.store.write).toHaveBeenCalledOnce();
});
it('rejects incomplete or contradictory completed fingerprints and receipt relationships',async()=>{
 const q=await question(),key=Object.keys(q.moneyTask!.completed)[0],mutations:((v:any)=>void)[]=[v=>delete v.moneyTask.completed[key],v=>v.moneyTask.completed[key].tool='money_send_reviewed',v=>v.moneyTask.humanRequestId='another-human-root',v=>v.moneyTask.receipts[0].id='different',v=>v.moneyTask.completed[key].status='paid',v=>v.moneyTask.receipts.push(v.moneyTask.receipts[0]),v=>v.moneyTask.completed['{"tool":"transfer_money","args":{}}']=v.moneyTask.receipts[0]];
 for(const mutate of mutations){const f=await fixture(),changed=structuredClone(q);mutate(changed);await expect(f.api.checkpoint(changed)).rejects.toThrow('MONEY_CONVERSATION_INVALID');expect(f.store.write).not.toHaveBeenCalled();}
});
it('rejects non-JSON receipt material rather than silently stripping any retained field',async()=>{
 const q=await question();for(const invalid of [()=>{},Infinity,undefined]){const f=await fixture(),changed=structuredClone(q);changed.moneyTask!.receipts[0].data!.extra=invalid;await expect(f.api.checkpoint(changed)).rejects.toThrow('MONEY_CONVERSATION_INVALID');expect(f.store.write).not.toHaveBeenCalled();}
});
it('serializes concurrent checkpoint and clear operations through the existing supplied lock',async()=>{
 const f=await fixture(),q=await question();await Promise.all([f.api.checkpoint(q),f.api.checkpoint(null)]);expect(await f.api.recoverQuestion()).toBeNull();expect(f.saved()).toMatchObject({revision:2});f.close();await expect(f.api.checkpoint(q)).rejects.toThrow('IDENTITY_CLOSED');await expect(f.api.recoverQuestion()).rejects.toThrow('IDENTITY_CLOSED');
});
it('retains the actual Bank dual money and business tool opt-ins without turning them into approval',async()=>{const f=await fixture(),q={...await question(),businessSetup:true};await f.api.checkpoint(q);expect(await f.api.recoverQuestion()).toEqual(q);});
it('preserves independent paused tasks by exact owner thread when another chat is accepted',async()=>{
 const f=await fixture(),legacy=`api:${accountUid}`,thread=`api:${accountUid}:20000000-0000-4000-8000-000000000001`,first={...await question(),threadKey:legacy,moneyPaused:'credits'as const},second={...await question(),threadKey:thread,requestId:'generation-0003'};
 await f.api.checkpoint(first);await f.api.checkpoint(second);expect(await f.api.recoverQuestion(legacy)).toEqual(first);expect(await f.api.recoverQuestion(thread)).toEqual(second);
 await f.api.checkpoint(null,thread);expect(await f.api.recoverQuestion(thread)).toBeNull();expect(await f.api.recoverQuestion(legacy)).toEqual(first);await expect(f.api.recoverQuestion('api:foreign')).rejects.toThrow('MONEY_CONVERSATION_OWNER_MISMATCH');
});
it('recovers a surviving unsubmitted conversation by default after another thread is accepted and cleared',async()=>{
 const f=await fixture(),a=`api:${accountUid}`,b=`api:${accountUid}:20000000-0000-4000-8000-000000000001`,first={...await question(),threadKey:a,moneyPaused:'credits'as const},second={...await question(),threadKey:b,requestId:'generation-0004'};
 await f.api.checkpoint(first);await f.api.checkpoint(second);await f.api.checkpoint(null,b);const reopened=await fixture(f.saved());expect(await reopened.api.recoverQuestion()).toEqual(first);expect(await reopened.api.retainedThreads?.()).toMatchObject([{threadKey:a,title:first.message}]);
});
