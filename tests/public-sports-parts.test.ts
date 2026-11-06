import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {expect,it} from 'vitest';
import {preparePublicSportsParts} from '../server/public-sports-parts';
import {mergePublicSports} from '../src/receiz/public-sports';
const card={collectibleId:'rsc_0123456789abcdef',claimHash:'c'.repeat(64),sport:'baseball',athlete:'Existing public card',issuedCount:1,vaultCount:1,pricedCount:1,totalValueUsd:12,liveValueUsd:12};
const input={ok:true,schema:'receiz.sports_economy.live_inventory.v1',generatedAt:'2026-11-02T12:00:00Z',cards:[card]};
it('indexes existing Sports content without copying its body or pretending it is an Original',()=>{
 const result=preparePublicSportsParts(input),entry=result.entries[0];expect(entry).toEqual({id:'sports:'+card.collectibleId,assetId:card.collectibleId,cardIndex:0,cardCanonicalSha256:createHash('sha256').update(JSON.stringify(card)).digest('hex'),facets:['All','Collectibles']});expect(JSON.stringify(result)).not.toContain('Existing public card');expect(result.metadata).not.toHaveProperty('cards');
});
it.runIf(!!process.env.BANKEIZ_PUBLIC_SPORTS_FIXTURE)('keeps exact captured Sports membership and classifier order without duplicating sealed history',()=>{
 const input=JSON.parse(readFileSync(process.env.BANKEIZ_PUBLIC_SPORTS_FIXTURE!,'utf8')),result=preparePublicSportsParts(input),catalog=mergePublicSports({items:[],complete:false,revision:'fixture',observedAt:null,sourceCount:0},input);
 expect(result.entries.map(entry=>entry.id)).toEqual(catalog.items.map(item=>item.id));expect(result.entries.length).toBeGreaterThan(500);expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThan(Buffer.byteLength(JSON.stringify(input))/5);
 for(const entry of result.entries)expect(input.cards[entry.cardIndex].collectibleId.toLowerCase()).toBe(entry.assetId);
});
