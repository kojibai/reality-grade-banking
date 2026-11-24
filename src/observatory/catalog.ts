import {compatibleShareInventory,marketCapitalizationQuantity,mergeShareInventory,publicCapitalizationAssets,shareCapitalizationUsdCents} from '../receiz/market-share-inventory';
import type {PublicNetworkCache} from '../receiz/public-network-cache';
import type {ObservatoryDirectory} from '../receiz/public-ledger-document-seed';
import {readPublicProofPresentation, type PublicMarketCatalog, type PublicMarketItem} from '../receiz/public-market';
import {publicSocialCounters} from '../receiz/public-profile-header';
import {publicAccountDisplayName} from '../receiz/account-name';
import {publicDirectoryCardVisible,selectHeldPublicProfile, type PublicProfile} from '../receiz/public-profile';
import {publicProfileDirectoryBindings} from '../receiz/public-profile-directory-contract';

import heldAudience from './audience-held-totals.json';

const earlierAudience=new Map(heldAudience.map(row=>[row.userId,row]));

const documentCatalogs=new WeakMap<PublicNetworkCache,{directory:ObservatoryDirectory;catalog:PublicMarketCatalog}>();
export function documentCatalog(snapshot?:PublicNetworkCache, directory?:ObservatoryDirectory):PublicMarketCatalog|null {
  if (!snapshot || !directory) return null;
  const held=documentCatalogs.get(snapshot);if(held?.directory===directory)return held.catalog;
  const items:PublicMarketItem[]=[];
  for(const row of snapshot.records){
    if(row.source!=='proofs'||row.origin||row.authority!=='public-source-projection') continue;
    const item=readPublicProofPresentation(row.details?.publicAsset);
    if(item && item.id===row.sourceId && item.assetId===row.valueOperands?.assetId && item.originalDigest===(row.evidence.artifactDigest??null) && item.pulse===row.pulse)items.push(item);
  }
  const catalog={...directory,items,sourceCount:items.length,complete:snapshot.coverage.some(c=>c.source==='proofs'&&c.complete)};
  documentCatalogs.set(snapshot,{directory,catalog});return catalog;
}

type CollectionCapitalization={capitalization:string|null;capitalizationPartial?:true};
export interface RankedProfile extends CollectionCapitalization {
  username:string; name:string; createdAt:string|null; stats:PublicProfile['stats'];
  capitalizationAtPrices?:(assets:readonly PublicMarketItem[])=>CollectionCapitalization;
}

function samePricedOriginal(item:PublicMarketItem,other:PublicMarketItem|undefined) {
  return !!other && (item===other || item.id===other.id && !!item.originalDigest && item.originalDigest===other.originalDigest
    && item.assetId===other.assetId && item.pulse===other.pulse && !!item.ownerIdentity
    && item.ownerIdentity.userId===other.ownerIdentity?.userId && item.ownerUsername===other.ownerUsername);
}

export function observeCatalog(catalog:PublicMarketCatalog,audience?:ObservatoryDirectory['audience'],carried?:PublicMarketCatalog) {
  const heldPrices=carried&&carried!==catalog?new Map(carried.items.map(item=>[item.id,item])):null;
  const catalogIndexes=new Map(catalog.items.map((item,index)=>[item.id,index]));
  const capitalization=(profile:PublicProfile)=>{
    if(!profile.items.length)return {capitalization:null};
    const priced=profile.items.map(item=>{
      const prior=heldPrices?.get(item.id);
      const matches=samePricedOriginal(item,prior);
      const carriedInventory=matches?compatibleShareInventory(item,prior?.shareInventory):undefined;
      const currentInventory=compatibleShareInventory(item,item.shareInventory);
      const shareInventory=carriedInventory===currentInventory?currentInventory:mergeShareInventory(carriedInventory,currentInventory??null);
      const priceUsd=item.priceUsd??(matches?prior?.priceUsd??null:null);
      const index=catalogIndexes.get(item.id);
      const quoteIndex=index!==undefined&&samePricedOriginal(item,catalog.items[index])?index:undefined;
      return {...item,priceUsd,shareInventory,quoteIndex};
    });
    const {items,listed}=publicCapitalizationAssets({...catalog,items:priced},{requirePrice:false});
    // Select and bind inventory once per catalog. The asset directory already
    // evaluates the same ordered catalog at the live Kai pulse.
    const terms=items.map(item=>({
      id:item.id,index:item.quoteIndex,priceUsd:item.priceUsd,quantity:marketCapitalizationQuantity(item.shareInventory!)!,
    }));
    const calculate=(assets?:readonly PublicMarketItem[]):CollectionCapitalization=>{
      let total=0n,covered=0;
      for(const {id,index,priceUsd,quantity} of terms){
        const quote=index===undefined?undefined:assets?.[index];
        const price=(quote?.id===id?quote.priceUsd:null)??priceUsd;
        if(price===null||price<0)continue;
        const cents=Math.round(price*100);
        if(!Number.isSafeInteger(cents))continue;
        total+=BigInt(shareCapitalizationUsdCents(String(cents),quantity));
        covered++;
      }
      return {capitalization:covered?total.toString():null,
        ...(listed&&(!catalog.complete||profile.nextCursor||covered!==listed)?{capitalizationPartial:true as const}:{})};
    };
    const observed=calculate();
    return {...observed,...(terms.length?{
      capitalizationAtPrices:(assets:readonly PublicMarketItem[])=>assets===catalog.items?observed:calculate(assets),
    }:{})};
  };
  const bound=publicProfileDirectoryBindings(catalog);
  const cards=new Map(catalog.publicProfileHeads?.map(head=>[String(head.profile.username),head]));
  const names=new Set<string>();
  for(const head of catalog.publicProfileHeads??[])if(bound({userId:head.profile.userId,username:head.profile.username}))names.add(String(head.profile.username));
  for(const item of catalog.items)if(item.ownerIdentity && bound(item.ownerIdentity))names.add(item.ownerIdentity.username);
  const recent=audience&&Date.parse(audience.observedAt)>=(Date.parse(catalog.observedAt??'')||0)?audience:null;
  const readings=new Map(audience?.heads.map(head=>[String(head.profile.userId),head]));
  const statsFor=(uid:string,username:string,base:PublicProfile['stats']):PublicProfile['stats']=>{
    const candidate=readings.get(uid),held=earlierAudience.get(uid);
    const stats=candidate?.profile.username===username?candidate.stats:undefined;
    const next={...base};
    if(stats&&recent){
      next.completion=stats.streamCompletionRatePct??base.completion;
      Object.assign(next,publicSocialCounters(stats));
    }
    const keys={views:'originalViews',plays:'streams',seconds:'witnessedSeconds'} as const;
    for(const metric of ['views','plays','seconds'] as const){
      const published=stats?.[keys[metric]]??null;
      const older=held?.username===username?held.metrics[metric]:undefined;
      const historical=older?.value??null;
      next[metric]=recent?(published??base[metric]??historical):(base[metric]??published??historical);
    }
    return next;
  };
  const holdings=new Map<string,PublicMarketItem[]>();
  for(const item of catalog.items){
    if(item.category!=='proof'||!item.ownerUsername)continue;
    const group=holdings.get(item.ownerUsername);
    if(group)group.push(item);else holdings.set(item.ownerUsername,[item]);
  }
  const profiles:RankedProfile[]=[];
  for(const username of names){
    const card=cards.get(username),items=holdings.get(username)??[];
    // Each handle is already canonical and globally bound. Give the existing
    // owner reader the exact relevant objects once instead of scanning the
    // entire network for every individual profile.
    const family={...catalog,items,publicProfileHeads:card?[card]:[],publicProfileHeadRefusals:catalog.publicProfileHeadRefusals?.filter(p=>p.profile.username===username)};
    if(card?.unavailableDecorators?.includes('profile-details')&&!items.length){
      const uid=card.profile.userId;
      if(typeof uid!=='string'||!publicDirectoryCardVisible(username,uid,family))continue;
      profiles.push({username,name:publicAccountDisplayName(card.profile,username),createdAt:typeof card.profile.createdAt==='string'?card.profile.createdAt:null,stats:statsFor(uid,username,{originals:catalog.complete?0:null,views:null,plays:null,seconds:null,completion:null}),capitalization:null});
      continue;
    }
    const profile=selectHeldPublicProfile(username,family,{artwork:false});
    if(!profile||!bound(profile))continue;
    profiles.push({username:profile.username,name:profile.displayName,createdAt:profile.createdAt,stats:statsFor(profile.userId,username,profile.stats),...capitalization(profile)});
  }
  const sum=(key:'views'|'plays'|'seconds')=>{
    let total=0, covered=0;
    for(const profile of profiles){const value=profile.stats[key];if(value!==null){total+=value;covered++;}}
    return {value:covered?total:null,covered};
  };
  return {profiles,observedAt:recent?.observedAt??catalog.observedAt,views:sum('views'),plays:sum('plays'),seconds:sum('seconds')};
}

export function growthSeries(dates: readonly (string|null)[]) {
  const days = new Map<number, number>();
  const months = new Map<string, number>();
  for (const date of dates) {
    const at = Date.parse(date ?? '');
    if (!Number.isFinite(at)) continue;
    const day = Math.floor(at / 86_400_000) * 86_400_000;
    days.set(day, (days.get(day) ?? 0) + 1);
    const month = new Date(day).toISOString().slice(0, 7);
    months.set(month, (months.get(month) ?? 0) + 1);
  }
  if (!days.size) return null;
  let count = 0;
  const points = [...days].sort(([a], [b]) => a - b).map(([at, added]) => {
    count += added;
    return {at, count};
  });
  return {first: points[0].at, last: points[points.length - 1].at, points,
    months: [...months].sort(([a], [b]) => b.localeCompare(a))};
}
