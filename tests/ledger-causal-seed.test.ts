import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,it} from 'vitest';
import {parsePublicNetworkCache} from '../src/receiz/public-network-cache';
import {ledgerFundingTrace} from '../src/receiz/ledger-funding-trace';
import {enrichLedgerCausalHistory} from '../src/receiz/ledger-causal-enrichment';
import {readLedgerCausalLineage} from '../src/receiz/ledger-causal-source';
import {indexLedgerRelations,ledgerRelatedRecords} from '../src/receiz/ledger-economy';
import {readWalletProofCohorts} from '../src/receiz/ledger-wallet-cohorts';
it('keeps the complete existing public ledger and exposes locally carried native value origins',()=>{
 const cache=parsePublicNetworkCache(JSON.parse(gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin')).toString()));
 expect(cache.records).toHaveLength(45666);expect(cache.records.filter(r=>r.details?.causalLineage)).toHaveLength(104);
 const cards=cache.records.filter(r=>r.valueOperands?.cardValuation);expect(cards.length).toBeGreaterThan(200);
 for(const r of cards){const trace=ledgerFundingTrace(r);expect(trace.valueOrigins).toHaveLength(1);expect(trace.valueOrigins[0].claimHash).toBe(r.valueOperands!.cardValuation!.claimHash);expect(trace.valueOrigins[0].occurredAt).toBe(r.valueOperands!.cardValuation!.sealedAt);}
});
it('retains the native funding source IDs and follows the exact market credit to its existing proof object',()=>{
 const cache=parsePublicNetworkCache(JSON.parse(gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin')).toString()));
 const steps=cache.records.flatMap(r=>readLedgerCausalLineage(r.details?.causalLineage)?.steps??[]);
 expect(steps.filter(s=>s.sourceId).length).toBeGreaterThanOrEqual(825);expect(steps.filter(s=>s.sourceHash).length).toBeGreaterThanOrEqual(218);
 const record=cache.records.find(r=>Array.isArray(r.details?.fundingLinks)&&JSON.stringify(r.details.fundingLinks).includes('60b8bb44-ffa5-43d3-b550-f9736efadba1'))!;
 expect(ledgerFundingTrace(record).steps).toContainEqual(expect.objectContaining({kind:'post_work_proof',sourceId:'profile:bjklock:80c6d005-4877-444d-a9f9-8e9c4107d947'}));
 expect(ledgerRelatedRecords(record,indexLedgerRelations(cache.records)).some(({record})=>record.evidence.artifactDigest==='29ac12db2fc9cc85097b3694234af3688e9013582f6a4aa65450a25c5e83d16e')).toBe(true);
 const attributed=cache.records.filter(r=>r.details?.fundingAttribution);expect(attributed).toHaveLength(87);expect(attributed.every(r=>ledgerFundingTrace(r).basis==='calculated-fifo')).toBe(true);
 const uncovered=cache.records.filter(r=>r.kind==='chat_transfer'&&!r.details?.fundingAttribution);
 expect(uncovered.map(record=>record.id)).toEqual(['wallet:transfer:c83ef4e8414ce7ca165bea28']);
 expect(ledgerFundingTrace(uncovered[0]).components).toEqual([{rail:'reserve',amountUsdCents:'31'},{rail:'settlement',amountUsdCents:'69'}]);
});
it('never lets an older label-only capture erase exact native history coordinates already held',()=>{
 const hash='a'.repeat(64),lineage={sourceSchema:'receiz.sports_arena.card_causal_ownership_proof.v1',proofHash:hash,collectibleId:'rsc_1234567890abcdef',claimHash:hash,fundingSource:'free',acquisitionKind:'transfer',steps:[{id:'step',kind:'free_claim',label:'Free claim',detail:'Origin',occurredAt:'2026-05-10T12:00:00Z',sourceId:'exact-native-source',collectibleId:'rsc_1234567890abcdef',claimHash:hash}]};
 const record={id:'actions:one',sourceId:'one',source:'actions' as const,kind:'receiz.sports_arena.card_transfer',title:'Transfer',detail:'',time:null,actor:null,amountUsdCents:null,kaiUpulse:null,pulse:'120',sourceUrl:null,evidence:{},authority:'public-source-projection' as const,valueOperands:{collectibleId:lineage.collectibleId,claimHash:hash},details:{causalLineage:lineage}};
 const older={ok:true,schema:'receiz.sports_economy.live_inventory.v1',cards:[{collectibleId:lineage.collectibleId,claimHash:hash,causalLineage:{...lineage,steps:[{id:'step',kind:'free_claim',label:'Free claim',detail:'Origin',timeLabel:'May 10'}]}}]};
 expect(enrichLedgerCausalHistory([record],older)[0].details?.causalLineage).toMatchObject({steps:[{occurredAt:'2026-05-10T12:00:00Z',sourceId:'exact-native-source'}]});
});
it('carries the required legacy proof cohorts once in shared local context',()=>{
 const wire=JSON.parse(gunzipSync(readFileSync('public/receiz-public-ledger.json.gz.bin')).toString()),cache=parsePublicNetworkCache(wire);
 const linked=cache.records.filter(record=>record.details?.fundingCohorts),cohorts=new Map(linked.flatMap(record=>(readWalletProofCohorts(record.details!.fundingCohorts)??[]).map(cohort=>[cohort.creditSourceId,cohort]as const)));
 expect(linked).toHaveLength(49);expect(cohorts.size).toBe(3);expect([...cohorts.values()].reduce((sum,cohort)=>sum+cohort.members.length,0)).toBe(192);
 expect(Math.max(...[...cohorts.values()].map(cohort=>cohort.members.length))).toBe(174);
 const members=[...cohorts.values()].flatMap(cohort=>cohort.members);
 expect(members.filter(member=>!member.pulse)).toHaveLength(14);
 expect(members.every(member=>member.verifyUrl.startsWith('https://receiz.com/v/'))).toBe(true);
 expect(wire.records.filter((record:{details?:{fundingCohorts?:unknown};detailsRef?:number})=>record.details?.fundingCohorts)).toHaveLength(0);
 expect(linked.every(record=>wire.records.find((raw:{id:string})=>raw.id===record.id).detailsRef!==undefined)).toBe(true);
});
