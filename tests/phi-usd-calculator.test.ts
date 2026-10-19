import { expect, it, vi } from 'vitest';
import { calculatePhiUsd } from '../src/value-explainer/phi-usd';
import { historicalWalletUsdRate } from '../src/receiz/historical-wallet';

it.each([
 ['0','0','0','4429539340','0'],
 ['1','0','1000000','4429539340','4430'],
 ['1','1000000','1000000','4739393994','4739'],
 ['0.000001','0','1','4429539340','0'],
 ['1.234567','14692714000000','1234567','9079009810','11209'],
])('converts %s Phi at %s with the exact wallet rate and SDK integer rounding', (amount, kai, micro, rate, cents) => {
 const result=calculatePhiUsd(amount,kai);
 expect(result).toMatchObject({amountPhiMicro:micro,valuationKaiUPulse:kai,usdPerPhiMicrocents:rate,usdCents:cents,sdkVersion:'129.0.0',writesPerformed:0});
 expect(result.usdPerPhiMicrocents).toBe(historicalWalletUsdRate(kai));
 expect(result.trace.denominator).toBe('1000000000000');expect(result.trace.halfDenominator).toBe('500000000000');
});
it('preserves amount precision beyond Number and is independent of call order, clock and network', () => {
 vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});vi.spyOn(Date,'now').mockImplementation(()=>{throw Error('CLOCK_FORBIDDEN');});
 try { const first=calculatePhiUsd('9007199254.740993','1000000');calculatePhiUsd('1','14692714000000');expect(first.amountPhiMicro).toBe('9007199254740993');expect(calculatePhiUsd('9007199254.740993','1000000')).toEqual(first);expect(JSON.parse(JSON.stringify(first))).toEqual(first); }
 finally {vi.unstubAllGlobals();vi.restoreAllMocks();}
});
it.each(['-1','1e3','1,000','01','1.0000001','','Infinity','9'.repeat(121)])('rejects an ambiguous or unsupported Phi amount %s', amount => {
 expect(()=>calculatePhiUsd(amount,'1000000')).toThrow();
});
it.each(['-1','01','1.1','9007199254740992000000',''])('rejects an invalid or inexact whole-pulse coordinate %s', coordinate => {
 expect(()=>calculatePhiUsd('1',coordinate)).toThrow();
});
it('uses the whole Kai pulse throughout each exact micro-pulse interval', () => {
 expect(calculatePhiUsd('1','14692714000001').usdPerPhiMicrocents).toBe('9079009810');
 expect(calculatePhiUsd('1','14692714999999').usdPerPhiMicrocents).toBe('9079009810');
 expect(calculatePhiUsd('1','14692715000000').valuationKaiPulse).toBe('14692715');
});
