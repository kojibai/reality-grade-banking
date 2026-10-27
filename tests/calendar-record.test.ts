import {expect,it} from 'vitest';
import {calendarRecord,calendarEventTitle} from '../src/receiz/calendar-record';
import type {OrganizerEvent} from '../src/receiz/organizer-types';
import type {PublicRecord} from '../src/receiz/public-network';
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
const event:OrganizerEvent={id:'00000000-0000-4000-8000-000000000003',ownerUserId:owner,title:'Market share sell',kind:'traction',source:'system',startAt:'2026-10-26T15:00:00Z',endAt:'2026-10-26T15:10:00Z',location:'',note:'',attendees:[],createdAt:'2026-10-26T15:00:00Z',updatedAt:'2026-10-26T15:00:00Z',metadata:{actionKind:'market.share.sell',ledgerEntryId:'entry-1',entryHash:'a'.repeat(64),pulse:'100',title:'A source object',side:'sell',marketItemId:'asset-1',shareQuantityMicro:'2000000',priceUsdCents:'300',settlementUsdCents:'590',feeUsdCents:'10',realizedCostBasisUsdCents:'400'}};
it('uses recorded asset-sale facts and original pulse without any live pricing input',()=>{
 const row=calendarRecord(event,owner,[])!;expect(calendarEventTitle(event,owner)).toBe('Asset Sale');expect(row.amountUsdCents).toBe('590');expect(row.pulse).toBe('100');expect(row.details?.assetTrade).toMatchObject({side:'sell',title:'A source object',realizedCostBasisUsdCents:'400'});
});
it('reuses one exact held ledger record by reference, including its funding history',()=>{
 const held={...calendarRecord(event,owner,[])!,authority:'account-source-projection',details:{fundingTransferId:'transfer-1'}} as PublicRecord;
 expect(calendarRecord(event,owner,[held])).toBe(held);
 expect(calendarRecord(event,owner,[held,{...held,id:'another'}])).not.toBe(held);
 expect(calendarRecord(event,other,[held])).toBeNull();
});
it('labels transfers relative to this owner and never joins on amount or title alone',()=>{
 const transfer={...event,metadata:{actionKind:'wallet.transfer.connect',transferId:'transfer-1',senderUserId:other,recipientUserId:owner,amountUsdCents:'2700',amountPhiMicro:'800',pulse:123}};
 expect(calendarEventTitle(transfer,owner)).toBe('Money Received');expect(calendarRecord(transfer,owner,[])?.accountFlow).toBe('in');
 const held={...calendarRecord(transfer,owner,[])!,id:'wallet:unrelated',sourceId:'unrelated',evidence:{transferId:'different'}};expect(calendarRecord(transfer,owner,[held])).not.toBe(held);
});
it('uses native wallet Market kinds and keeps generated transport payloads out of visible Calendar notes',async()=>{
 const {calendarEventNote}=await import('../src/receiz/calendar-labels');const native={...event,metadata:{...event.metadata,actionKind:'receiz.wallet.market_sell'},note:'The asset was sold.\nRoute: /api/market\nEntry hash: abc\nDetails: {"candidate":"private machine payload"}'};
 expect(calendarEventTitle(native)).toBe('Asset Sale');expect(calendarRecord(native,owner,[])?.amountUsdCents).toBe('590');expect(calendarEventNote(native)).toBe('The asset was sold.');expect(calendarEventNote({...native,source:'manual'})).toBe(native.note);
});
