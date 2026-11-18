import{expect,it}from'vitest';

import{pickPublicMarketPricingCatalog}from'../src/receiz/market-projection/pricing-inputs';
import{buildMarketHistory}from'../src/receiz/market-projection/build-history';
import{fixture,pulse}from'./helpers/market-history-original-addition-fixture';
it('preserves complete histories through Original addition and withdrawal using the same retained numeric operands',async()=>{
 const{source,before,after}=fixture(),pricingBefore=pickPublicMarketPricingCatalog(before),pricingAfter=pickPublicMarketPricingCatalog(after);
 const initial=await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:before,pulse,capitalization:true});
 const numericInitial=await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:pricingBefore,pulse,capitalization:true});expect(numericInitial).toEqual(initial);
 const added=await buildMarketHistory(source,initial,()=>true,async()=>{},{catalog:after,pulse,capitalization:true,priorInput:{source,catalog:before}});
 const numericAdded=await buildMarketHistory(source,numericInitial,()=>true,async()=>{},{catalog:pricingAfter,pulse,capitalization:true,priorInput:{source,catalog:pricingBefore}});expect(numericAdded).toEqual(added);
 const removed=await buildMarketHistory(source,added,()=>true,async()=>{},{catalog:before,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:after}});
 const numericRemoved=await buildMarketHistory(source,numericAdded,()=>true,async()=>{},{catalog:pricingBefore,pulse:pulse+1,capitalization:true,priorInput:{source,catalog:pricingAfter}});expect(numericRemoved).toEqual(removed);
});
