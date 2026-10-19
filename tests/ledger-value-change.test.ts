import {expect,it} from 'vitest';
import {ledgerValueChange} from '../src/features/ledger/LedgerValueChange';
const before={basis:'card-snapshot' as const,amountUsdCents:'1200',pulse:'100',considerationUsdCents:null};
const live=(amountUsdCents:string,pulse='200')=>({basis:'live-model' as const,amountUsdCents,pulse,considerationUsdCents:null});
it('uses the exact transfer value as the return basis for upward, downward and flat moves',()=>{
 expect(ledgerValueChange(before,live('3400'))).toEqual({direction:'up',deltaUsdCents:'2200',percent:'+183.33%'});
 expect(ledgerValueChange(before,live('500'))).toEqual({direction:'down',deltaUsdCents:'-700',percent:'−58.33%'});
 expect(ledgerValueChange(before,live('1200'))?.percent).toBe('0.00%');
});
it('handles exact large integers, zero basis, non-asset payments and reversed coordinates',()=>{
 expect(ledgerValueChange({...before,amountUsdCents:'100000000000000000000000'},live('112500000000000000000000'))?.percent).toBe('+12.50%');
 expect(ledgerValueChange({...before,amountUsdCents:'0'},live('300'))?.percent).toBeNull();
 expect(ledgerValueChange({...before,basis:'payment'},live('300'))).toBeNull();
 expect(ledgerValueChange(before,live('300','90'))).toBeNull();
});
