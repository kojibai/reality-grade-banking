import type {MarketPortfolio,MarketPosition} from './market-portfolio';
import {marketDisplayCents} from './market-portfolio';
import type {PublicMarketCatalog,PublicMarketItem} from './public-market';
const indices=new WeakMap<PublicMarketItem[],{ids:Map<string,PublicMarketItem>;assets:Map<string,PublicMarketItem|null>}>();
function catalogIndex(items:PublicMarketItem[]){let index=indices.get(items);if(!index){const ids=new Map<string,PublicMarketItem>(),assets=new Map<string,PublicMarketItem|null>();for(const item of items){ids.set(item.id,item);assets.set(item.assetId,assets.has(item.assetId)?null:item);}index={ids,assets};indices.set(items,index);}return index;}
export function portfolioItem(position:MarketPosition,catalog:PublicMarketCatalog|null):PublicMarketItem{
 const index=catalog?catalogIndex(catalog.items):null;
 return index?.ids.get(position.marketItemId)??(position.assetId?index?.assets.get(position.assetId):null)??{id:position.marketItemId,assetId:position.assetId??position.marketItemId,title:position.title,summary:position.summary,category:'proof',sourceUrl:null,verifyUrl:null,originalUrl:null,originalDigest:null,pulse:null,sealedAt:null,ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,priceUsd:position.lastPriceUsdCents===null?null:Number(position.lastPriceUsdCents)/100,changePct:null,chart:[],authority:'projection-only',canTrade:false};
}
export function positionValue(position:MarketPosition,item:PublicMarketItem){
 const priceUsdCents=marketDisplayCents(item.priceUsd)??position.lastPriceUsdCents,valueUsdCents=priceUsdCents===null?null:(BigInt(position.shareQuantityMicro)*BigInt(priceUsdCents)/1000000n).toString(),costBasisUsdCents=position.costBasisUsdCents,pnlUsdCents=valueUsdCents===null||costBasisUsdCents===null?null:(BigInt(valueUsdCents)-BigInt(costBasisUsdCents)).toString();
 const percent=pnlUsdCents!==null&&costBasisUsdCents!==null&&BigInt(costBasisUsdCents)>0n?Number(BigInt(pnlUsdCents)*10000n/BigInt(costBasisUsdCents))/100:null;
 return{valueUsdCents,costBasisUsdCents,pnlUsdCents,pnlPct:percent!==null&&Number.isFinite(percent)?percent:null,priceUsdCents};
}
export function portfolioValue(portfolio:MarketPortfolio,items:PublicMarketItem[]){
 let value=0n,cost=0n,complete=true,costComplete=true;for(const position of portfolio.positions){const item=portfolioItem(position,{items} as PublicMarketCatalog),mark=positionValue(position,item);if(mark.valueUsdCents===null)complete=false;else value+=BigInt(mark.valueUsdCents);if(mark.costBasisUsdCents===null)costComplete=false;else cost+=BigInt(mark.costBasisUsdCents);}
 const delta=complete&&costComplete?value-cost:null;return{valueUsdCents:complete?value.toString():null,costBasisUsdCents:costComplete?cost.toString():null,pnlUsdCents:delta?.toString()??null,pnlPct:delta!==null&&cost>0n?Number(delta*10000n/cost)/100:null};
}
