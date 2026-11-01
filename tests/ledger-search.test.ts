import {expect,it} from 'vitest';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {groupLedgerPaymentRecords} from '../src/receiz/ledger-payment-records';
import {filterLedgerGroups} from '../src/receiz/ledger-search';
const records=()=>parsePublicNetworkPage('actions',{ok:true,actions:[
 {id:'one',actionKind:'market.share.sell',summary:'Blue Horizon',createdAt:'2026-10-20T12:00:00Z',assetTrade:{side:'sell',title:'Blue Horizon',settlementUsdCents:'5000000',shareQuantityMicro:'2500000'},amountUsdCents:'5000000'},
 {id:'two',actionKind:'contacts.import',summary:'People imported',createdAt:'2026-10-19T12:00:00Z'},
]}).records;
it('filters every carried field locally, including amounts, type, dates and references, while preserving order',()=>{
 const groups=groupLedgerPaymentRecords(records());
 expect(filterLedgerGroups(groups,'')).toBe(groups);
 for(const query of ['blue horizon','asset sale','$50,000.00','2026-10-20','one'])expect(filterLedgerGroups(groups,query)).toEqual([groups[0]]);
 expect(filterLedgerGroups(groups,'people imported')).toEqual([groups[1]]);
 expect(filterLedgerGroups(groups,'blue missing')).toEqual([]);
 expect(filterLedgerGroups(groups,'2026')).toEqual(groups);
});
it('reuses carried search documents and never reads binary proof contents or changes source rows',()=>{
 const [record]=records();let reads=0;
 Object.defineProperty(record,'detail',{get(){reads++;return 'Searchable one-time detail';},enumerable:true});
 const groups=groupLedgerPaymentRecords([record]);filterLedgerGroups(groups,'');expect(reads).toBe(0);
 expect(filterLedgerGroups(groups,'searchable')).toHaveLength(1);const first=reads;
 expect(filterLedgerGroups(groups,'detail')).toHaveLength(1);expect(reads).toBe(first);expect(groups[0].record).toBe(record);
});
