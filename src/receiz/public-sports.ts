import { safeReceizPublicUrl, type PublicMarketCatalog, type PublicMarketItem } from './public-market';
import {readPublicSportsValueRow} from './market-projection/source';
import {publicSportsSealedBirths} from './market-projection/sealed-copies';
function object(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function cents(value: unknown): string | null { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null; const result = Math.round(value * 100); return Number.isSafeInteger(result) ? String(result) : null; }
function count(value: unknown): number | null { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1e9 ? Number(value) : null; }
function sportsInput(input:unknown):Record<string,unknown>|null{const data=object(input);return data.ok===true&&data.schema==='receiz.sports_economy.live_inventory.v1'&&Array.isArray(data.cards)&&data.cards.length<=100000?data:null;}
const captureTime=(at:unknown)=>typeof at==='string'?Date.parse(at):NaN;
function olderCapture(held:unknown,next:unknown):boolean{const before=captureTime(held),after=captureTime(next);return Number.isFinite(before)&&Number.isFinite(after)&&after<before;}
const metadataAt=(data:Record<string,unknown>)=>typeof data.sealedBirthsObservedAt==='string'&&data.sealedBirthsObservedAt.length<=64&&Number.isFinite(Date.parse(data.sealedBirthsObservedAt))?data.sealedBirthsObservedAt:data.generatedAt;
const cardKey=(card:Record<string,unknown>)=>`${String(card.collectibleId).toLowerCase()}:${String(card.claimHash).toLowerCase()}`;
const itemClaim=(item:PublicMarketItem)=>item.sportsValuation?.seed??item.sealedBirths?.find(copy=>copy.collectibleId===item.assetId.toLowerCase())?.claimHash;
/** A weaker discovery response cannot remove carried copy provenance or models. */
export function retainPublicSportsInput(previous:unknown,input:unknown):unknown{
 const held=sportsInput(previous),next=sportsInput(input);if(!held||!next)return input;
 const oldCards=held.cards as unknown[],rejectPrices=olderCapture(held.generatedAt,next.generatedAt)||next.fallback===true&&oldCards.some(raw=>{const card=object(raw);return Number(card.pricedCount)>0||readPublicSportsValueRow(card.valuationRow,card.claimHash)?.sealedCopies?.length;});
 const base=rejectPrices?held:next,other=rejectPrices?next:held,cards=base.cards as unknown[];
 const byClaim=new Map((other.cards as unknown[]).map(raw=>{const card=object(raw);return [cardKey(card),card];}));
 let changed=false;
 const merged=cards.map(raw=>{
  const card=object(raw),prior=byClaim.get(cardKey(card)),row=readPublicSportsValueRow(card.valuationRow,card.claimHash),old=prior&&readPublicSportsValueRow(prior.valuationRow,card.claimHash);
  const full=!row?.sealedCopies?.length&&old?.sealedCopies?.length?old.sealedCopies:undefined;
  const oldBirths=prior&&publicSportsSealedBirths(prior.sealedBirths),births=publicSportsSealedBirths(card.sealedBirths);
  const carryBirths=oldBirths&&(!births||olderCapture(metadataAt(base),metadataAt(other))===false&&metadataAt(base)!==metadataAt(other));
  if(!full&&!carryBirths)return raw;
  changed=true;const sealedBirths=carryBirths?prior!.sealedBirths:card.sealedBirths;
  return {...card,...(full?{sealedCopies:prior!.sealedCopies}:{}),...(carryBirths?{sealedBirths}:{}),valuationRow:{...(row??old),...(full?{sealedCopies:full}:{}),...(sealedBirths?{sealedBirths:publicSportsSealedBirths(sealedBirths)}:{})}};
 });
 const extras=rejectPrices&&!olderCapture(metadataAt(held),metadataAt(next))?next:!rejectPrices&&olderCapture(metadataAt(held),metadataAt(next))?held:null;
 if(extras){
  const ids=new Set(cards.map(raw=>cardKey(object(raw))));
  for(const raw of extras.cards as unknown[]){const card=object(raw);if(!ids.has(cardKey(card))&&publicSportsSealedBirths(card.sealedBirths)&&!readPublicSportsValueRow(card.valuationRow,card.claimHash)&&card.pricedCount===0&&card.liveValueUsd==null&&card.totalValueUsd==null){merged.push(raw);changed=true;ids.add(cardKey(card));}}
 }
 const baseHasBirths=cards.some(raw=>publicSportsSealedBirths(object(raw).sealedBirths)),otherHasBirths=(other.cards as unknown[]).some(raw=>publicSportsSealedBirths(object(raw).sealedBirths));
 const newestMetadata=baseHasBirths&&otherHasBirths?(olderCapture(metadataAt(base),metadataAt(other))?metadataAt(base):metadataAt(other)):baseHasBirths?metadataAt(base):otherHasBirths?metadataAt(other):undefined;
 return changed?{...base,cards:merged,...(typeof newestMetadata==='string'?{sealedBirthsObservedAt:newestMetadata}:{})}:rejectPrices?previous:input;
}
/** Owners can be refreshed independently of the retained aggregate price. */
function applyCopyMetadata(item:PublicMarketItem,card:Record<string,unknown>,prior:PublicMarketItem|undefined,birthsFresh:boolean,birthsNewerThanFull:boolean){
 const row=item.sportsValuation,old=prior?.sportsValuation;
 if(row&&!row.sealedCopies?.length&&old?.seed===row.seed&&old.sealedCopies?.length)item.sportsValuation={...row,sealedCopies:old.sealedCopies};
 const incoming=publicSportsSealedBirths(card.sealedBirths)??row?.sealedBirths,retained=itemClaim(prior??item)===card.claimHash?old?.sealedBirths??prior?.sealedBirths:undefined;
 const births=incoming&&(birthsFresh||!retained)?incoming:retained;
 if(births)item.sealedBirths=births;
 if(item.sportsValuation&&births)item.sportsValuation={...item.sportsValuation,sealedBirths:births};
 const full=item.sportsValuation?.sealedCopies,display=full??births;
 if(!display?.length)return;
 const oldDisplay=new Map((prior?.sealedCopies??[]).map(copy=>[`${copy.collectibleId}:${copy.claimHash}`,copy]));
 const rawFull=Array.isArray(card.sealedCopies)?card.sealedCopies:[],rawBirths=Array.isArray(card.sealedBirths)?card.sealedBirths:[];
 const find=(values:unknown[],id:string,claim:string)=>object(values.find(value=>{const raw=object(value);return typeof raw.collectibleId==='string'&&raw.collectibleId.toLowerCase()===id&&typeof raw.claimHash==='string'&&raw.claimHash.toLowerCase()===claim;}));
 item.sealedCopies=display.map(copy=>{
  const priorCopy=oldDisplay.get(`${copy.collectibleId}:${copy.claimHash}`),born=find(rawBirths,copy.collectibleId,copy.claimHash),observed=find(rawFull,copy.collectibleId,copy.claimHash);
  const owner=birthsFresh&&incoming&&(!full||birthsNewerThanFull)&&Object.keys(born).length?born:Object.keys(observed).length?observed:priorCopy??born;
  const username=typeof owner.ownerUsername==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(owner.ownerUsername)?owner.ownerUsername:null;
  return {collectibleId:copy.collectibleId,claimHash:copy.claimHash,sealedAt:copy.sealedAt,ownerUsername:username,ownerProfileUrl:username?`https://receiz.com/${encodeURIComponent(username)}`:null,ownerDisplayName:typeof owner.ownerDisplayName==='string'&&owner.ownerDisplayName.length<=128?owner.ownerDisplayName:null};
 });
 if(item.circulationCount===1&&item.sealedCopies.length===1){const copy=item.sealedCopies[0];item.sealedAt=copy.sealedAt;item.ownerUsername=copy.ownerUsername;item.ownerProfileUrl=copy.ownerProfileUrl;item.ownerDisplayName=copy.ownerDisplayName;}
}
export function mergePublicSports(catalog: PublicMarketCatalog, input: unknown): PublicMarketCatalog {
  const data = object(input);
  if (data.ok !== true || data.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(data.cards) || data.cards.length > 100000) return { ...catalog, sportsCoverage: 'missing' };
  const birthsFresh=!olderCapture(catalog.sportsSealedBirthsObservedAt,metadataAt(data));
  const previous=new Map(catalog.items.filter(item=>item.category==='sports').map(item=>[item.assetId.toLowerCase(),item]));
  const keepPrices=olderCapture(catalog.sportsObservedAt,data.generatedAt)||data.fallback===true&&[...previous.values()].some(item=>item.priceUsd!==null||item.sportsValuation);
  if(keepPrices){
   if(!birthsFresh)return catalog;
   const incoming=new Map(data.cards.map(raw=>{const card=object(raw);return [cardKey(card),card];}));let changed=false;
   const items=catalog.items.map(prior=>{const card=incoming.get(`${prior.assetId.toLowerCase()}:${itemClaim(prior)}`);if(!card||!publicSportsSealedBirths(card.sealedBirths))return prior;const item={...prior};applyCopyMetadata(item,card,prior,true,!olderCapture(catalog.sportsObservedAt,metadataAt(data)));changed=true;return item;});
   const existing=new Set(items.map(item=>item.assetId.toLowerCase())),extra=data.cards.filter(raw=>{const card=object(raw);return !existing.has(String(card.collectibleId).toLowerCase())&&publicSportsSealedBirths(card.sealedBirths)&&!readPublicSportsValueRow(card.valuationRow,card.claimHash)&&card.pricedCount===0&&card.liveValueUsd==null&&card.totalValueUsd==null;});
   if(extra.length){const added=mergePublicSports({...catalog,items:[],sportsObservedAt:null,sportsSealedBirthsObservedAt:null},{...data,fallback:false,cards:extra});items.push(...added.items);changed||=added.items.length>0;}
   return changed?{...catalog,items,sportsSealedBirthsObservedAt:metadataAt(data) as string,...(data.fallback===true||extra.length?{sportsCoverage:'partial' as const}:{})}:data.fallback===true?{...catalog,sportsCoverage:'partial'}:catalog;
  }
  const items = new Map(catalog.items.filter(item => item.category !== 'sports').map(item => [/^rsc_[a-f0-9]{16}$/i.test(item.assetId) ? item.assetId.toLowerCase() : item.assetId, item]));
  let complete = data.fallback !== true;
  for (const raw of data.cards) {
    const card = object(raw), id = card.collectibleId, claim = card.claimHash;
    if (typeof id !== 'string' || !/^rsc_[a-f0-9]{16}$/i.test(id) || typeof claim !== 'string' || !/^[a-f0-9]{64}$/i.test(claim) || !['baseball', 'soccer', 'fight'].includes(String(card.sport)) || typeof card.athlete !== 'string' || !card.athlete || card.athlete.length > 160) { complete = false; continue; }
    const issued = count(card.issuedCount), vault = count(card.vaultCount), pricedRaw = count(card.pricedCount);
    const circulation = Math.max(issued ?? 0, vault ?? 0, pricedRaw ?? 0, 1), priced = pricedRaw ?? 0;
    if (issued === null || vault === null || pricedRaw === null || vault > (issued ?? 0) || priced > (vault ?? 0)) complete = false;
    const total = cents(card.totalValueUsd), unit = cents(card.liveValueUsd);
    if (total === null || unit === null || priced !== circulation) complete = false;
    const normalized = id.toLowerCase(), existing = items.get(normalized);
    if (existing?.category === 'sports') continue;
    const item: PublicMarketItem = { id: existing?.id ?? `sports:${normalized}`, assetId: normalized, title: card.athlete, summary: `${card.sport} · ${typeof card.rarity === 'string' ? card.rarity.slice(0, 40) : 'Sports card'}${typeof card.issueLine === 'string' ? ` · ${card.issueLine.slice(0, 100)}` : ''}`, category: 'sports', sourceUrl: safeReceizPublicUrl(card.route), verifyUrl: null, originalUrl: null, originalDigest: null, pulse: null, sealedAt: null, ownerUsername: null, ownerDisplayName: null, ownerProfileUrl: null, priceUsd: unit === null ? null : Number(unit) / 100, changePct: null, chart: [], circulationCount: circulation, pricedCount: priced, capitalizationUsdCents: total, authority: 'projection-only', canTrade: false };
    item.sportsValuation=readPublicSportsValueRow(card.valuationRow,claim);
    const prior=previous.get(normalized);
    if(!item.sportsValuation&&prior?.sportsValuation?.seed===claim)item.sportsValuation=prior.sportsValuation;
    applyCopyMetadata(item,card,prior,birthsFresh,!olderCapture(data.generatedAt,metadataAt(data)));
    items.set(normalized, item);
  }
  // A quote capture cannot erase groups from a newer metadata capture.
  if(!birthsFresh)for(const prior of previous.values())if(!prior.sportsValuation&&prior.sealedBirths?.length&&!items.has(prior.assetId.toLowerCase())){items.set(prior.assetId.toLowerCase(),prior);complete=false;}
  return { ...catalog, items: [...items.values()], sportsCoverage: complete ? 'complete' : 'partial',sportsObservedAt:typeof data.generatedAt==='string'&&Number.isFinite(Date.parse(data.generatedAt))?data.generatedAt:null,sportsSealedBirthsObservedAt:birthsFresh&&data.cards.some(raw=>publicSportsSealedBirths(object(raw).sealedBirths))?metadataAt(data) as string:catalog.sportsSealedBirthsObservedAt };
}
export async function fetchPublicSports(signal?: AbortSignal): Promise<unknown> {
  const response = await fetch('/api/bank/public-market/sports', { credentials: 'omit', signal });
  if (!response.ok) throw new Error('Public sports inventory could not be refreshed.');
  const input = await response.json(); if (input.ok !== true || input.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(input.cards)) throw new Error('Public sports inventory is unavailable.');
  let retained:unknown=input,rejectedOlder=false;
  try {const held=JSON.parse(localStorage.getItem('receiz-bank-public-sports-v1')??'null');rejectedOlder=!!sportsInput(held)&&olderCapture(object(held).generatedAt,input.generatedAt);retained=retainPublicSportsInput(held,input);localStorage.setItem('receiz-bank-public-sports-v1',JSON.stringify(retained));} catch { /* Public discovery retention is optional. */ }
  if(rejectedOlder)return {...object(retained),fallback:true};
  return input.fallback===true?input:retained;
}
