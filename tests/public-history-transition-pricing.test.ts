import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {fixture as partsFixture} from './fixtures/public-material-parts';
import {fixture as marketFixture,pulse} from './helpers/market-history-original-addition-fixture';
import {createPublicPricingCheckpoint,PUBLIC_PRICING_METADATA_FIELDS} from '../server/public-pricing-checkpoint';
import {preparePublicHistoryTransition} from '../server/public-history-transition';
import {derivePublicHistoryPatch} from '../server/public-history-patch';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';

it.each([['append',false],['withdraw',false],['append',true],['withdraw',true]] as const)('uses retained numeric checkpoints for %s (sports operand: %s) without content or profile reads',async(mode,withSports)=>{
 const {source,before,after}=marketFixture(),previousCatalog=mode==='append'?before:after,currentCatalog=mode==='append'?after:before;
 const previous=await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:previousCatalog,pulse:pulse-1,capitalization:true});expect(previous).not.toBeNull();
 const next=await buildMarketHistory(source,previous,()=>true,async()=>{},{catalog:currentCatalog,pulse,capitalization:true,priorInput:{source,catalog:previousCatalog}});expect(next).not.toBeNull();
 const parts=partsFixture([]),allowed=new Set<string>(),save=(value:unknown)=>{const id=parts.put(value);allowed.add(id);return id;},capitalization=save({ok:true,marketCapProjection:source}),{series:_series,eventPulses:_events,...header}=previous!;
 const sports=withSports?save({ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-10-27T00:00:00Z',cards:[]}):null;
 const history={...parts.root.history,header:save(header),baseline:{generation:save(previous)}};
 const root=(catalog:typeof before,selectionKey:string)=>({...partsFixture(catalog.items.map(item=>({id:item.id,receizId:item.assetId,ownerUserId:'owner'}))).root,selectionKey,membership:{...partsFixture(catalog.items.map(item=>({id:item.id,receizId:item.assetId,ownerUserId:'owner'}))).root.membership,metadata:save({ok:true,transport:{generatedAt:catalog.observedAt,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:catalog.items.length,revision:catalog.revision}}})},sports,capitalization,history:{...history,pricing:{metadata:save({schema:'bank.public-market.pricing-metadata.v1',sportsGeneration:sports,catalog:{...Object.fromEntries(PUBLIC_PRICING_METADATA_FIELDS.flatMap(key=>catalog[key]===undefined?[]:[[key,catalog[key]]])),observedAt:source.generatedAt}}),byId:null,count:catalog.items.length,baseline:save({schema:'bank.public-market.pricing-baseline.v1',entries:catalog.items.map((item,i)=>({logicalKey:JSON.stringify(['owner',item.assetId]),position:String(i).padStart(8,'0'),checkpoint:createPublicPricingCheckpoint(item)}))})}},marketPrepared:{schema:'bank.public-market.prepared.v1' as const,asOfPulse:pulse}});
 const previousMaterial=JSON.stringify(root(previousCatalog,'previous')),selectionKey='current',currentMaterial=JSON.stringify(root(currentCatalog,selectionKey)),sha=(body:string)=>createHash('sha256').update(body).digest('hex'),previousGeneration=sha(previousMaterial),currentGeneration=sha(currentMaterial);
 const readPart=async(id:string)=>{if(!allowed.has(id))throw Error('CONTENT_OR_PROFILE_HEADER_MUST_NOT_BE_REOPENED');return parts.readPart(id);};
 const actual=await preparePublicHistoryTransition({selectionKey,historyTransition:{previousGeneration,currentGeneration,asOfPulse:pulse},previousMaterial,currentMaterial,readPart,readPreviousPart:readPart});
 expect(actual.patch).toEqual(derivePublicHistoryPatch(previous!,next!));expect(parts.reads.size).toBeLessThanOrEqual(withSports?9:8);
});
