import {expect,it} from 'vitest';
import {createPublicPricingCheckpoint,readPublicPricingCheckpoint} from '../server/public-pricing-checkpoint';
import {fixture,pulse} from './helpers/market-history-original-addition-fixture';
import {buildMarketHistory} from '../src/receiz/market-projection/build-history';
it('retains only exact existing numerical pricing operands, with no Original, presentation or content fields',()=>{
 const {after}=fixture(),item={...after.items[1],title:'PRIVATE TITLE',summary:'PRIVATE BODY',artworkUrl:'https://receiz.com/private.png',ownerDisplayName:'PRIVATE OWNER'};
 const checkpoint=createPublicPricingCheckpoint(item),encoded=JSON.stringify(checkpoint);
 for(const forbidden of ['PRIVATE','title','summary','artworkUrl','ownerDisplayName','profileOriginal','carriedText','sourceUrl'])expect(encoded).not.toContain(forbidden);
 expect(checkpoint.item.shareInventory).toEqual(item.shareInventory);expect(checkpoint.item.livePulseSeed).toEqual(item.livePulseSeed);expect(readPublicPricingCheckpoint(checkpoint)).toEqual(checkpoint.item);
 expect(()=>readPublicPricingCheckpoint({...checkpoint,item:{...checkpoint.item,summary:'unqualified content'}})).toThrow('PUBLIC_PRICING_CHECKPOINT_INVALID');
});
it('reproduces the exact existing append calculation using retained pricing operands without reopening Original bodies',async()=>{
 const {source,before,after}=fixture(),prior=await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:before,pulse,capitalization:true});expect(prior).toBeTruthy();
 const checkpointBefore={...before,items:before.items.map(item=>readPublicPricingCheckpoint(createPublicPricingCheckpoint(item)))},checkpointAfter={...after,items:after.items.map(item=>readPublicPricingCheckpoint(createPublicPricingCheckpoint(item)))};
 const expected=await buildMarketHistory(source,prior,()=>true,async()=>{},{catalog:after,pulse,capitalization:true,priorInput:{source,catalog:before}}),actual=await buildMarketHistory(source,prior,()=>true,async()=>{},{catalog:checkpointAfter,pulse,capitalization:true,priorInput:{source,catalog:checkpointBefore}});
 expect(actual).toEqual(expected);expect(actual?.series.ALL[0].usdCents).toBe(expected?.series.ALL[0].usdCents);
});

it.runIf(!!process.env.BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE&&!!process.env.BANKEIZ_PUBLIC_QUOTES_FIXTURE)('keeps exact pricing checkpoint fields on the real mixed public cohort without carrying text or media',async()=>{
 const [{readFileSync}]=await Promise.all([import('node:fs')]);
 const path=process.env.BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE!,quotesPath=process.env.BANKEIZ_PUBLIC_QUOTES_FIXTURE!;
 const {parsePublicMarket}=await import('../src/receiz/public-market'),catalog=parsePublicMarket(JSON.parse(readFileSync(path,'utf8')),JSON.parse(readFileSync(quotesPath,'utf8')));
 for(const item of catalog.items){const checkpoint=createPublicPricingCheckpoint(item);expect(readPublicPricingCheckpoint(checkpoint).shareInventory).toEqual(item.shareInventory);expect(checkpoint.item.livePulseSeed).toEqual(item.livePulseSeed);}
 expect(catalog.items.filter(item=>item.ownerUsername==='bjklock')).toHaveLength(612);
});
it.runIf(!!process.env.BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE&&!!process.env.BANKEIZ_PUBLIC_QUOTES_FIXTURE&&!!process.env.BANKEIZ_PUBLIC_CAPITALIZATION_FIXTURE&&!!process.env.BANKEIZ_PUBLIC_SPORTS_FIXTURE)('preserves exact full-cohort arithmetic with proof pricing checkpoints and the unchanged Sports component',{timeout:120000},async()=>{
 const [{readFileSync,writeFileSync},{parsePublicMarket},{mergePublicSports},{parseMarketCapSource}]=await Promise.all([import('node:fs'),import('../src/receiz/public-market'),import('../src/receiz/public-sports'),import('../src/receiz/market-projection/source')]);
 const load=(name:string)=>JSON.parse(readFileSync(process.env[name]!,'utf8')),catalog=mergePublicSports(parsePublicMarket(load('BANKEIZ_PUBLIC_MEMBERSHIP_FIXTURE'),load('BANKEIZ_PUBLIC_QUOTES_FIXTURE')),load('BANKEIZ_PUBLIC_SPORTS_FIXTURE')),source=parseMarketCapSource(load('BANKEIZ_PUBLIC_CAPITALIZATION_FIXTURE')),target='imported-b69c12eaabfb7e5e2a3875c936a728f2670c007d7ad191471388da23c78e73d4',priorCatalog={...catalog,items:catalog.items.filter(item=>item.assetId!==target)},pulse=source.serverPulse;
 const before=await buildMarketHistory(source,null,()=>true,async()=>{},{catalog:priorCatalog,pulse,capitalization:true});expect(before).toBeTruthy();
 const expected=await buildMarketHistory(source,before,()=>true,async()=>{},{catalog,pulse,capitalization:true,priorInput:{source,catalog:priorCatalog}}),models=(value:typeof catalog)=>({...value,items:value.items.map(item=>item.category==='proof'?readPublicPricingCheckpoint(createPublicPricingCheckpoint(item)):item)}),actual=await buildMarketHistory(source,before,()=>true,async()=>{},{catalog:models(catalog),pulse,capitalization:true,priorInput:{source,catalog:models(priorCatalog)}});
 expect(actual).toEqual(expected);expect(actual?.summary.shareCapitalization?.covered).toBe((before?.summary.shareCapitalization?.covered??0)+1);
 if(process.env.BANKEIZ_HISTORY_METRICS_OUTPUT)writeFileSync(process.env.BANKEIZ_HISTORY_METRICS_OUTPUT,JSON.stringify({originals:catalog.items.filter(item=>item.category==='proof').length,sports:catalog.items.filter(item=>item.category==='sports').length,copyObservationsBytes:JSON.stringify(expected?.copyObservations??null).length,observationPulsesBytes:JSON.stringify(expected?.observationPulses??[]).length,headerBytes:JSON.stringify((({series:_series,eventPulses:_events,...header})=>header)(expected!)).length},null,2)+'\n');
});
