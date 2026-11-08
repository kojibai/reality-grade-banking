import {curatePublicProfileHead} from '../src/receiz/public-profile-header.js';
import {publicClaimHash} from '../src/receiz/public-claim-hash.js';
import {publicCarriedText} from '../src/receiz/public-carried-text.js';
import {publicNativeAssetBinding} from '../src/receiz/native-asset-public-binding.js';
import {safeImportedSourceUrl} from '../src/receiz/imported-source-url.js';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';
import {publicAssetTitle,publicAuthoredAssetTitle} from '../src/receiz/asset-title.js';
import {publicMediaPlayback} from '../src/receiz/public-asset-embed.js';
import {publicDocumentUrl} from '../src/receiz/public-document.js';
import {publicDocumentMiddleware} from './public-document.js';
import { publicMaterialOriginalUrl,publicMediaArtworkUrl,publicMediaKind,publicOriginalCreator,publicOriginalProvenance,safeReceizArtworkUrl, safeReceizPublicUrl } from '../src/receiz/public-market.js';
import {publicMarketPulseSeed,publicSportsValueRow} from '../src/receiz/market-projection/source.js';
import {publicSportsSealedCopies,publicSportsSealedBirths} from '../src/receiz/market-projection/sealed-copies.js';
import {boundSportsHistoryObservation,publicSportsGroupIdentity,publicSportsHistorySnapshot} from '../src/receiz/market-projection/sports-observations.js';
import {profileAvatarUrl} from '../src/receiz/profile-avatar.js';
import {projectPublicCollectiblePresentation} from '../src/receiz/public-collectible-presentation.js';

const PREFIX = '/api/bank/public-market/';
const MAX_BYTES = 128 * 1024 * 1024;
export function resolvePublicMarketTarget(requestUrl: string): URL | null {
  const local = new URL(requestUrl, 'http://localhost');
  if (local.pathname === `${PREFIX}membership` && (!local.search||local.searchParams.size===1&&local.searchParams.getAll('afterPublication').length===1&&/^[a-f0-9]{64}$/.test(local.searchParams.get('afterPublication')??''))) return new URL('https://receiz.com/api/market/public-membership');
  if (local.pathname === `${PREFIX}sports` && !local.search) return new URL('https://receiz.com/api/game/sports/economy');
  if (local.pathname === `${PREFIX}capitalization` && !local.search) return new URL('https://receiz.com/api/proof-graph/market-cap');
  if(local.pathname===`${PREFIX}quotes`&&(!local.search||local.searchParams.size===1&&(local.searchParams.getAll('afterTrade').length===1&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(local.searchParams.get('afterTrade')??'')||local.searchParams.getAll('afterPublication').length===1&&/^[a-f0-9]{64}$/.test(local.searchParams.get('afterPublication')??'')))){const target=new URL('https://receiz.com/api/market/public-snapshot?detail=full&projection=asset-quotes');if(local.searchParams.has('afterTrade'))target.searchParams.set('afterTrade',local.searchParams.get('afterTrade')!);return target;}
  if(local.pathname===`${PREFIX}provenance`){
    const id=local.searchParams.get('collectibleId'),claim=local.searchParams.get('claimHash');
    if([...local.searchParams.keys()].some(key=>!['collectibleId','claimHash'].includes(key))||local.searchParams.getAll('collectibleId').length!==1||local.searchParams.getAll('claimHash').length!==1||!id||!/^rsc_[a-f0-9]{16}$/i.test(id)||!claim||!/^[a-f0-9]{64}$/i.test(claim))return null;
    return new URL(`/api/game/sports/baseball/cards/${id.toLowerCase()}/provenance?claimHash=${claim.toLowerCase()}`,'https://receiz.com');
  }
  if(local.pathname===`${PREFIX}record`){
    if([...local.searchParams.keys()].some(key=>key!=='path')||local.searchParams.getAll('path').length!==1)return null;
    const path=local.searchParams.get('path');if(!path?.startsWith('/v/')||path.length>8192)return null;
    const proof=new URL(path,'https://receiz.com'),parts=proof.pathname.split('/'),anchor=proof.searchParams.get('a')??'',ms=proof.searchParams.get('ms')??'',tz=proof.searchParams.get('tz');
    if(proof.origin!=='https://receiz.com'||proof.hash||[...proof.searchParams.keys()].some(key=>proof.searchParams.getAll(key).length!==1))return null;
    const payloadToken=proof.searchParams.get('p');
    if(payloadToken){
      if([...proof.searchParams.keys()].some(key=>!['a','ms','tz','p'].includes(key))||payloadToken.length>18000||!/^\/v\/\d{8}_\d{4}\/[a-z0-9]{8,32}\/\d{1,24}$/i.test(proof.pathname)||ms!==''&&!/^\d{1,17}$/.test(ms)||anchor!==''&&!/^[a-f0-9]{8}$/i.test(anchor)||tz!==null&&(!/^-?\d{1,4}$/.test(tz)||Number(tz)<-840||Number(tz)>840))return null;
      return proof;
    }
    if(!safeReceizPublicUrl(path,'proof')||[...proof.searchParams.keys()].some(key=>!['a','ms','tz'].includes(key))||!/^[a-f0-9]{8}$/i.test(anchor)||!/^\d{10,17}$/.test(ms)||!Number.isSafeInteger(Number(ms))||!/^[a-f0-9]{8}$/i.test(parts[3]??'')||tz!==null&&(!/^-?\d{1,4}$/.test(tz)||Number(tz)<-840||Number(tz)>840))return null;
    const query=new URLSearchParams({a:anchor,ms,p:parts[4],c:parts[3]});if(tz!==null)query.set('tz',tz);return new URL(`/api/receiz/download?${query}`,'https://receiz.com');
  }
  if (![`${PREFIX}original`,`${PREFIX}resource`].includes(local.pathname) || [...local.searchParams.keys()].some(key => key !== 'path') || local.searchParams.getAll('path').length !== 1) return null;
  const path = local.searchParams.get('path'); if (!path || !path.startsWith('/api/')) return null;
  const target = new URL(path, 'https://receiz.com');
  return (local.pathname===`${PREFIX}resource`?safeImportedSourceUrl(target.href,'media'):safeReceizPublicUrl(target.href,'original')) ? target : null;
}
interface CachedResponse { bytes: Uint8Array; type: string; etag: string | null; fetchedAt: number; profileHeads?:readonly unknown[]; }
class OriginalPurchaseRefusal extends Error {}
const epochs=new Map<string,number>();
const cache = new Map<string, CachedResponse>(), pending = new Map<string, Promise<CachedResponse>>();
async function readBounded(response: Response): Promise<Uint8Array> {
  if (Number(response.headers.get('content-length')) > MAX_BYTES) throw new Error('Public source exceeds supported size.');
  const reader = response.body?.getReader(); if (!reader) throw new Error('Public source returned no bytes.');
  const chunks: Uint8Array[] = []; let length = 0;
  try { for (;;) { const { value, done } = await reader.read(); if (done) break; length += value.length; if (length > MAX_BYTES) throw new Error('Public source exceeds supported size.'); chunks.push(value); } }
  catch (error) { await reader.cancel().catch(() => {}); throw error; }
  const bytes = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; } return bytes;
}
async function loadPublicResponse(target: URL,afterPublication?:string): Promise<CachedResponse> {
  // Receipt codecs belong to an explicit file request, never API startup or
  // ordinary public navigation. The existing native exporter owns the file.
  if(target.pathname.startsWith('/v/')){
    const [{decodeSharePayload},{buildWalletLedgerReceiptDownloadHrefFromPayload}]=await Promise.all([import('../native/receiz/app/utils/shareBundleCodec.js'),import('../native/receiz/app/lib/transactions/walletLedgerLinks.js')]);
    const payload=decodeSharePayload(target.searchParams.get('p')!);if(!payload||typeof payload!=='object'||Array.isArray(payload))throw Error('Native receipt payload is unavailable.');
    const parts=target.pathname.split('/');target=new URL(buildWalletLedgerReceiptDownloadHrefFromPayload({payload:payload as Record<string,unknown>,slug:parts[2],code:parts[3],pulse:parts[4],ms:target.searchParams.get('ms'),anchorId:target.searchParams.get('a'),presentation:'public-proof'}),'https://receiz.com');
  }
  const cacheTarget=new URL(target);if(cacheTarget.pathname==='/api/market/public-snapshot')cacheTarget.searchParams.delete('afterTrade');
  const key = cacheTarget.href, previous = cache.get(key),pendingKey=afterPublication?key+":after:"+afterPublication:key;
  const original = target.pathname === '/api/profile/originals/download' || target.pathname.startsWith('/api/proof-material/packages/')||target.pathname==='/api/receiz/download'||target.pathname==='/api/transactions/moment-card'||target.pathname==='/api/profile/showcase/imported-source';
  if (!afterPublication && !original && previous && Date.now() - previous.fetchedAt < 60_000) return previous;
  const inflight = pending.get(pendingKey); if (inflight) return inflight;
  const epoch=(epochs.get(key)??0)+1;epochs.set(key,epoch);
  const attempt = (async () => {
    const response = await fetch(target, { signal: AbortSignal.timeout(90_000), credentials: 'omit', redirect: 'error', ...(afterPublication?{cache:'no-store' as const}:{}),headers: !afterPublication&&previous?.etag ? { 'If-None-Match': previous.etag } : {} });
    if (response.status === 304 && previous) { const current = { ...previous, fetchedAt: Date.now() }; if(epochs.get(key)===epoch)cache.set(key, current); return current; }
    if(response.status===402&&target.pathname==='/api/profile/originals/download'){await response.body?.cancel().catch(()=>{});throw new OriginalPurchaseRefusal();}
    if (!response.ok) throw new Error(`Receiz public source returned ${response.status}.`);
    let bytes = await readBounded(response);let profileHeads:readonly unknown[]|undefined;
    const type = response.headers.get('content-type') ?? 'application/octet-stream';
    if (!original) {
      if (!type.includes('application/json')) throw new Error('Receiz public source returned an unsupported response.');
      const input = JSON.parse(new TextDecoder().decode(bytes));
      // Project public discovery fields only; carried audio lyrics remain available
      // in the same response so reading does not reopen the Original.
      if(target.pathname.endsWith('/provenance')){
        if(input.ok!==true||!Array.isArray(input.provenance)||input.provenance.length>200)throw Error('Public card history is unavailable.');
        const projected={ok:true,cardId:input.cardId,claimHash:input.claimHash,count:input.count,provenance:input.provenance.map((row:Record<string,unknown>)=>{const owner=row.owner as Record<string,unknown>|null;return {eventKind:row.eventKind,collectibleId:row.collectibleId,claimHash:row.claimHash,appendHash:row.appendHash,occurredAt:row.occurredAt,owner:owner?{username:owner.username,displayName:owner.displayName}:null};})};
        for(const key of Object.keys(input))delete input[key];Object.assign(input,projected);
      } else if (target.pathname.endsWith('public-membership')) {
        const raw=input?.transport?.publicProfileHeads;if(Array.isArray(raw)&&raw.every((head:Record<string,unknown>)=>{const profile=head?.profile as Record<string,unknown>|undefined,viewer=head?.viewer as Record<string,unknown>|undefined,stats=head?.stats as Record<string,unknown>|undefined;return profile?.isPrivate===false&&typeof profile.userId==='string'&&typeof profile.username==='string'&&viewer?.canView===true&&viewer.isOwner===false&&viewer.isSignedIn===false&&viewer.canEdit===false&&Number.isSafeInteger(stats?.originals)&&Number(stats?.originals)>=0&&Number.isSafeInteger(stats?.signedOriginals)&&Number(stats?.signedOriginals)>=0&&Number(stats?.signedOriginals)<=Number(stats?.originals);}))profileHeads=raw.map(({profile,viewer,stats}:Record<string,unknown>)=>({profile,viewer,stats}));
        curatePublicMarketMembership(input);
      } else if (target.pathname === '/api/game/sports/economy') {
        if (input.ok !== true || input.schema !== 'receiz.sports_economy.live_inventory.v1' || !Array.isArray(input.cards) || input.cards.length > 100000) throw new Error('Public sports inventory is unavailable.');
        const fields = ['collectibleId', 'claimHash', 'athlete', 'sport', 'rarity', 'issueLine', 'liveValueUsd', 'totalValueUsd', 'issuedCount', 'vaultCount', 'pricedCount', 'route'];
        input.cards = input.cards.map((card: Record<string, unknown>) => {
          const copies=publicSportsSealedCopies(card.sealedCopies),raw=Array.isArray(card.sealedCopies)?card.sealedCopies:[];
          const sealedCopies=copies?.map(copy=>{const carried=raw.find(value=>value?.collectibleId?.toLowerCase()===copy.collectibleId&&value?.claimHash?.toLowerCase()===copy.claimHash) as Record<string,unknown>|undefined;return {...copy,ownerUsername:typeof carried?.ownerUsername==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(carried.ownerUsername)?carried.ownerUsername:null,ownerDisplayName:typeof carried?.ownerDisplayName==='string'&&carried.ownerDisplayName.length<=128?carried.ownerDisplayName:null};});
          const births=publicSportsSealedBirths(card.sealedBirths),rawBirths=Array.isArray(card.sealedBirths)?card.sealedBirths:[];
          const sealedBirths=births?.map(copy=>{const carried=rawBirths.find(value=>value?.collectibleId?.toLowerCase()===copy.collectibleId&&value?.claimHash?.toLowerCase()===copy.claimHash) as Record<string,unknown>|undefined;return {...copy,ownerUsername:typeof carried?.ownerUsername==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(carried.ownerUsername)?carried.ownerUsername:null,ownerDisplayName:typeof carried?.ownerDisplayName==='string'&&carried.ownerDisplayName.length<=128?carried.ownerDisplayName:null};});
          const valuationRow=publicSportsValueRow(card),historyObservation=valuationRow?.historyObservation;
          const imageUrl=safeReceizArtworkUrl(card.imageUrl);
          const presentation=projectPublicCollectiblePresentation(card);
          return {...Object.fromEntries(fields.map(key => [key, card[key]])),...(imageUrl?{imageUrl}:{}),...(presentation?{presentation}:{}),...(sealedCopies?{sealedCopies}:{}),...(sealedBirths?{sealedBirths}:{}),...(historyObservation?{historyObservation}:{}),valuationRow};
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
      } else if (input.data) { input.data = { schema: input.data.schema, ...(typeof input.data.generatedAt==='string'&&Number.isFinite(Date.parse(input.data.generatedAt))?{generatedAt:input.data.generatedAt}:{}), ...(typeof input.data.serverPulse==='number'&&Number.isSafeInteger(input.data.serverPulse)&&input.data.serverPulse>=0||typeof input.data.serverPulse==='string'&&/^\d{1,24}$/.test(input.data.serverPulse)?{serverPulse:input.data.serverPulse}:{}), liveMarkets: input.data.liveMarkets }; }
      bytes = new TextEncoder().encode(JSON.stringify(input));
    }
    const current = { bytes, type, etag: response.headers.get('etag'), fetchedAt: Date.now(),...(profileHeads?{profileHeads}:{}) };
    if (!original) if(epochs.get(key)===epoch)cache.set(key, current); return current;
  })().finally(() => pending.delete(pendingKey));
  pending.set(pendingKey, attempt); return attempt;
}
export async function publicMarketMiddleware(request: IncomingMessage, response: ServerResponse, next: () => void): Promise<void> {
  if (!request.url?.startsWith(PREFIX)) { next(); return; }
  response.setHeader('X-Content-Type-Options', 'nosniff'); response.setHeader('Cache-Control', 'no-store');
  if (request.method !== 'GET') { response.writeHead(405, { Allow: 'GET' }); response.end(); return; }
  const target = resolvePublicMarketTarget(request.url); if (!target) { response.writeHead(400); response.end(); return; }
  try { const result = await loadPublicResponse(target,new URL(request.url,'http://localhost').searchParams.get('afterPublication')??new URL(request.url,'http://localhost').searchParams.get('afterTrade')??undefined); response.setHeader('Content-Type', result.type); response.writeHead(200); response.end(result.bytes); }
  catch (cause) { const purchase=cause instanceof OriginalPurchaseRefusal;response.writeHead(purchase?402:503, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ ok: false, error: purchase?'original_purchase_required':'Receiz public source is temporarily unavailable.' })); }
}
/** Build-time public discovery seed. Report-only projection, never a held account. */
export async function readReceizPublicMarketSource(kind: 'membership' | 'quotes' | 'sports' | 'capitalization',afterPublication?:string,options?:{fresh?:true;selectionKey?:string;onPublicProfileHeads?:(heads:readonly unknown[])=>void}): Promise<unknown> {
  if(afterPublication!==undefined&&(kind!=='membership'||!/^[a-f0-9]{64}$/.test(afterPublication)))throw new Error('Unsupported publication freshness reference.');
  if(options?.selectionKey!==undefined&&!/^[a-f0-9]{64}$/.test(options.selectionKey))throw Error('Unsupported public preparation coordinate.');
  const target = resolvePublicMarketTarget(`${PREFIX}${kind}`); if (!target) throw new Error('Unsupported public source.');
  const response=await loadPublicResponse(target,afterPublication??(options?.fresh?'prepared-public-material:'+(options.selectionKey??'initial'):undefined));if(kind==='membership'&&response.profileHeads)options?.onPublicProfileHeads?.(response.profileHeads);return JSON.parse(new TextDecoder().decode(response.bytes));
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
    return { ...Object.fromEntries(['id', 'source', 'baseUsdValue', 'birthUsdValue', 'marketUsdValue', 'proofTotalValueUsd', 'scoreDelta', 'seed', 'quoteUsdPerPhi'].map(key => [key, row[key]])),...(sportsGroup?{sportsGroup}:{}),...(sealedCopies?{sealedCopies}:{}),...(sealedBirths?{sealedBirths}:{}),...(historyObservation?{historyObservation}:{}),...(pulse(row.historyEvaluationPulse)?{historyEvaluationPulse:row.historyEvaluationPulse}:{}), ...(item ? { marketItem: { ...Object.fromEntries(['id', 'source', 'priceUsd', 'pricePhi', 'quoteUsdPerPhi', 'changePct', 'pricingSourceKey'].map(key => [key, item[key]])), ...(meta ? { livePulseSeed: Object.fromEntries(['kind', 'claimPulse', 'beat', 'stepIndex', 'creatorVerified', 'chakraDay', 'kaiSignature', 'userPhiKey', ...(Object.hasOwn(meta, 'frequencyHz') ? ['frequencyHz'] : [])].map(key => [key, meta[key]])) } : {}) } } : {}) };
  }) } };
}
export function publicMarketPlugin(): Plugin { return { name: 'receiz-public-market', configureServer(server) { server.middlewares.use((req,res,next)=>{void publicDocumentMiddleware(req,res,next);});server.middlewares.use((req, res, next) => { void publicMarketMiddleware(req, res, next); }); }, configurePreviewServer(server) { server.middlewares.use((req,res,next)=>{void publicDocumentMiddleware(req,res,next);});server.middlewares.use((req, res, next) => { void publicMarketMiddleware(req, res, next); }); } }; }

/** The existing public discovery projection, shared by initial and accepted-delta preparation. */
export function curatePublicMarketMembership(input:Record<string,unknown>):Record<string,unknown>{
        const transport = input.transport as Record<string,unknown>|undefined;
        if (input.ok !== true || !transport || !Array.isArray(transport.publicOriginals)) throw new Error('Receiz public collection is unavailable.');
        input.transport = { generatedAt: transport.generatedAt, publicMembership: transport.publicMembership,...(Array.isArray(transport.publicProfileHeads)?{publicProfileHeads:transport.publicProfileHeads.flatMap(value=>{const head=curatePublicProfileHead(value);return head?[head]:[];})}:{}),...(typeof transport.publicProfileHeadsRevision==='string'&&/^[a-f0-9]{64}$/.test(transport.publicProfileHeadsRevision)?{publicProfileHeadsRevision:transport.publicProfileHeadsRevision}:{}), publicOriginals: transport.publicOriginals.map((item: Record<string, unknown>) => {
          const profile = item.profileOriginal as Record<string, unknown> | undefined, media = profile?.media as Record<string, unknown> | undefined,proof=profile?.proof as Record<string,unknown>|undefined,material=media?.material as Record<string,unknown>|undefined;
          // This same public boundary also receives its already-selected output.
          const rawKind=profile?.media===null?null:media?.kind,mediaKind=publicMediaKind(rawKind===undefined?profile?.mediaKind:rawKind);
          const mediaItem={...item,profileOriginal:{...profile,mediaKind}};
          const selectedArtworkUrl=rawKind===undefined?safeReceizArtworkUrl(profile?.artworkUrl):null;
          const originalArtifactSrc=publicMaterialOriginalUrl(material?.originalArtifactSrc)??publicMaterialOriginalUrl(material?.proofObjectUrl);
          const carriedText=publicCarriedText(profile?.longForm);
          const readingTz=profile?.readingTzMinutesEast===null?null:profile?.readingTzMinutesEast??media?.receiptTzMinutesEast,readingTzMinutesEast=readingTz===null?null:typeof readingTz==='number'&&Number.isInteger(readingTz)&&readingTz>=-840&&readingTz<=840?readingTz:undefined;
          const proofFields={...(publicOriginalCreator(profile?.originalCreator)?{originalCreator:publicOriginalCreator(profile?.originalCreator)}:{}),...(publicOriginalProvenance(profile?.importedSource??profile?.sourceProvenance)?{sourceProvenance:publicOriginalProvenance(profile?.importedSource??profile?.sourceProvenance)}:{}),...(publicNativeAssetBinding(profile?.nativeAsset)?{nativeAsset:publicNativeAssetBinding(profile?.nativeAsset)}:{}),code:profile?.code,pulse:profile?.pulse,verifyPath:profile?.verifyPath,claimHashHex:publicClaimHash(profile),hasPbiSignature:profile?.hasPbiSignature===true,pbiReceiptHash:profile?.pbiReceiptHash,recordCardMediaSha256Hex:profile?.recordCardMediaSha256Hex,recordMediaSha256Hex:profile?.recordMediaSha256Hex,proof:proof?{circuit:proof.circuit,groth16Id:proof.groth16Id,poseidon:proof.poseidon}:null,attachments:Array.isArray(profile?.attachments)?profile.attachments.slice(0,200).map((row:Record<string,unknown>)=>({name:row?.name,id:row?.id,src:row?.src,downloadName:row?.downloadName,sha256Hex:row?.sha256Hex})):[]};
          return { id: item.id, receizId: item.receizId, title: publicAssetTitle(item), summary: item.summary, visibility: item.visibility, ownerUsername: item.ownerUsername, ownerDisplayName: item.ownerDisplayName,...(typeof item.ownerUserId==='string'&&typeof item.ownerCreatedAt==='string'&&Number.isFinite(Date.parse(item.ownerCreatedAt))?{ownerUserId:item.ownerUserId,ownerCreatedAt:item.ownerCreatedAt}:{}),...(item.ownerAvatarUrl!==undefined?{ownerAvatarUrl:profileAvatarUrl(item.ownerAvatarUrl)}:{}), canonicalHref: item.canonicalHref, verifyHref: item.verifyHref, pulse: item.pulse, createdAt: item.createdAt, valueUsd: item.valueUsd,livePulseSeed:publicMarketPulseSeed(item.livePulseSeed,item.pulse),
            profileOriginal: { ...proofFields,...(carriedText?{longForm:carriedText}:{}),assetTitle:publicAuthoredAssetTitle(item),mediaKind,artworkUrl:selectedArtworkUrl??publicMediaArtworkUrl({...media,kind:mediaKind}),documentUrl:publicDocumentUrl(mediaItem,originalArtifactSrc),playback:publicMediaPlayback(mediaItem,originalArtifactSrc),hasLongForm:typeof profile?.hasLongForm==='boolean'?profile.hasLongForm:Boolean(profile?.longForm&&typeof (profile.longForm as Record<string,unknown>).text==='string'&&(profile.longForm as Record<string,unknown>).text),readingTzMinutesEast,media: profile?.media===null?null:{ sha256Hex:media?.sha256Hex,gateAudioPlayback:media?.gateAudioPlayback,originalDownloadMime:media?.originalDownloadMime,originalDownloadSrc: media?.originalDownloadSrc, originalDownloadSha256Hex: media?.originalDownloadSha256Hex, material: media?.material ? { sealedArtifactSha256Hex: (media.material as Record<string, unknown>).sealedArtifactSha256Hex, originalArtifactSrc } : null } } };
        }) };
 return input;
}
