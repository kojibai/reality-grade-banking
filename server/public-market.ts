import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import { publicMaterialOriginalUrl, safeReceizPublicUrl } from '../src/receiz/public-market.js';
import {publicMarketPulseSeed,publicSportsValueRow} from '../src/receiz/market-projection/source.js';
import {publicSportsSealedCopies,publicSportsSealedBirths} from '../src/receiz/market-projection/sealed-copies.js';
import {boundSportsHistoryObservation,publicSportsGroupIdentity,publicSportsHistorySnapshot} from '../src/receiz/market-projection/sports-observations.js';

const PREFIX = '/api/bank/public-market/';
const MAX_BYTES = 128 * 1024 * 1024;
export function resolvePublicMarketTarget(requestUrl: string): URL | null {
  const local = new URL(requestUrl, 'http://localhost');
  if (local.pathname === `${PREFIX}membership` && !local.search) return new URL('https://receiz.com/api/market/public-membership');
  if (local.pathname === `${PREFIX}sports` && !local.search) return new URL('https://receiz.com/api/game/sports/economy');
  if (local.pathname === `${PREFIX}capitalization` && !local.search) return new URL('https://receiz.com/api/proof-graph/market-cap');
  if (local.pathname === `${PREFIX}quotes` && !local.search) return new URL('https://receiz.com/api/market/public-snapshot?detail=full');
  if(local.pathname===`${PREFIX}provenance`){
    const id=local.searchParams.get('collectibleId'),claim=local.searchParams.get('claimHash');
    if([...local.searchParams.keys()].some(key=>!['collectibleId','claimHash'].includes(key))||local.searchParams.getAll('collectibleId').length!==1||local.searchParams.getAll('claimHash').length!==1||!id||!/^rsc_[a-f0-9]{16}$/i.test(id)||!claim||!/^[a-f0-9]{64}$/i.test(claim))return null;
    return new URL(`/api/game/sports/baseball/cards/${id.toLowerCase()}/provenance?claimHash=${claim.toLowerCase()}`,'https://receiz.com');
  }
  if(local.pathname===`${PREFIX}record`){
    if([...local.searchParams.keys()].some(key=>key!=='path')||local.searchParams.getAll('path').length!==1)return null;
    const path=local.searchParams.get('path');if(!path?.startsWith('/v/'))return null;const safe=safeReceizPublicUrl(path,'proof');if(!safe)return null;
    const proof=new URL(safe),parts=proof.pathname.split('/'),anchor=proof.searchParams.get('a')??'',ms=proof.searchParams.get('ms')??'',tz=proof.searchParams.get('tz');
    if([...proof.searchParams.keys()].some(key=>!['a','ms','tz'].includes(key))||!/^[a-f0-9]{8}$/i.test(anchor)||!/^\d{10,17}$/.test(ms)||!Number.isSafeInteger(Number(ms))||!/^[a-f0-9]{8}$/i.test(parts[3]??'')||tz!==null&&(!/^-?\d{1,4}$/.test(tz)||Number(tz)<-840||Number(tz)>840))return null;
    const query=new URLSearchParams({a:anchor,ms,p:parts[4],c:parts[3]});if(tz!==null)query.set('tz',tz);return new URL(`/api/receiz/download?${query}`,'https://receiz.com');
  }
  if (local.pathname !== `${PREFIX}original` || [...local.searchParams.keys()].some(key => key !== 'path') || local.searchParams.getAll('path').length !== 1) return null;
  const path = local.searchParams.get('path'); if (!path || !path.startsWith('/api/')) return null;
  const target = new URL(path, 'https://receiz.com');
  return safeReceizPublicUrl(target.href, 'original') ? target : null;
}
interface CachedResponse { bytes: Uint8Array; type: string; etag: string | null; fetchedAt: number; }
const cache = new Map<string, CachedResponse>(), pending = new Map<string, Promise<CachedResponse>>();
async function readBounded(response: Response): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Public source exceeds supported size.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Public source returned no bytes.');
  const chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > MAX_BYTES) throw new Error('Public source exceeds supported size.'); chunks.push(value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
async function loadPublicResponse(target: URL): Promise<CachedResponse> {
  const key = target.href, previous = cache.get(key);
  const original = target.pathname === '/api/profile/originals/download' || target.pathname.startsWith('/api/proof-material/packages/')||target.pathname==='/api/receiz/download';
  if (!original && previous && Date.now() - previous.fetchedAt < 60_000) return previous;
  const inflight = pending.get(key); if (inflight) return inflight;
  const attempt = (async () => {
    const response = await fetch(target, { signal: AbortSignal.timeout(90_000), credentials: 'omit', redirect: 'error', headers: previous?.etag ? { 'If-None-Match': previous.etag } : {} });
    if (response.status === 304 && previous) { const current = { ...previous, fetchedAt: Date.now() }; cache.set(key, current); return current; }
    if (!response.ok) throw new Error(`Receiz public source returned ${response.status}.`);
    let bytes = await readBounded(response);
    const type = response.headers.get('content-type') ?? 'application/octet-stream';
    if (!original) {
      if (!type.includes('application/json')) throw new Error('Receiz public source returned an unsupported response.');
      const input = JSON.parse(new TextDecoder().decode(bytes));
      // Drop full works and unrelated private/session fields from discovery transport.
      if(target.pathname.endsWith('/provenance')){
        if(input.ok!==true||!Array.isArray(input.provenance)||input.provenance.length>200)throw Error('Public card history is unavailable.');
        const projected={ok:true,cardId:input.cardId,claimHash:input.claimHash,count:input.count,provenance:input.provenance.map((row:Record<string,unknown>)=>{const owner=row.owner as Record<string,unknown>|null;return {eventKind:row.eventKind,collectibleId:row.collectibleId,claimHash:row.claimHash,appendHash:row.appendHash,occurredAt:row.occurredAt,owner:owner?{username:owner.username,displayName:owner.displayName}:null};})};
        for(const key of Object.keys(input))delete input[key];Object.assign(input,projected);
      } else if (target.pathname.endsWith('public-membership')) {
        const transport = input.transport;
        if (input.ok !== true || !Array.isArray(transport?.publicOriginals)) throw new Error('Receiz public collection is unavailable.');
        input.transport = { generatedAt: transport.generatedAt, publicMembership: transport.publicMembership, publicOriginals: transport.publicOriginals.map((item: Record<string, unknown>) => {
          const profile = item.profileOriginal as Record<string, unknown> | undefined, media = profile?.media as Record<string, unknown> | undefined;
          return { id: item.id, receizId: item.receizId, title: item.title, summary: item.summary, visibility: item.visibility, ownerUsername: item.ownerUsername, ownerDisplayName: item.ownerDisplayName, canonicalHref: item.canonicalHref, verifyHref: item.verifyHref, pulse: item.pulse, createdAt: item.createdAt, valueUsd: item.valueUsd,livePulseSeed:publicMarketPulseSeed(item.livePulseSeed,item.pulse),
            profileOriginal: { hasLongForm:Boolean(profile?.longForm&&typeof (profile.longForm as Record<string,unknown>).text==='string'&&(profile.longForm as Record<string,unknown>).text),readingTzMinutesEast:media?.receiptTzMinutesEast,media: { originalDownloadSrc: media?.originalDownloadSrc, originalDownloadSha256Hex: media?.originalDownloadSha256Hex, material: media?.material ? { sealedArtifactSha256Hex: (media.material as Record<string, unknown>).sealedArtifactSha256Hex, originalArtifactSrc: publicMaterialOriginalUrl((media.material as Record<string, unknown>).proofObjectUrl) } : null } } };
        }) };
      } else if (target.pathname === '/api/game/sports/economy') {
        if (input.ok !== true || input.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(input.cards) || input.cards.length > 100000) throw new Error('Public sports inventory is unavailable.');
        const fields = ['collectibleId', 'claimHash', 'athlete', 'sport', 'rarity', 'issueLine', 'liveValueUsd', 'totalValueUsd', 'issuedCount', 'vaultCount', 'pricedCount', 'route'];
        input.cards = input.cards.map((card: Record<string, unknown>) => {
          const copies=publicSportsSealedCopies(card.sealedCopies),raw=Array.isArray(card.sealedCopies)?card.sealedCopies:[];
          const sealedCopies=copies?.map(copy=>{const carried=raw.find(value=>value?.collectibleId?.toLowerCase()===copy.collectibleId&&value?.claimHash?.toLowerCase()===copy.claimHash) as Record<string,unknown>|undefined;return {...copy,ownerUsername:typeof carried?.ownerUsername==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(carried.ownerUsername)?carried.ownerUsername:null,ownerDisplayName:typeof carried?.ownerDisplayName==='string'&&carried.ownerDisplayName.length<=128?carried.ownerDisplayName:null};});
          const births=publicSportsSealedBirths(card.sealedBirths),rawBirths=Array.isArray(card.sealedBirths)?card.sealedBirths:[];
          const sealedBirths=births?.map(copy=>{const carried=rawBirths.find(value=>value?.collectibleId?.toLowerCase()===copy.collectibleId&&value?.claimHash?.toLowerCase()===copy.claimHash) as Record<string,unknown>|undefined;return {...copy,ownerUsername:typeof carried?.ownerUsername==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(carried.ownerUsername)?carried.ownerUsername:null,ownerDisplayName:typeof carried?.ownerDisplayName==='string'&&carried.ownerDisplayName.length<=128?carried.ownerDisplayName:null};});
          const valuationRow=publicSportsValueRow(card),historyObservation=valuationRow?.historyObservation;
          return {...Object.fromEntries(fields.map(key => [key, card[key]])),...(sealedCopies?{sealedCopies}:{}),...(sealedBirths?{sealedBirths}:{}),...(historyObservation?{historyObservation}:{}),valuationRow};
        });
        const metadataAt=typeof input.sealedBirthsObservedAt==='string'&&input.sealedBirthsObservedAt.length<=64&&Number.isFinite(Date.parse(input.sealedBirthsObservedAt))?input.sealedBirthsObservedAt:undefined;
        const historySnapshot=publicSportsHistorySnapshot(input.historySnapshot);
        const publicInput = { ok: true, schema: input.schema, generatedAt: input.generatedAt,...(metadataAt?{sealedBirthsObservedAt:metadataAt}:{}),...(historySnapshot?{historySnapshot}:{}), fallback: input.fallback === true, cards: input.cards };
        for (const key of Object.keys(input)) delete input[key];
        Object.assign(input, publicInput);
      } else if (target.pathname === '/api/proof-graph/market-cap') {
        const publicInput = curatePublicCapitalization(input);
        for (const key of Object.keys(input)) delete input[key];
        Object.assign(input, publicInput);
      } else if (input.data) { input.data = { schema: input.data.schema, liveMarkets: input.data.liveMarkets }; }
      bytes = new TextEncoder().encode(JSON.stringify(input));
    }
    const current = { bytes, type, etag: response.headers.get('etag'), fetchedAt: Date.now() };
    if (!original) cache.set(key, current); return current;
  })().finally(() => pending.delete(key));
  pending.set(key, attempt); return attempt;
}
export async function publicMarketMiddleware(request: IncomingMessage, response: ServerResponse, next: () => void): Promise<void> {
  if (!request.url?.startsWith(PREFIX)) { next(); return; }
  response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') { response.writeHead(405, { Allow: 'GET' }); response.end(); return; }
  const target = resolvePublicMarketTarget(request.url); if (!target) { response.writeHead(400); response.end(); return; }
  try { const result = await loadPublicResponse(target); response.setHeader('Content-Type', result.type); response.writeHead(200); response.end(result.bytes); }
  catch { response.writeHead(503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ ok: false, error: 'Receiz public source is temporarily unavailable.' })); }
}
/** Build-time public discovery seed. Report-only projection, never a held account. */
export async function readReceizPublicMarketSource(kind: 'membership' | 'quotes' | 'sports' | 'capitalization'): Promise<unknown> {
  const target = resolvePublicMarketTarget(`${PREFIX}${kind}`); if (!target) throw new Error('Unsupported public source.');
  return JSON.parse(new TextDecoder().decode((await loadPublicResponse(target)).bytes));
}
/** Only public fields used by the canonical display projector cross this boundary. */
export function curatePublicCapitalization(input: Record<string, unknown>) {
  const seed = input.marketCapProjection as Record<string, unknown> | undefined;
  if (input.ok !== true || !seed || !Array.isArray(seed.valueRows) || seed.valueRows.length > 10000) throw new Error('Public capitalization source is unavailable.');
  const fields = ['schema', 'source', 'proofObjectHash', 'generatedAt', 'firstIssuancePulse', 'serverPulse', 'currentUsd', 'cardsInCirculation', 'sportsCardsPriced', 'marketAssetsPriced'];
  const unpricedSealedBirths=publicSportsSealedBirths(seed.unpricedSealedBirths);
  const sportsHistorySnapshot=publicSportsHistorySnapshot(seed.sportsHistorySnapshot),pulse=(value:unknown)=>Number.isSafeInteger(value)&&Number(value)>=0&&Number(value)<=1e10;
  const evaluation=seed.sourceEvaluation as Record<string,unknown>|undefined,sourceEvaluation=evaluation&&pulse(evaluation.pulse)&&typeof evaluation.usdValue==='number'&&Number.isFinite(evaluation.usdValue)&&evaluation.usdValue>=0&&evaluation.usdValue<=1e13&&typeof evaluation.sourceHash==='string'&&/^[a-f0-9]{64}$/.test(evaluation.sourceHash)?{pulse:evaluation.pulse,usdValue:evaluation.usdValue,sourceHash:evaluation.sourceHash}:undefined;
  return { ok: true, marketCapProjection: { ...Object.fromEntries(fields.map(key => [key, seed[key]])),...(sportsHistorySnapshot?{sportsHistorySnapshot}:{}),...(pulse(seed.sportsHistoryEvaluationPulse)?{sportsHistoryEvaluationPulse:seed.sportsHistoryEvaluationPulse}:{}),...(sourceEvaluation?{sourceEvaluation}:{}),...(unpricedSealedBirths?{unpricedSealedBirths}:{}), valueRows: seed.valueRows.map((row: Record<string, unknown>) => {
    const item = row.marketItem as Record<string, unknown> | undefined, meta = item?.livePulseSeed as Record<string, unknown> | undefined;
    const sealedCopies=publicSportsSealedCopies(row.sealedCopies),sealedBirths=publicSportsSealedBirths(row.sealedBirths),sportsGroup=publicSportsGroupIdentity(row.sportsGroup),historyObservation=boundSportsHistoryObservation(row.historyObservation,{id:String(row.id),seed:String(row.seed),sportsGroup,sealedCopies,sealedBirths});
    return { ...Object.fromEntries(['id', 'source', 'baseUsdValue', 'birthUsdValue', 'marketUsdValue', 'proofTotalValueUsd', 'scoreDelta', 'seed', 'quoteUsdPerPhi'].map(key => [key, row[key]])),...(sportsGroup?{sportsGroup}:{}),...(sealedCopies?{sealedCopies}:{}),...(sealedBirths?{sealedBirths}:{}),...(historyObservation?{historyObservation}:{}),...(pulse(row.historyEvaluationPulse)?{historyEvaluationPulse:row.historyEvaluationPulse}:{}), ...(item ? { marketItem: { ...Object.fromEntries(['id', 'source', 'priceUsd', 'pricePhi', 'quoteUsdPerPhi', 'changePct', 'pricingSourceKey'].map(key => [key, item[key]])), ...(meta ? { livePulseSeed: Object.fromEntries(['kind', 'claimPulse', 'beat', 'stepIndex', 'creatorVerified', 'chakraDay', 'kaiSignature', 'userPhiKey'].map(key => [key, meta[key]])) } : {}) } } : {}) };
  }) } };
}
export function publicMarketPlugin(): Plugin { return { name: 'receiz-public-market', configureServer(server) { server.middlewares.use((req, res, next) => { void publicMarketMiddleware(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req, res, next) => { void publicMarketMiddleware(req, res, next); }); } }; }
