import type {PublicMarketItem} from '../receiz/public-market';
import type {PublicSpotlightPlacement} from '../receiz/public-ledger-statement';
import {readPublicSpotlightPlacements} from '../receiz/spotlight-placement-view';
import {marketUPulseTime} from '../receiz/market-projection/coordinates';

const seedId='public-discovery-spotlight';

export function readDiscoverSpotlightSeed(element:Element|null){
 try{
  const renderedAt=Number(element?.getAttribute('data-rendered-at'));
  const placements=readPublicSpotlightPlacements(JSON.parse(element?.textContent??'null'));
  return placements&&Number.isSafeInteger(renderedAt)&&renderedAt>0?{placements,renderedAt}:undefined;
 }catch{return undefined;}
}

export function discoverSpotlightSeedScript(placements:readonly PublicSpotlightPlacement[]|undefined,renderedAt:number){
 if(!placements)return '';
 // The existing placement parser permits only safe literal fields and values.
 return `<script id="${seedId}" type="application/json" data-rendered-at="${renderedAt}">${JSON.stringify(placements)}</script>`;
}

/** Keep the existing organic window and carry imminent booked Originals that
 * fall outside it. The complete held catalog remains in its shared carrier. */
export function selectDiscoverSeed(items:PublicMarketItem[],count:number,placements:readonly PublicSpotlightPlacement[]|undefined,renderedAt:number){
 const seed=items.slice(0,count);
 if(!placements?.length)return seed;
 const digests=new Set(seed.map(row=>row.originalDigest));
 const available=new Map(items.flatMap(row=>row.originalDigest?[[row.originalDigest,row] as const]:[]));
 const upcoming=placements.filter(row=>marketUPulseTime(row.endKaiUPulse)>renderedAt)
  .sort((a,b)=>Number(a.startKaiUPulse)-Number(b.startKaiUPulse));
 for(const {originalSha256} of upcoming){
  if(seed.length===24)break; // Existing bounded gallery seed reader.
  const row=available.get(originalSha256);
  if(!row||digests.has(originalSha256))continue;
  seed.push(row);
  digests.add(originalSha256);
 }
 return seed;
}
