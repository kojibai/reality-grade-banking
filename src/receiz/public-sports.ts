import { safeReceizPublicUrl, type PublicMarketCatalog, type PublicMarketItem } from './public-market';
import {readPublicSportsValueRow} from './market-projection/source';
function object(value: unknown): Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function cents(value: unknown): string | null { if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null; const result = Math.round(value * 100); return Number.isSafeInteger(result) ? String(result) : null; }
function count(value: unknown): number | null { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 1e9 ? Number(value) : null; }
function sportsInput(input:unknown):Record<string,unknown>|null{const data=object(input);return data.ok===true&&data.schema==='receiz.sports_economy.live_inventory.v1'&&Array.isArray(data.cards)&&data.cards.length<=100000?data:null;}
const captureTime=(at:unknown)=>typeof at==='string'?Date.parse(at):NaN;
function olderCapture(held:unknown,next:unknown):boolean{const before=captureTime(held),after=captureTime(next);return Number.isFinite(before)&&Number.isFinite(after)&&after<before;}
/** A weaker discovery response cannot remove carried copy provenance or models. */
export function retainPublicSportsInput(previous:unknown,input:unknown):unknown{
 const held=sportsInput(previous),next=sportsInput(input);if(!held||!next)return input;
 if(olderCapture(held.generatedAt,next.generatedAt))return previous;
 const oldCards=held.cards as unknown[],cards=next.cards as unknown[];
 if(next.fallback===true&&oldCards.some(raw=>{const card=object(raw);return Number(card.pricedCount)>0||readPublicSportsValueRow(card.valuationRow,card.claimHash)?.sealedCopies?.length;}))return previous;
 const byClaim=new Map(oldCards.map(raw=>{const card=object(raw);return [`${String(card.collectibleId).toLowerCase()}:${String(card.claimHash).toLowerCase()}`,card];}));
 let changed=false;
 const merged=cards.map(raw=>{
  const card=object(raw),prior=byClaim.get(`${String(card.collectibleId).toLowerCase()}:${String(card.claimHash).toLowerCase()}`),row=readPublicSportsValueRow(card.valuationRow,card.claimHash),old=prior&&readPublicSportsValueRow(prior.valuationRow,card.claimHash);
  if(row?.sealedCopies?.length||!old?.sealedCopies?.length)return raw;
  changed=true;return {...card,sealedCopies:prior!.sealedCopies,valuationRow:{...(row??old),sealedCopies:old.sealedCopies}};
 });
 return changed?{...next,cards:merged}:input;
}
export function mergePublicSports(catalog: PublicMarketCatalog, input: unknown): PublicMarketCatalog {
  const data = object(input);
  if (data.ok !== true || data.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(data.cards) || data.cards.length > 100000) return { ...catalog, sportsCoverage: 'missing' };
  if(olderCapture(catalog.sportsObservedAt,data.generatedAt))return catalog;
  const previous=new Map(catalog.items.filter(item=>item.category==='sports').map(item=>[item.assetId.toLowerCase(),item]));
  if(data.fallback===true&&[...previous.values()].some(item=>item.priceUsd!==null||item.sportsValuation))return {...catalog,sportsCoverage:'partial'};
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
    const copies=item.sportsValuation?.sealedCopies;
    if(copies){item.sealedCopies=copies.map(copy=>{
      const rawCopies=Array.isArray(card.sealedCopies)?card.sealedCopies:[],raw=object(rawCopies.find(value=>{const candidate=object(value);return typeof candidate.collectibleId==='string'&&candidate.collectibleId.toLowerCase()===copy.collectibleId&&typeof candidate.claimHash==='string'&&candidate.claimHash.toLowerCase()===copy.claimHash;}));
      const username=typeof raw.ownerUsername==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(raw.ownerUsername)?raw.ownerUsername:null;
      return {collectibleId:copy.collectibleId,claimHash:copy.claimHash,sealedAt:copy.sealedAt,ownerUsername:username,ownerProfileUrl:username?`https://receiz.com/${encodeURIComponent(username)}`:null,ownerDisplayName:typeof raw.ownerDisplayName==='string'&&raw.ownerDisplayName.length<=128?raw.ownerDisplayName:null};
    });}
    const prior=previous.get(normalized);
    if(!copies?.length&&prior?.sportsValuation?.seed===claim&&prior.sportsValuation.sealedCopies?.length){item.sportsValuation={...(item.sportsValuation??prior.sportsValuation),sealedCopies:prior.sportsValuation.sealedCopies};item.sealedCopies=prior.sealedCopies;}
    if(circulation===1&&item.sealedCopies?.length===1){
      const copy=item.sealedCopies[0];item.sealedAt=copy.sealedAt;item.ownerUsername=copy.ownerUsername;item.ownerProfileUrl=copy.ownerProfileUrl;item.ownerDisplayName=copy.ownerDisplayName;
    }
    items.set(normalized, item);
  }
  return { ...catalog, items: [...items.values()], sportsCoverage: complete ? 'complete' : 'partial',sportsObservedAt:typeof data.generatedAt==='string'&&Number.isFinite(Date.parse(data.generatedAt))?data.generatedAt:null };
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
