import type {ReceizIdentityAccountProjection,ReceizIdentityPublicBinding} from '@receiz/sdk';
import {safeReceizArtworkUrl,type PublicMarketItem} from './public-market';
import type {MarketSealedCopy,MarketValueObservation} from './market-projection/sealed-copies';

type RecordValue=Record<string,unknown>;
export interface HeldCollectible {
 readonly id:string;
 readonly family:string;
 readonly collectibleId:string;
 readonly claimHash:string;
 readonly title:string;
 readonly ownerUserId:string;
 readonly taxonomy:readonly string[];
 readonly artworkUrl:string|null;
 readonly rarity:string;
 readonly publiclyVisible:boolean;
 readonly listing:{readonly priceUsdCents:string;readonly listedAt:string}|null;
 readonly value:{readonly usd:number;readonly history:readonly MarketValueObservation[];readonly operands:MarketSealedCopy}|null;
 readonly facts:readonly {label:string;value:string}[];
 /** Already-admitted owner record. Never serialize the enclosing private account. */
 readonly source:Readonly<RecordValue>;
 readonly claim:Readonly<RecordValue>;
 readonly asset:Readonly<RecordValue>;
 readonly appends:readonly Readonly<RecordValue>[];
 readonly acquisitions:readonly Readonly<RecordValue>[];
 /** Display membership is not a transferable ownership admission. */
 readonly capabilities:readonly never[];
}
export interface HeldCollection {
 readonly status:'ready'|'partial'|'unavailable';
 readonly accountUserId:string|null;
 readonly cards:readonly HeldCollectible[];
}
const EMPTY_ITEMS:PublicMarketItem[]=[],EMPTY_CARDS:readonly HeldCollectible[]=Object.freeze([]),NO_ACTIONS:readonly never[]=Object.freeze([]);
const unavailable:HeldCollection=Object.freeze({status:'unavailable',accountUserId:null,cards:EMPTY_CARDS});
const cache=new WeakMap<ReceizIdentityAccountProjection,{binding:string;items:readonly PublicMarketItem[];account:string|undefined;view:HeldCollection}>();
const prepared=new WeakMap<HeldCollection,{items:readonly PublicMarketItem[];view:HeldCollection}>();
const object=(value:unknown):RecordValue=>value!==null&&typeof value==='object'&&!Array.isArray(value)?value as RecordValue:{};
const string=(value:unknown,max=256):string=>typeof value==='string'&&value.length<=max?value:'';
const label=(value:unknown):string=>string(value).split(/[-_ ]+/).filter(Boolean).map(word=>word.charAt(0).toUpperCase()+word.slice(1)).join(' ');
const rows=(value:unknown):RecordValue[]=>Array.isArray(value)?value.map(object):[];
const hash=(value:unknown):string=>typeof value==='string'&&/^[a-f0-9]{64}$/i.test(value)?value.toLowerCase():'';
const uuid=(value:unknown):string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)?value.toLowerCase():'';
const nonnegative=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e13;
/** Compare only when a duplicate identity actually occurs. No hashing, source
 * reopening or serialization of every card just to prepare its display. */
function sameRecord(a:unknown,b:unknown):boolean{
 if(Object.is(a,b))return true;
 if(!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;
 const left=Object.keys(a),right=Object.keys(b);if(left.length!==right.length)return false;
 return left.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&sameRecord((a as RecordValue)[key],(b as RecordValue)[key]));
}

/** A view of the SDK's admitted account, not another verifier or a source read.
 * Canonical account ID and key owner are distinct. Both bindings must survive.
 * Cache only the latest catalog revision per immutable held projection. */
export function projectHeldCollectibles(projection:ReceizIdentityAccountProjection,binding:ReceizIdentityPublicBinding,items:readonly PublicMarketItem[]=EMPTY_ITEMS,accountUserId?:string):HeldCollection {
 if(!items.length)items=EMPTY_ITEMS;
 if(items.length){
  const base=projectHeldCollectibles(projection,binding,EMPTY_ITEMS,accountUserId);if(!base.cards.length)return base;
  const prior=prepared.get(base);if(prior?.items===items)return prior.view;
  const values=new Map<string,MarketSealedCopy>(),conflicts=new Set<string>();
  for(const item of items)if(item.category==='sports')for(const copy of item.sportsValuation?.sealedCopies??[]){
   if(!nonnegative(copy.currentValueUsd)||!hash(copy.claimHash))continue;
   const key=`${copy.collectibleId.toLowerCase()}:${copy.claimHash.toLowerCase()}`,previous=values.get(key);
   if(previous&&previous.currentValueUsd!==copy.currentValueUsd)conflicts.add(key);else values.set(key,copy);
  }
  const view:HeldCollection=Object.freeze({...base,cards:Object.freeze(base.cards.map(card=>{
   const key=`${card.collectibleId}:${card.claimHash}`,copy=conflicts.has(key)?undefined:values.get(key);
   return copy?Object.freeze({...card,value:{usd:copy.currentValueUsd,history:copy.valueHistory??[],operands:copy}}):card;
  }))});prepared.set(base,{items,view});return view;
 }
 const identity=`${binding.keyId}:${binding.identityOwnerReceizId}`,previous=cache.get(projection);
 if(previous?.binding===identity&&previous.items===items&&previous.account===accountUserId)return previous.view;
 const state=object(projection.verifiedState),account=uuid(object(state.account).userId);
 if(projection.schema!=='receiz.sdk.identity_account_projection.v1'||projection.keyId!==binding.keyId||projection.owner?.uid!==binding.identityOwnerReceizId||projection.authority!=='verified-identity-portable-state'||!projection.portableStateVerified||projection.portableStateStatus!=='verified'||state.schema!=='receiz.account.state.v3'||!account||accountUserId!==undefined&&uuid(accountUserId)!==account)return unavailable;
 const sports=object(state.sports),signal=object(state.signalVault),domains=object(projection.domains);
 const sportsRows=domains.sports===true&&sports.schema==='receiz.sports.account-portable.v1'?rows(sports.vaultCards):[];
 const signalRows=domains.signalVault===true&&signal.schema==='receiz.signal-run.account-portable.v1'&&uuid(signal.ownerUserId)===account?rows(signal.cards):[];
 const art=new Map<string,RecordValue>();
 for(const row of rows(signal.arts)){const candidate=object(row.art_json),key=`${string(row.collectible_id)}:${hash(row.claim_hash)}`;art.set(key,candidate);}
 const appendIndex=new Map<string,RecordValue[]>(),purchaseIndex=new Map<string,RecordValue>();
 for(const [family,domain,field]of [['sports',sports,'cardAppends'],['signal',signal,'appends']]as const){
  for(const row of rows(domain[field]))if(uuid(row.owner_user_id)===account){
   const id=string(row.collectible_id).toLowerCase(),digest=hash(row.claim_hash);if(!id||!digest)continue;
   const key=`${family}:${id}:${digest}`,group=appendIndex.get(key);if(group)group.push(row);else appendIndex.set(key,[row]);
  }
  for(const row of rows(domain.packPurchases))if(uuid(row.owner_user_id)===account&&string(row.id))purchaseIndex.set(`${family}:${row.id}`,row);
 }
 const cards:HeldCollectible[]=[],conflicts=new Set<string>(),seen=new Map<string,RecordValue>();
 for(const [family,sourceRows]of [['sports',sportsRows],['signal',signalRows]]as const)for(const row of sourceRows){
  const collectibleId=string(row.collectible_id).toLowerCase(),key=`${family}:${collectibleId}`,prior=seen.get(key);
  if(prior){
   if(!sameRecord(prior,row))conflicts.add(key);
   continue;
  }
  seen.set(key,row);
  const claim=object(family==='sports'?row.card_json:row.claim_json),claimHash=hash(row.claim_hash);
  if(uuid(row.owner_user_id)!==account||!claimHash||hash(claim.claimHash)!==claimHash||string(claim.collectibleId).toLowerCase()!==collectibleId)continue;
  if(family==='sports'&&(!/^rsc_[a-f0-9]{16}$/.test(collectibleId)||claim.schema!=='receiz.sports_arena.card_claim.v1'||!['baseball','soccer','fight'].includes(string(claim.sport))||claim.sport!==row.sport))continue;
  if(family==='signal'&&(!/^src_[a-f0-9]{16}$/.test(collectibleId)||claim.schema!=='receiz.signal_run.card.v1'))continue;
  const title=string(family==='sports'?claim.athlete:claim.title);if(!title)continue;
  const rarity=label(claim.rarity),asset=object(row.asset_json),issue=object(claim.issue),pack=object(claim.pack),facts:Array<{label:string;value:string}>=[];
  const fact=(name:string,value:unknown)=>{if(typeof value==='string'&&value.length&&value.length<=1024||typeof value==='number'&&Number.isFinite(value))facts.push({label:name,value:String(value)});};
  if(family==='sports'){
   fact('Team',claim.teamCode);fact('Position',claim.position);fact('Rating',claim.rating);fact('Projected score',claim.projectedScore);fact('Variant issue number',issue.variantIssueNumber);fact('Player issue number',issue.overallIssueNumber);fact('Pack',pack.packName);fact('Pack odds',pack.oddsLine);fact('Variant draw odds',pack.rarityOddsLine);
  }else{fact('Card number',claim.cardNumber);fact('Rank',claim.rank);fact('Mission',claim.missionName);for(const [name,value]of Object.entries(object(claim.stats)))fact(label(name),value);}
  const candidate=object(row.art_json??art.get(`${collectibleId}:${claimHash}`));
  const signalArt=candidate.schema==='receiz.signal_run.card.generated_art.v1'&&candidate.collectibleId===collectibleId&&hash(candidate.claimHash)===claimHash&&candidate.mime==='image/png'&&hash(candidate.sha256Hex)&&typeof candidate.imageDataUrl==='string'&&candidate.imageDataUrl.length<=24*1024*1024&&candidate.imageDataUrl.startsWith('data:image/png;base64,')?candidate.imageDataUrl:null;
  const artworkUrl=family==='sports'?safeReceizArtworkUrl(object(claim.media).imageUrl):signalArt;
  const listingPrice=string(row.list_price_usd_cents)||typeof row.list_price_usd_cents==='number'&&Number.isSafeInteger(row.list_price_usd_cents)&&row.list_price_usd_cents>0?String(row.list_price_usd_cents):'';
  const listing=row.listing_status==='active'&&/^[1-9]\d{0,15}$/.test(listingPrice)&&string(row.listed_at)&&Number.isFinite(Date.parse(String(row.listed_at)))?{priceUsdCents:listingPrice,listedAt:String(row.listed_at)}:null;
  const taxonomy=(family==='sports'?['Sports',label(claim.sport),rarity]:['Signal Run',label(claim.edition),label(claim.cardKind),rarity]).filter(Boolean);
  const purchase=purchaseIndex.get(`${family}:${string(pack.purchaseId)}`),appends=appendIndex.get(`${key}:${claimHash}`)??[],acquisitions=purchase?[purchase]:[];
  cards.push(Object.freeze({id:key,family,collectibleId,claimHash,title,ownerUserId:account,taxonomy:Object.freeze(taxonomy),rarity,artworkUrl,publiclyVisible:!row.hidden_at,listing,value:null,facts:Object.freeze(facts),source:row,claim,asset,appends:Object.freeze(appends),acquisitions:Object.freeze(acquisitions),capabilities:NO_ACTIONS}));
 }
 const valid=cards.filter(card=>!conflicts.has(card.id));
 const covered=domains.sports===true&&domains.signalVault===true&&sports.schema==='receiz.sports.account-portable.v1'&&signal.schema==='receiz.signal-run.account-portable.v1'&&uuid(signal.ownerUserId)===account;
 const complete=covered&&projection.completeAtSealedHead&&sports.vaultCardCount===sportsRows.length&&signal.cardCount===signalRows.length&&valid.length===sportsRows.length+signalRows.length&&!conflicts.size;
 const view:HeldCollection=Object.freeze({status:complete?'ready':'partial',accountUserId:account,cards:Object.freeze(valid)});
 cache.set(projection,{binding:identity,items,account:accountUserId,view});return view;
}

/** Arbitrary-depth navigation over the held index. No pricing, reading or verification. */
export function collectionBranch(cards:readonly HeldCollectible[],path:readonly string[]){
 const matching=path.length?cards.filter(card=>path.every((part,index)=>card.taxonomy[index]===part)):cards;
 const counts=new Map<string,number>();for(const card of matching){const next=card.taxonomy[path.length];if(next)counts.set(next,(counts.get(next)??0)+1);}
 return {cards:matching,categories:[...counts].sort(([a],[b])=>a.localeCompare(b)).map(([name,count])=>({label:name,count}))};
}
