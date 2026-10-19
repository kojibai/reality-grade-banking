import type { PublicMarketCatalog, PublicMarketItem } from './public-market';
/** Account display only: a public showcase is not transferable ownership authority. */
export function projectAccountShowcase(catalog: PublicMarketCatalog | null, username: string | null): PublicMarketItem[] {
  if (!username || !/^[a-zA-Z0-9_-]{1,64}$/.test(username)) return [];
  const owner=username.toLowerCase(),items:PublicMarketItem[]=[],seen=new Set<string>();
  for(const item of catalog?.items??[]){
    if(item.category!=='sports'||!item.sealedCopies?.length){if(item.ownerUsername?.toLowerCase()===owner)items.push(item);continue;}
    for(const copy of item.sealedCopies){
      if(copy.ownerUsername?.toLowerCase()!==owner)continue;
      const key=`${copy.collectibleId}:${copy.claimHash}`;if(seen.has(key))continue;seen.add(key);
      // The grouped list's live unit quote belongs to its explicitly seeded
      // representative. Another copy keeps its identity without inheriting it.
      const priced=item.sportsValuation?.seed===copy.claimHash;
      items.push({...item,id:`${item.id}:copy:${key}`,assetId:copy.collectibleId,ownerUsername:copy.ownerUsername,ownerDisplayName:copy.ownerDisplayName,ownerProfileUrl:copy.ownerProfileUrl,sealedAt:copy.sealedAt,sealedCopies:[copy],sealedBirths:item.sealedBirths?.filter(birth=>birth.collectibleId===copy.collectibleId&&birth.claimHash===copy.claimHash),circulationCount:1,pricedCount:priced?1:0,capitalizationUsdCents:undefined,sourceUrl:`https://receiz.com/game/sports/card/${copy.collectibleId}?claimHash=${copy.claimHash}`,priceUsd:priced?item.priceUsd:null,changePct:priced?item.changePct:null,chart:priced?item.chart:[],sportsValuation:priced?item.sportsValuation:undefined,originalUrl:priced?item.originalUrl:null,originalDigest:priced?item.originalDigest:null});
    }
  }
  return items;
}
