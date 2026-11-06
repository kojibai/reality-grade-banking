import {createHash} from 'node:crypto';
import {mergePublicSports} from '../src/receiz/public-sports.js';
import {MARKET_CONTENT_FILTERS,matchesMarketContent,type MarketContentFilter} from '../src/receiz/market-categories.js';
type RecordValue=Record<string,unknown>;
export type PublicSportsParts={schema:'bank.public-market.sports-parts.v1';metadata:RecordValue;entries:readonly {id:string;assetId:string;cardIndex:number;cardCanonicalSha256:string;facets:readonly MarketContentFilter[]}[]};
/** One-time public-index preparation over the existing Sports projector. The
 * returned index names retained raw cards; it does not copy copy-history or
 * create pricing, inventory, membership or financial authority. */
export function preparePublicSportsParts(input:unknown):PublicSportsParts{
 const source=input as RecordValue;if(source?.ok!==true||source.schema!=='receiz.sports_economy.live_inventory.v1'||!Array.isArray(source.cards)||source.cards.length>100000)throw Error('PUBLIC_SPORTS_PART_INPUT_INVALID');
 const {cards,...metadata}=source,catalog=mergePublicSports({items:[],complete:false,revision:'',observedAt:null,sourceCount:0},input),positions=new Map<string,number>();
 for(let index=0;index<cards.length;index++){const row=cards[index] as RecordValue;if(typeof row?.collectibleId==='string'&&!positions.has(row.collectibleId.toLowerCase()))positions.set(row.collectibleId.toLowerCase(),index);}
 return{schema:'bank.public-market.sports-parts.v1',metadata,entries:catalog.items.map(item=>{const cardIndex=positions.get(item.assetId);if(cardIndex===undefined)throw Error('PUBLIC_SPORTS_PART_INPUT_INVALID');return{id:item.id,assetId:item.assetId,cardIndex,cardCanonicalSha256:createHash('sha256').update(JSON.stringify(cards[cardIndex])).digest('hex'),facets:MARKET_CONTENT_FILTERS.filter(facet=>matchesMarketContent(item,facet))};})};
}
