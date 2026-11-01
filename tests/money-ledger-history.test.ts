import {expect,it,vi} from 'vitest';
import {createMoneyLedgerHistory} from '../src/receiz/money-ledger-history';
import {parsePrivateHistoryPage} from '../src/receiz/private-history';
import type {PrivateHistoryCache} from '../src/receiz/identity-vault';

function cache():PrivateHistoryCache{
 const page=parsePrivateHistoryPage({ok:true,accountUserId:'owner',nextCursor:'older',events:[
  {id:'sent',kind:'chat_transfer',direction:'debit',summary:'Studio rent',createdAt:'2026-11-01T12:00:00Z',amountUsdCents:'12500',sender:{userId:'owner',username:'me'},recipient:{userId:'peer',username:'studio'}},
  {id:'credit',kind:'reserve_credit',summary:'Card funding',createdAt:'2026-11-01T13:00:00Z',amountUsdCents:'20000'},
 ]},'owner');
 return{schema:'bank.private-history-cache.v1',accountUid:'owner',observedAt:'2026-11-01T13:00:00Z',records:page.records,nextCursor:page.nextCursor,pages:[{cursor:null,json:page.sourceJson}]};
}
it('explains the existing same-account Ledger without requesting a separate account-proof statement',async()=>{
 const held=cache(),read=vi.fn(),save=vi.fn();
 const history=createMoneyLedgerHistory({accountUid:'owner',assertOpen(){},retained:async()=>held,read,remember:save});
 const result=await history.search({query:'studio',direction:'out'});
 expect(result.authority).toBe('authenticated-account-history');
 expect(result.transactions).toHaveLength(1);expect(result.transactions[0].description).toContain('Studio rent');
 expect(result.coverage).toMatchObject({complete:false,hasMore:true,loadedRecordCount:2});
 expect(result).not.toHaveProperty('sourceDigest');expect(read).not.toHaveBeenCalled();expect(save).not.toHaveBeenCalled();
});
it('shares one first history read and reuses its parsed result for subsequent tool queries',async()=>{
 const held=cache();let current:PrivateHistoryCache|null=null;
 const read=vi.fn(async()=>parsePrivateHistoryPage(JSON.parse(held.pages![0].json),'owner'));
 const history=createMoneyLedgerHistory({accountUid:'owner',assertOpen(){},retained:async()=>current,read,remember(value){current=value;}});
 const [one,two]=await Promise.all([history.search({}),history.search({query:'studio'})]);
 expect(one.transactions).toHaveLength(2);expect(two.transactions).toHaveLength(1);expect(read).toHaveBeenCalledOnce();
 await history.search({direction:'in'});expect(read).toHaveBeenCalledOnce();
});
it('keeps account isolation, exact recorded amounts, explicit coverage and genuine read failures',async()=>{
 const held=cache(),read=vi.fn();
 const foreign=createMoneyLedgerHistory({accountUid:'other',assertOpen(){},retained:async()=>held,read,remember(){}});
 await expect(foreign.search({})).rejects.toThrow('MONEY_SOURCE_OWNER_MISMATCH');expect(read).not.toHaveBeenCalled();
 const history=createMoneyLedgerHistory({accountUid:'owner',assertOpen(){},retained:async()=>held,read,remember(){}});
 const result=await history.search({limit:1});expect(result.transactions[0].amountUsdCents).toBe('20000');expect(result.nextOffset).toBe(1);
 await expect(history.search({limit:0})).rejects.toThrow('MONEY_QUERY_INVALID');
 const unavailable=createMoneyLedgerHistory({accountUid:'owner',assertOpen(){},retained:async()=>null,read:async()=>{throw Error('PRIVATE_HISTORY_READ_UNAVAILABLE');},remember(){}});
 await expect(unavailable.search({})).rejects.toThrow('PRIVATE_HISTORY_READ_UNAVAILABLE');
});
it('advances filtered searches through older pages even when the current page has no matches',async()=>{
 let current=cache();const read=vi.fn(async(cursor?:string)=>{expect(cursor).toBe('older');return parsePrivateHistoryPage({ok:true,accountUserId:'owner',nextCursor:null,events:[{id:'old-rent',kind:'reserve_credit',summary:'Earlier rent',createdAt:'2026-10-01T12:00:00Z',amountUsdCents:'35000'}]},'owner');});
 const history=createMoneyLedgerHistory({accountUid:'owner',assertOpen(){},retained:async()=>current,read,remember:value=>{current=value;}});
 const first=await history.search({query:'earlier'});expect(first.transactions).toEqual([]);expect(first.nextOffset).toBeGreaterThan(0);
 const next=await history.search({query:'earlier',offset:first.nextOffset!});expect(next.transactions).toHaveLength(1);expect(next.transactions[0].amountUsdCents).toBe('35000');expect(next.nextOffset).toBeNull();expect(read).toHaveBeenCalledOnce();
});
it('does not report locally retained Note receipts as a complete authenticated Ledger read',async()=>{
 const notes={...cache(),pages:undefined,nextCursor:null};const read=vi.fn(async()=>parsePrivateHistoryPage({ok:true,accountUserId:'owner',nextCursor:'older',events:[]},'owner'));
 const history=createMoneyLedgerHistory({accountUid:'owner',assertOpen(){},retained:async()=>notes,read,remember(){}});
 expect((await history.search({})).coverage).toMatchObject({complete:false,hasMore:true});expect(read).toHaveBeenCalledOnce();
});
it('keeps the source scan position when a later page groups an execution under its transfer',async()=>{
 const base=cache().records[0],execution={...base,id:'execution',sourceId:'execution',source:'actions' as const,kind:'wallet.transfer.connect',title:'Execution',detail:'Execution recorded',time:'2026-11-01T13:00:00Z',amountUsdCents:'12500',evidence:{transferId:'same-payment'}},credit={...base,id:'credit',sourceId:'credit',kind:'reserve_credit',title:'Funding',detail:'Funding recorded',time:'2026-11-01T12:00:00Z',evidence:{}};
 let current:PrivateHistoryCache={...cache(),records:[execution,credit]};
 const movement={...base,id:'movement',sourceId:'movement',kind:'transfer',title:'Earlier rent',detail:'Earlier rent',time:'2026-11-01T11:00:00Z',amountUsdCents:'12500',evidence:{transferId:'same-payment'}};
 const read=vi.fn(async()=>({accountUid:'owner',records:[movement],nextCursor:null,origin:'private-account' as const,sourceJson:JSON.stringify({ok:true,accountUserId:'owner',events:[],nextCursor:null})}));
 const history=createMoneyLedgerHistory({accountUid:'owner',assertOpen(){},retained:async()=>current,read,remember:value=>{current=value;}});
 const first=await history.search({query:'earlier'}),second=await history.search({query:'earlier',offset:first.nextOffset!});
 expect(second.transactions).toHaveLength(1);expect(second.transactions[0].transactionId).toBe('movement');expect(second.nextOffset).toBeNull();
});
