import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {fixture as partsFixture} from './fixtures/public-material-parts';
import {fixture as marketFixture,pulse} from './helpers/market-history-original-addition-fixture';
import {createPublicPricingCheckpoint} from '../server/public-pricing-checkpoint';
import {readPublicReferencePricing} from '../server/public-reference-pricing';
import {createPublicMaterialWindowReader} from '../server/public-material-window';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
it('uses retained numeric operands after withdrawal without reading any old Original, membership body or financial history',async()=>{
 const {source,before,after}=marketFixture(),rows=after.items.map(item=>({id:item.id,receizId:item.assetId,ownerUserId:'fixture-owner'})),parts=partsFixture(rows),{items:_items,...metadata}=after,pricing={metadata:parts.put({schema:'bank.public-market.pricing-metadata.v1',catalog:metadata,sportsGeneration:null}),byId:parts.index(after.items.map((item,index)=>[JSON.stringify(['fixture-owner',item.assetId]),JSON.stringify({generation:parts.put(createPublicPricingCheckpoint(item)),position:String(index).padStart(8,'0')})])).root,count:after.items.length},root={...parts.root,history:{...parts.root.history,pricing}},material=JSON.stringify(root),forbidden=new Set([...parts.generations,parts.root.membership.metadata,parts.root.membership.byId,parts.root.membership.byOrder,parts.neverRead]);
 const reader=createPublicMaterialWindowReader({material,generation:createHash('sha256').update(material).digest('hex'),readPart:async(id:string)=>{if(forbidden.has(id))throw Error('WITHDRAWN_ORIGINAL_MUST_NOT_BE_REOPENED');return parts.readPart(id);}}),previous=await readPublicReferencePricing(reader,before,null);
 expect(previous.items).toHaveLength(2);expect(previous.items.map(item=>item.shareInventory)).toEqual(after.items.map(item=>item.shareInventory));expect(parts.reads.size).toBeLessThan(7);
 const fullPrior=await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:after,pulse,capitalization:true}),modelPrior=await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:previous,pulse,capitalization:true});expect(modelPrior).toEqual(fullPrior);
 const expected=await buildMarketHistory(source,fullPrior,()=>true,async()=>{},{catalog:before,pulse,capitalization:true,priorInput:{source,catalog:after}}),actual=await buildMarketHistory(source,modelPrior,()=>true,async()=>{},{catalog:before,pulse,capitalization:true,priorInput:{source,catalog:previous}});expect(actual).toEqual(expected);
});
it('does not grant old numeric operands from a previous root when its fixed Source transport refuses them',async()=>{
 const {after,before}=marketFixture(),parts=partsFixture(after.items.map(item=>({id:item.id,receizId:item.assetId,ownerUserId:'fixture-owner'}))),root={...parts.root,history:{...parts.root.history,pricing:{metadata:'a'.repeat(64),byId:null,count:after.items.length}}},material=JSON.stringify(root),reader=createPublicMaterialWindowReader({material,generation:createHash('sha256').update(material).digest('hex'),readPart:async()=>{throw Error('PUBLIC_MATERIAL_UNAVAILABLE');}});
 await expect(readPublicReferencePricing(reader,before,null)).rejects.toThrow('PUBLIC_MATERIAL_UNAVAILABLE');await expect(readPublicReferencePricing(reader,before,'b'.repeat(64))).rejects.toThrow('PUBLIC_HISTORY_TRANSITION_PRICING_CAPTURE_CHANGED');
});
it('reads the exact numeric baseline in two qualified reads and preserves the existing history calculation',async()=>{
 const {source,after}=marketFixture(),parts=partsFixture(after.items.map(item=>({id:item.id,receizId:item.assetId,ownerUserId:'fixture-owner'}))),{items:_items,...metadata}=after;
 const entries=after.items.map((item,index)=>({logicalKey:JSON.stringify(['fixture-owner',item.assetId]),position:String(index).padStart(8,'0'),checkpoint:createPublicPricingCheckpoint(item)}));
 const pricing={metadata:parts.put({schema:'bank.public-market.pricing-metadata.v1',catalog:metadata,sportsGeneration:null}),byId:'f'.repeat(64),count:entries.length,baseline:parts.put({schema:'bank.public-market.pricing-baseline.v1',entries})},material=JSON.stringify({...parts.root,history:{...parts.root.history,pricing}});
 const reader=createPublicMaterialWindowReader({material,generation:createHash('sha256').update(material).digest('hex'),readPart:async(id)=>{if(id!==pricing.metadata&&id!==pricing.baseline)throw Error('NUMERIC_BASELINE_MUST_NOT_OPEN_ORIGINAL_OR_INDEX');return parts.readPart(id);}}),catalog=await readPublicReferencePricing(reader,after,null);
 expect(parts.reads.size).toBe(2);expect(catalog.items.map(item=>item.shareInventory)).toEqual(after.items.map(item=>item.shareInventory));
 expect(await buildMarketHistory(source,null,()=>true,async()=>{},{catalog,pulse,capitalization:true})).toEqual(await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:after,pulse,capitalization:true}));
});
it.each(['duplicate','wrong-asset','public-content'] as const)('rejects an invalid numeric baseline: %s',async(mode)=>{
 const {after}=marketFixture(),parts=partsFixture(after.items.map(item=>({id:item.id,receizId:item.assetId,ownerUserId:'fixture-owner'}))),{items:_items,...metadata}=after;
 const entries=after.items.map((item,index)=>({logicalKey:JSON.stringify(['fixture-owner',mode==='wrong-asset'?'wrong':item.assetId]),position:String(index),checkpoint:createPublicPricingCheckpoint(item)}));
 if(mode==='duplicate')entries[1]=entries[0];if(mode==='public-content')Object.assign(entries[0].checkpoint.item,{claim:'An Original cannot enter the numeric history baseline.'});
 const pricing={metadata:parts.put({schema:'bank.public-market.pricing-metadata.v1',catalog:metadata,sportsGeneration:null}),byId:null,count:entries.length,baseline:parts.put({schema:'bank.public-market.pricing-baseline.v1',entries})},material=JSON.stringify({...parts.root,history:{...parts.root.history,pricing}}),reader=createPublicMaterialWindowReader({material,generation:createHash('sha256').update(material).digest('hex'),readPart:parts.readPart});
 await expect(readPublicReferencePricing(reader,after,null)).rejects.toThrow();
});
