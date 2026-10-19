import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,it} from 'vitest';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
import {enrichLedgerCausalHistory} from '../src/receiz/ledger-causal-enrichment';
it('keeps the complete existing public ledger and exposes locally carried native value origins',()=>{
 const cache=parsePublicNetworkCache(JSON.parse(gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin')).toString()));
 expect(cache.records).toHaveLength(45663);expect(cache.records.filter(r=>r.details?.causalLineage)).toHaveLength(104);
 const cards=cache.records.filter(r=>r.valueOperands?.cardValuation);expect(cards.length).toBeGreaterThan(200);
 for(const r of cards){const trace=ledgerFundingTrace(r);expect(trace.valueOrigins).toHaveLength(1);expect(trace.valueOrigins[0].claimHash).toBe(r.valueOperands!.cardValuation!.claimHash);expect(trace.valueOrigins[0].occurredAt).toBe(r.valueOperands!.cardValuation!.sealedAt);}
});
it('never lets an older label-only capture erase exact native history coordinates already held',()=>{
 const hash='a'.repeat(64),lineage={sourceSchema:'receiz.sports_arena.card_causal_ownership_proof.v1',proofHash:hash,collectibleId:'rsc_1234567890abcdef',claimHash:hash,fundingSource:'free',acquisitionKind:'transfer',steps:[{id:'step',kind:'free_claim',label:'Free claim',detail:'Origin',occurredAt:'2026-05-10T12:00:00Z',sourceId:'exact-native-source',collectibleId:'rsc_1234567890abcdef',claimHash:hash}]};
 const record={id:'actions:one',sourceId:'one',source:'actions' as const,kind:'receiz.sports_arena.card_transfer',title:'Transfer',detail:'',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:'120',sourceUrl:null,evidence:{},authority:'public-source-projection' as const,valueOperands:{collectibleId:lineage.collectibleId,claimHash:hash},details:{causalLineage:lineage}};
 const older={ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{collectibleId:lineage.collectibleId,claimHash:hash,causalLineage:{...lineage,steps:[{id:'step',kind:'free_claim',label:'Free claim',detail:'Origin',timeLabel:'May 10'}]}}]};
 expect(enrichLedgerCausalHistory([record],older)[0].details?.causalLineage).toMatchObject({steps:[{occurredAt:'2026-05-10T12:00:00Z',sourceId:'exact-native-source'}]});
});
