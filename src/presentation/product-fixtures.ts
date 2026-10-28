/** Build-only illustration data shared by every product walkthrough.
 * No Original, custody, spendable grant or executable quote is created here.
 * Cash, investment marks and public object values remain separate displays. */
import{exampleAssets}from'../content/product-example-assets.mjs';
import{parsePublicMarket}from'../receiz/public-market';
import type{MarketPortfolio}from'../receiz/market-portfolio';
import type{SharedWallet}from'../receiz/shared-wallet';
import type{WalletPoint}from'../receiz/wallet-series';
import type{HeldDeposit}from'../receiz/deposit-source';
import type{InvestmentHistory}from'../receiz/market-projection/investment-history';
import{CHART_PERIODS}from'../core/chart-history';
const owner='example-only',captured='2026-10-20T12:00:00Z';
export const productExampleCatalog=parsePublicMarket({ok:true,transport:{publicOriginals:exampleAssets.map(asset=>({id:asset.id,receizId:asset.id,title:asset.title,summary:asset.summary,valueUsd:asset.value,createdAt:'2026-10-14T12:00:00Z',ownerUsername:'example',ownerDisplayName:'Example owner',profileOriginal:{media:{kind:asset.kind},hasPbiSignature:true}}))}});
for(const [index,item]of productExampleCatalog.items.entries()){
 const asset=exampleAssets[index];
 item.artworkUrl=asset.image;
 item.chart=[asset.value*.9,asset.value*.95,asset.value];
 // Manifest DISPLAY rows make the absence of a real proof explicit. Fake hashes,
 // verifier URLs, native bindings and downloadable Originals are never supplied.
 item.proofManifest=[{label:'Presentation',value:'Illustrative example data · not an Original proof'},{label:'Source',value:asset.title},{label:'Scope',value:asset.summary},{label:'Ownership',value:'Example account · illustration only'},{label:'Verification',value:'Open an actual Original in your own account to inspect its evidence.'}];
 // Fictional inventory is only enough to illustrate the real quantity UI.
 item.shareInventory={schema:'receiz.market.share-inventory.v1',marketItemId:item.id,assetId:item.assetId,family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'14800000000000',outstandingShareQuantityMicro:'10000000',availableShareQuantityMicro:'2500000',positionsMicro:'10000000',certificatesMicro:'0',reservedBuyMicro:'0',availability:'quote-capacity',historyBasis:'observations'};
}
productExampleCatalog.sourceCount=exampleAssets.length;
// Keep the already established meeting example: 1 wheat + 4 books + 2 recordings.
const holdings=[{id:'example-wheat',quantity:'1000000',cost:'30000',paidPrice:'30000'},{id:'example-book',quantity:'4000000',cost:'16000',paidPrice:'4000'},{id:'example-recording',quantity:'2000000',cost:'45000',paidPrice:'22500'}];
export const productExamplePortfolio:MarketPortfolio={schema:'bankeiz.market-portfolio.v1',authority:'market-observation',accountUid:owner,observedAt:captured,source:'connected',positions:holdings.map((held,index)=>{
 const item=productExampleCatalog.items.find(item=>item.id===held.id)!;
 return{id:'illustrative-position-'+index,marketItemId:item.id,assetId:item.assetId,title:item.title,summary:item.summary,shareQuantityMicro:held.quantity,costBasisUsdCents:held.cost,lastPriceUsdCents:String(Math.round(item.priceUsd!*100)),openedAt:`2026-10-17T${String(8+index).padStart(2,'0')}:00:00Z`,lastTradeAt:null};
}),trades:holdings.map((held,index)=>({id:'illustrative-purchase-'+index,marketItemId:held.id,title:productExampleCatalog.items.find(item=>item.id===held.id)!.title,side:'buy',shareQuantityMicro:held.quantity,executionPriceUsdCents:held.paidPrice,settlementUsdCents:held.cost,feeUsdCents:'0',realizedPnlUsdCents:null,executedAt:`2026-10-17T${String(8+index).padStart(2,'0')}:00:00Z`}))};
// This cash timeline begins after the example investment purchases. The $1,000
// opening cash, $250 deposit and $125 payment never include investment marks.
export const productExampleWallet:SharedWallet={userId:owner,totalUsdCents:'112500',reserveUsdCents:'112500',settlementUsdCents:'0',balancePhiMicro:'0',portfolioUsdCents:null,pnlUsdCents:null,withdrawableUsdCents:null,projectionComplete:true,pulse:null,kaiUpulse:null};
export const productExampleCashHistory:WalletPoint[]=[['2026-10-18T12:00:00Z','100000'],['2026-10-19T12:00:00Z','125000'],[captured,'112500']].map(([at,totalUsdCents])=>({userId:owner,at,kaiUPulse:null,totalUsdCents,reserveUsdCents:totalUsdCents,settlementUsdCents:'0'}));
// Explicit fictional unit-price observations, multiplied by the same held
// quantities. The last snapshot exactly matches the displayed current quotes.
const priceSnapshots=[['30000','4000','22500'],['31000','4250','23750'],['32000','4500','25000']];
const points=priceSnapshots.map((prices,index)=>({pulse:index+1,at:`2026-10-${18+index}T12:00:00Z`,usdCents:String(holdings.reduce((sum,held,i)=>sum+BigInt(held.quantity)*BigInt(prices[i])/1000000n,0n))}));
export const productExampleInvestmentHistory:InvestmentHistory={pulse:3,series:Object.fromEntries(CHART_PERIODS.map(period=>[period,points])) as InvestmentHistory['series']};
// These rows populate the existing held-object renderer only. Empty bytes and
// non-digest IDs deliberately cannot be mistaken for an admitted sealed source.
export const productExampleHeldSources:HeldDeposit[]=[['workshop-agreement','Workshop service agreement'],['photo-edition','Landscape print edition']].map(([id,title])=>({digest:'illustrative-'+id,filename:'example-'+id+'.png',title,kind:'proof',status:'held-proof',pulse:null,bytes:new Uint8Array()}));
