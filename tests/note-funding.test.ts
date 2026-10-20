import {expect,it} from 'vitest';
import {selectNoteFunding} from '../src/receiz/note-funding';
const quote={reserveUsdCents:'500',balancePhiMicro:'20000000',settlementPhiMicro:'15000000',usdPerPhiMicrocents:'100000000'};
it('uses only Reserve when it covers the amount, and only Settlement when Reserve is empty',()=>{
 expect(selectNoteFunding('200',quote)).toMatchObject({rail:'reserve',amountUsdCents:'200'});
 expect(selectNoteFunding('200',{...quote,reserveUsdCents:'0',settlementPhiMicro:'20000000'})).toMatchObject({rail:'settlement',amountPhiMicro:'2000000'});
});
it('uses all available Reserve first and binds the exact Settlement remainder in one Note',()=>{
 expect(selectNoteFunding('700',quote)).toEqual({rail:'composite',amountUsdCents:'700',amountPhiMicro:'7000000',fundingParts:{reserve:{amountUsdCents:'500',amountPhiMicro:'5000000'},settlement:{amountUsdCents:'200',amountPhiMicro:'2000000'}}});
});
it('allocates the original Reserve backing rather than repricing it at the current Settlement rate',()=>{
 expect(selectNoteFunding('700',{...quote,balancePhiMicro:'18000000'})).toMatchObject({rail:'composite',amountPhiMicro:'5000000',fundingParts:{reserve:{amountUsdCents:'500',amountPhiMicro:'3000000'},settlement:{amountUsdCents:'200',amountPhiMicro:'2000000'}}});
});
it('refuses insufficient or inconsistent funding before an authorization or debit',()=>{
 expect(()=>selectNoteFunding('2100',quote)).toThrow('BANK_NOTE_INSUFFICIENT_FUNDS');
 expect(()=>selectNoteFunding('200',{...quote,settlementPhiMicro:'21000000'})).toThrow('BANK_NOTE_QUOTE_INVALID');
 expect(()=>selectNoteFunding('200',{...quote,reserveUsdCents:'0'})).toThrow('BANK_NOTE_QUOTE_INVALID');
});
