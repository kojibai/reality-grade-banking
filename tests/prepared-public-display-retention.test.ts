import {expect,it,vi} from 'vitest';
import {preparePublicMarketRenderMaterial} from '../server/public-market-preparation';
import {curatePublicMarketMembership} from '../server/public-market';
import {preparePublicMarketState} from '../server/prepared-public-market-state';
import membershipFile from '../public/receiz-public-market.json';
import sportsFile from '../public/receiz-public-sports.json';
import capitalizationFile from '../public/receiz-public-capitalization.json';
import historyFile from '../public/receiz-public-share-chart-history.json';

const policy='bank.public-market.curated-display.v3';
const membership=curatePublicMarketMembership(structuredClone(membershipFile));
const quotes=membershipFile.snapshot;
const heldSports=sportsFile.cards.find(card=>card.valuationRow&&card.sealedBirths?.length)!;
const {sealedBirths,historyObservation,...weakCard}=heldSports;
const weakRow={...weakCard.valuationRow};delete (weakRow as Record<string,unknown>).historyObservation;
delete (weakRow as Record<string,unknown>).sealedBirths;delete (weakRow as Record<string,unknown>).sealedCopies;
const weakSports={ok:true,schema:'receiz.sports_economy.live_inventory.v1',fallback:true,generatedAt:'2026-11-05T01:53:52.987Z',cards:[{...weakCard,valuationRow:weakRow}]};
const previous={membership,snapshot:quotes,sports:weakSports,capitalization:capitalizationFile,history:historyFile,preparedLedger:{held:'accepted-public-ledger-prefix'}};

it('repairs an old display representation with one membership read and preserves its existing financial operands',async()=>{
 const read=vi.fn(async(kind:string)=>{if(kind!=='membership')throw Error('Retained operands must not be fetched again.');return structuredClone(membership);});
 const prepareLedger=vi.fn(async(value:unknown)=>value);
 const result=JSON.parse((await preparePublicMarketRenderMaterial({previousMaterial:JSON.stringify(previous),read,prepareLedger})).material);
 expect(read.mock.calls).toEqual([['membership']]);expect(prepareLedger).toHaveBeenCalledExactlyOnceWith(previous.preparedLedger);
 expect(result.publicDisplayPolicy).toBe(policy);expect(result.membership).toEqual(membership);
 expect(result.snapshot).toEqual(quotes);expect(result.capitalization).toEqual(capitalizationFile);expect(result.history).toEqual(historyFile);expect(result.preparedLedger).toEqual(previous.preparedLedger);
});

it('does no public operand work when the already-held representation uses the current policy',async()=>{
 const read=vi.fn(async()=>{throw Error('Current held representation must be reused.');});
 const result=JSON.parse((await preparePublicMarketRenderMaterial({previousMaterial:JSON.stringify({...previous,publicDisplayPolicy:policy}),read})).material);
 expect(read).not.toHaveBeenCalled();expect(result).toEqual({...previous,publicDisplayPolicy:policy});
});

it('carries the held sealed sports history into a weaker fresh preparation without opening old proofs',async()=>{
 const operands={membership,sports:weakSports,capitalization:capitalizationFile,quotes};
 const read=vi.fn(async(kind:keyof typeof operands)=>structuredClone(operands[kind]));
 const result=JSON.parse((await preparePublicMarketRenderMaterial({read})).material);
 expect(read.mock.calls.map(([kind])=>kind).sort()).toEqual(['capitalization','membership','quotes','sports']);
 const card=result.sports.cards.find((item:typeof heldSports)=>item.collectibleId===heldSports.collectibleId&&item.claimHash===heldSports.claimHash);
 expect(card.sealedBirths).toEqual(heldSports.sealedBirths);expect(card.historyObservation).toEqual(heldSports.historyObservation);
 expect(result.sports.historySnapshot).toEqual(sportsFile.historySnapshot);expect(result.sports.cards).toHaveLength(sportsFile.cards.length);
});

it('restores the held seal history when the first representation repair also refreshes changed Market operands',async()=>{
 const operands={membership,sports:weakSports,capitalization:capitalizationFile,quotes};
 const read=vi.fn(async(kind:keyof typeof operands)=>structuredClone(operands[kind]));
 const result=JSON.parse((await preparePublicMarketRenderMaterial({previousMaterial:JSON.stringify(previous),refreshMarket:true,read})).material);
 expect(read.mock.calls.map(([kind])=>kind).sort()).toEqual(['capitalization','membership','quotes','sports']);
 expect(result.sports.historySnapshot).toEqual(sportsFile.historySnapshot);
 expect(result.sports.cards).toHaveLength(sportsFile.cards.length);
 expect(result.sports.cards.find((card:typeof heldSports)=>card.collectibleId===heldSports.collectibleId&&card.claimHash===heldSports.claimHash).sealedBirths).toEqual(heldSports.sealedBirths);
 expect(result.publicDisplayPolicy).toBe(policy);
});

it('prepares the actual held sports seal-date history instead of downgrading it to undated aggregate history',async()=>{
 const operands={membership,sports:weakSports,capitalization:capitalizationFile,quotes};
 const result=JSON.parse((await preparePublicMarketRenderMaterial({read:async(kind)=>structuredClone(operands[kind]),prepareMarket:preparePublicMarketState})).material);
 expect(result.history.summary.undatedHistory).toBeUndefined();
 expect(result.history.summary.sportsCardsPriced).toBeGreaterThan(0);
 expect(result.sports.historySnapshot).toEqual(sportsFile.historySnapshot);
});
