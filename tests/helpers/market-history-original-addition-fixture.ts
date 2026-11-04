import sourceFile from '../../public/receiz-public-capitalization.json';
import addition from '../fixtures/capitalization-original-addition.json';
import {parsePublicMarket} from '../../src/receiz/public-market';
import {parseMarketCapSource,type MarketCapSource} from '../../src/receiz/market-projection/source';
export const pulse=14992338;
export function fixture(){
 const full=parseMarketCapSource(sourceFile),row=full.valueRows.find(row=>row.marketItem?.livePulseSeed)!;
 const source:MarketCapSource={...full,valueRows:[row],marketAssetsPriced:1,sportsCardsPriced:0,cardsInCirculation:0,serverPulse:pulse-1,unpricedSealedBirths:undefined,sportsHistorySnapshot:undefined,sportsHistoryEvaluationPulse:undefined,sourceEvaluation:undefined};
 const original={id:row.marketItem!.id,receizId:row.seed,title:'Existing public Original',pulse:String(row.marketItem!.livePulseSeed!.claimPulse),livePulseSeed:row.marketItem!.livePulseSeed,profileOriginal:{hasPbiSignature:true}};
 const catalog=(originals:unknown[])=>parsePublicMarket({ok:true,transport:{generatedAt:addition.observedAt,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:originals.length,revision:String(originals.length)},publicOriginals:originals}});
 const before=catalog([original]),item=before.items[0],at=String(BigInt(item.pulse!)*1000000n);
 item.shareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:item.id,assetId:item.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:at,outstandingShareQuantityMicro:'1000000',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',availableShareQuantityMicro:'1000000',availability:'quote-capacity',releaseCapitalization:{kaiUPulse:at,unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'1000000',modelVersion:'market-share-quote-v1'}};
 const after=catalog([original,addition.original]);after.items[0].shareInventory=item.shareInventory;after.items[1].shareInventory=addition.shareInventory as typeof item.shareInventory;
 return{source,before,after};
}
