import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {parsePublicMarket,type PublicMarketCatalog} from '../src/receiz/public-market';
import {createHeldPublicMarketInput,readHeldPublicMarketInput} from '../src/receiz/public-market-held-catalog';
import {mergePublicSports} from '../src/receiz/public-sports';

const hash='a'.repeat(64),claim='b'.repeat(64),at='2026-11-01T00:00:00Z';
function catalog():PublicMarketCatalog{
 const result=parsePublicMarket({ok:true,transport:{generatedAt:at,publicMembership:{version:1,scope:'whole-market-visible-showcase',source:'canonical-complete',isComplete:true,itemCount:1,revision:'membership'},publicOriginals:[{id:'profile:alice:original',receizId:'original',title:'An Original',summary:'Already selected',ownerUsername:'alice',ownerDisplayName:'Alice',ownerUserId:'alice-uid',ownerCreatedAt:at,canonicalHref:'/alice/verified/original',verifyHref:'/v/alice/abcdef12/10',pulse:'10',createdAt:at,valueUsd:12,profileOriginal:{hasPbiSignature:true,pbiReceiptHash:hash,mediaKind:'image',media:{src:'/art/custom.png',originalDownloadSrc:'/api/proof-material/packages/'+hash+'/artifact',originalDownloadSha256Hex:hash}}}]}});
 result.items[0]={...result.items[0],ownerAvatarUrl:'data:image/png;base64,YQ==',ownerAvatarFallback:'data:image/svg+xml,%3Csvg/%3E',ownerReceivingUsername:'alice',chart:[1,3,12],changePct:4,shareInventory:{schema:'receiz.market.share-inventory.v1',marketItemId:result.items[0].id,assetId:'original',family:'generic',quantityScope:'canonical-asset',observedAtKaiUPulse:'20000000',outstandingShareQuantityMicro:'1000000',availableShareQuantityMicro:'2000000',availability:'quote-capacity',positionsMicro:'1000000',certificatesMicro:'0',reservedBuyMicro:'0',historyBasis:'observations',history:[{kaiUPulse:'10000000',outstandingShareQuantityMicro:'0'},{kaiUPulse:'20000000',outstandingShareQuantityMicro:'1000000'}],capitalizationHistory:[{kaiUPulse:'10000000',unitPriceUsdCents:'100',outstandingShareQuantityMicro:'0',availableShareQuantityMicro:'2000000'}]}};
 const copy={collectibleId:'rsc_1234567890abcdef',claimHash:claim,sealedAt:at,birthUsdValue:2};
 result.items.push({...result.items[0],id:'sports:one',assetId:copy.collectibleId,category:'sports',ownerUsername:null,ownerDisplayName:null,ownerProfileUrl:null,ownerIdentity:undefined,ownerReceivingUsername:undefined,ownerAvatarUrl:undefined,ownerAvatarFallback:undefined,shareInventory:undefined,sourceUrl:'https://receiz.com/game/sports/card/'+copy.collectibleId+'?claimHash='+claim,artworkUrl:'https://receiz.com/api/game/sports/baseball/player-image/123',originalUrl:null,originalDigest:null,cardClaimHash:claim,circulationCount:1,pricedCount:1,capitalizationUsdCents:'300',sealedBirths:[copy],sealedCopies:[{collectibleId:copy.collectibleId,claimHash:claim,sealedAt:at,ownerUsername:'alice',ownerDisplayName:'Alice',ownerProfileUrl:'https://receiz.com/alice'}],collectiblePresentation:{collectibleId:copy.collectibleId,claimHash:claim,facts:[{label:'Sport',value:'baseball'}]},sportsValuation:{id:'card:'+claim,source:'sports-economy-card',baseUsdValue:2,birthUsdValue:2,marketUsdValue:3,proofTotalValueUsd:2,scoreDelta:1,seed:claim,sealedCopies:[{...copy,proofValueUsd:2,currentValueUsd:3,valueHistory:[{at,usdValue:2,basis:'sealed-birth'}]}]},localValuationPulse:11});
 result.items[1].valuationBinding={itemId:'sports:one',assetId:copy.collectibleId};
 result.sourceCount=2;result.sportsCoverage='complete';result.sportsObservedAt=at;result.sportsHistorySnapshot={at,totalUsd:3,sourceHash:hash,groups:1,singleCopyGroups:1,aggregateGroups:0,unpricedGroups:0};
 result.publicProfileHeads=[{profile:{userId:'alice-uid',username:'alice',displayName:'Alice',isPrivate:false,avatarUrl:'data:image/png;base64,YQ==',bannerUrl:'https://receiz.com/custom/banner.png',authorshipVerified:true,authorshipPbiReceiptHash:hash,createdAt:at,links:[]},viewer:{canView:true},stats:{originals:1,originalViews:2,streams:0,witnessedSeconds:0,streamCompletionRatePct:0}}];
 result.publicProfileHeadsRevision=hash;
 return result;
}
const reopen=(value:unknown)=>readHeldPublicMarketInput(JSON.parse(JSON.stringify(value)));
afterEach(()=>vi.unstubAllGlobals());

it('retains the exact held public display family through JSON without Source, admission, or history work',()=>{
 const fetch=vi.fn(()=>{throw Error('Unexpected read');});vi.stubGlobal('fetch',fetch);
 const selected=catalog(),before=JSON.stringify(selected),input=createHeldPublicMarketInput(selected);
 expect(input?.schema).toBe('bank.public-market.held-catalog.v1');
 expect(reopen(input)).toEqual(JSON.parse(before));expect(JSON.stringify(selected)).toBe(before);expect(fetch).not.toHaveBeenCalled();
});

it('curates only public header fields and exact owner-bound refusals',()=>{
 const selected=catalog(),head=selected.publicProfileHeads![0];
 selected.publicProfileHeads=[Object.assign({...head},{profile:{...head.profile,account:{secret:'private-account'}},viewer:{...head.viewer,isOwner:true},stats:{...head.stats,privateBalance:42},manifest:['private-manifest']}),head];
 selected.publicProfileHeadRefusals=[Object.assign({profile:{userId:'private-uid',username:'private',isPrivate:true as const},viewer:{canView:false as const}},{profile:{userId:'private-uid',username:'private',isPrivate:true as const,displayName:'private-name',backup:'private-backup'},stats:{balance:'private-balance'}})];
 const input=createHeldPublicMarketInput(selected),restored=reopen(input);
 expect(restored?.publicProfileHeads).toBeUndefined();
 expect(restored?.publicProfileHeadRefusals).toEqual([{profile:{userId:'private-uid',username:'private',isPrivate:true},viewer:{canView:false}}]);
 expect(JSON.stringify(input)).not.toMatch(/private-(?:account|manifest|name|backup|balance)/);
});

it('retains a header-only directory account while stripping account and viewer extras',()=>{
 const selected=catalog(),head=selected.publicProfileHeads![0];selected.items=[];selected.sourceCount=0;
 selected.publicProfileHeads=[Object.assign({...head},{profile:{...head.profile,websiteUrl:'https://example.com',account:{secret:'private-account'}},viewer:{canView:true,isOwner:true,session:'private-session'},stats:{...head.stats,balance:'private-balance'},manifest:['private-manifest']})];
 const input=createHeldPublicMarketInput(selected),restored=reopen(input);
 expect(restored?.publicProfileHeads?.[0].profile).toMatchObject({userId:'alice-uid',username:'alice',websiteUrl:'https://example.com',authorshipPbiReceiptHash:hash});
 expect(restored?.items).toEqual([]);expect(JSON.stringify(input)).not.toMatch(/private-(?:account|session|balance|manifest)/);
});

it('preserves compatible optional sports pricing observations without evaluating them',()=>{
 const selected=catalog(),row=selected.items[1].sportsValuation!;
 row.historyEvaluationPulse=10;row.quoteUsdPerPhi=2;row.marketItem={id:'sports:one',source:'sports-projection',priceUsd:3,pricePhi:1.5,quoteUsdPerPhi:2,changePct:4,pricingSourceKey:'carried-price'};
 const restored=reopen(createHeldPublicMarketInput(selected));expect(restored?.items[1].sportsValuation).toEqual(row);
});

it.each([
 (value:PublicMarketCatalog)=>{value.items.push(value.items[0]);},
 (value:PublicMarketCatalog)=>{Object.assign(value.items[0],{canTrade:true});},
 (value:PublicMarketCatalog)=>{Object.assign(value.items[0],{authority:'verified-owner'});},
 (value:PublicMarketCatalog)=>{Object.assign(value.items[0],{privateState:{secret:'private'}});},
 (value:PublicMarketCatalog)=>{Object.assign(value.items[0].shareInventory!,{privateBalance:1});},
 (value:PublicMarketCatalog)=>{Object.assign(value.items[0],{visibility:'private'});},
 (value:PublicMarketCatalog)=>{value.complete=false;},
 (value:PublicMarketCatalog)=>{value.sourceCount=-1;},
 (value:PublicMarketCatalog)=>{Object.assign(value,{revision:{secret:'private'}});},
 (value:PublicMarketCatalog)=>{Object.assign(value.publicProfileHeads![0].profile,{displayName:{secret:'private'}});},
 (value:PublicMarketCatalog)=>{value.items[0].ownerIdentity!.username='another';},
])('refuses malformed or private carried projections without serializing them',mutate=>{
 const selected=catalog();mutate(selected);expect(createHeldPublicMarketInput(selected)).toBeNull();
 expect(reopen({schema:'bank.public-market.held-catalog.v1',catalog:selected})).toBeNull();
});

it.each([
 (value:PublicMarketCatalog)=>{value.items[0].originalUrl='https://evil.example/source';},
 (value:PublicMarketCatalog)=>{value.items[0].artworkUrl='javascript:alert(1)';},
 (value:PublicMarketCatalog)=>{value.items[0].ownerProfileUrl='https://receiz.com/api/account';},
 (value:PublicMarketCatalog)=>{value.items[0].ownerAvatarUrl='file:///private/identity';},
 (value:PublicMarketCatalog)=>{value.items[0].proofManifest=[{label:'Unsafe',value:'download',href:'javascript:alert(1)'}];},
 (value:PublicMarketCatalog)=>{value.items[1].sealedCopies![0].ownerProfileUrl='https://evil.example/private';},
])('refuses unsafe public URL roles',mutate=>{
 const selected=catalog();mutate(selected);expect(createHeldPublicMarketInput(selected)).toBeNull();expect(reopen({schema:'bank.public-market.held-catalog.v1',catalog:selected})).toBeNull();
});

it('recognizes only its own envelope and does not accept a Source response as cache authority',()=>{
 expect(readHeldPublicMarketInput({ok:true,transport:{}})).toBeNull();
 expect(readHeldPublicMarketInput({schema:'bank.public-market.held-catalog.v2',catalog:catalog()})).toBeNull();
 expect(createHeldPublicMarketInput({...catalog(),items:[],sourceCount:0})).not.toBeNull();
});

it('retains the shipped accepted public family using the same projection readers',()=>{
 const input=JSON.parse(readFileSync(new URL('../public/receiz-public-market.json',import.meta.url),'utf8')),sports=JSON.parse(readFileSync(new URL('../public/receiz-public-sports.json',import.meta.url),'utf8')),selected=mergePublicSports(parsePublicMarket(input,input.snapshot),sports),held=createHeldPublicMarketInput(selected);
 expect(selected.items.some(item=>item.category==='sports')).toBe(true);
 expect(held).not.toBeNull();expect(reopen(held)).toEqual(JSON.parse(JSON.stringify(selected)));
},15_000);
