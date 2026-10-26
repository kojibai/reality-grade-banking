import {expect,it} from 'vitest';
import {circulationExample,dieselReference} from '../public/learn/economy-model.mjs';
it('derives familiar dollar prices from the dated public EIA series without minting value',()=>{
 expect(dieselReference.usdMillsPerGallon).toBe(6276);expect(dieselReference.period).toBe('2026-10-19');
 const first=circulationExample(100,0);expect(first.billCents).toBe(62760);expect(first.grossPaymentsCents).toBe(0);expect(first.balancesCents).toEqual([62760,0,0,0]);
 for(let step=0;step<=4;step++){const result=circulationExample(100,step);expect(result.balancesCents.reduce((a,b)=>a+b,0)).toBe(62760);expect(result.grossPaymentsCents).toBe(step*62760);expect(result.valueCreatedCents).toBe(0);}
 expect(circulationExample(100,4).balancesCents).toEqual(first.balancesCents);expect(circulationExample(100,4).grossPaymentsCents).toBe(251040);
});
it('keeps exact cents, distinct stages and supported input bounds in the illustration',()=>{
 expect(circulationExample(10,1).billCents).toBe(6276);expect(circulationExample(11,2).billCents).toBe(6904);expect(circulationExample(500,4).billCents).toBe(313800);
 for(const args of [[0,0],[501,0],[10.5,0],[100,-1],[100,5],[NaN,0],[100,NaN]])expect(()=>circulationExample(...args as [number,number])).toThrow('ILLUSTRATIVE_INPUT_INVALID');
});
