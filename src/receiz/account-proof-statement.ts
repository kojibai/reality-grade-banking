import {inspectNativeAssetBacking,type NativeAssetFundingComponent} from './native-asset-backing';
// Strict public projection inspection only; no financial admission or proof authority.
export interface AccountProofTransaction {
  sequence: number; transactionId: string; eventDigest: string; previousEventDigest: string; kaiUPulse: string;
  kind: string; description: string; reserveDeltaUsdCents: string; settlementDeltaPhiMicro: string; balanceDeltaPhiMicro?: string;
}
export interface AccountSourceFrontier {
  schema: 'receiz.bank.account-source-frontier.v1'; authorizationHead: string; walletHead: string;
  lawfulInventoryHead: string; accountHistoryHead: string; assetHistoryDigest: string;
  assetHeads: readonly {assetId:string;sourceSha256:string}[]; artifactSourceHead: string|null; offlineSourceHead: string|null;
}
export interface AccountProofComponents {
  lawfulValues: readonly {membershipId:string;admissionDigest:string;valueHeadDigest:string|null;settlementPhiMicro:string}[];
  assets: readonly {assetId:string;name:string;symbol:string;description:string;linkedProofDigest:null;supplyMicro:string;quantityMicro:string;
    backingRail:'reserve'|'settlement'|'composite';backingComponents?:readonly NativeAssetFundingComponent[];backingPhiMicro:string;backingUsdCents:string;status:'active'|'redeemed';issuanceSourceSha256:string;headSourceSha256:string}[];
  assetOffers: readonly {offerId:string;assetId:string;side:'ask'|'bid';remainingQuantityMicro:string;lockedPhiMicro:string;lockedUsdCents:string;headSourceSha256:string}[];
  artifactIntrinsicPhiMicro:string; offlineLockedPhiMicro:string; offlineLockedUsdCents:string;
}
export interface AccountStatement {
  schema: 'bankeiz.public-account-statement.v1' | 'bankeiz.public-account-statement.v2' | 'bankeiz.public-account-statement.v3' | 'bankeiz.public-account-statement.v4'; applicationId: string;
  domain?: 'receiz.bank.native-account-statement.root-signature.v2'; issuerRootKid?: string; rootSignature?: Readonly<{kid:string;alg:'Ed25519';sig:string}>;
  account: { receizId: string; keyId: string; alg: 'Ed25519' | 'P-256'; publicKeyRawB64u: string };
  checkpoint: { accountHead: string; identityBindingDigest: string; genesisHead: string; historyHead: string;
    transactionCount: number; kaiUPulse: string; reserveUsdCents: string; settlementPhiMicro: string; balancePhiMicro?: string; usdPerPhiMicrocents?: string; historyDigest: string };
  transactions: readonly AccountProofTransaction[];
  sourceFrontier?: AccountSourceFrontier; components?: AccountProofComponents;
}
const digest = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/u.test(v);
const unsigned = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d{0,39})$/u.test(v);
const signed = (v: unknown): v is string => typeof v === 'string' && /^(0|-?[1-9]\d{0,39})$/u.test(v);
const text = (v: unknown, limit = 512): v is string => typeof v === 'string' && v.length > 0 && v.length <= limit && !/[\x00-\x1f\x7f]/u.test(v);
function fail(code = 'INVALID'): never { throw Error(`ACCOUNT_PROOF_${code}`); }
function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).length !== keys.length || !keys.every(key => Object.hasOwn(v, key))) fail('PRIVATE_OR_UNSUPPORTED_FIELDS');
  return v as Record<string, unknown>;
}
function freeze<T>(v: T): T { if (v && typeof v === 'object') { Object.values(v).forEach(freeze); Object.freeze(v); } return v; }

/** Shape/reconciliation inspection only. Calling this does NOT verify a source,
 * admit identity, establish completeness, or create an exportable handle. */
export function inspectAccountStatement(input: unknown, applicationId: string): AccountStatement {
  const complete=!!input&&typeof input==='object'&&'schema' in input&&['bankeiz.public-account-statement.v3','bankeiz.public-account-statement.v4'].includes(String(input.schema));
  const native=complete||!!input&&typeof input==='object'&&'schema' in input&&input.schema==='bankeiz.public-account-statement.v2';
  const v = record(input, ['schema', 'applicationId', 'account', 'checkpoint', 'transactions',...(native?['domain','issuerRootKid','rootSignature']:[]),...(complete?['sourceFrontier','components']:[])]);
  if (!['bankeiz.public-account-statement.v1','bankeiz.public-account-statement.v2','bankeiz.public-account-statement.v3','bankeiz.public-account-statement.v4'].includes(String(v.schema)) || v.applicationId !== applicationId) fail('APPLICATION_MISMATCH');
  if(native){
    const signature=record(v.rootSignature,['kid','alg','sig']);
    if(v.domain!=='receiz.bank.native-account-statement.root-signature.v2'||!text(v.issuerRootKid,256)||signature.kid!==v.issuerRootKid||signature.alg!=='Ed25519'||typeof signature.sig!=='string'||!/^[A-Za-z0-9_-]{86}$/u.test(signature.sig))fail('NATIVE_STATEMENT_UNVERIFIED');
  }
  const a = record(v.account, ['receizId', 'keyId', 'alg', 'publicKeyRawB64u']);
  if (!text(a.receizId, 128) || !/^[a-z0-9][a-z0-9._-]*\.receiz\.id$/u.test(a.receizId) || !digest(a.keyId) || !['Ed25519', 'P-256'].includes(String(a.alg)) || !text(a.publicKeyRawB64u, 256) || !/^[A-Za-z0-9_-]+$/u.test(a.publicKeyRawB64u)) fail('IDENTITY_INVALID');
  const c = record(v.checkpoint, ['accountHead', 'identityBindingDigest', 'genesisHead', 'historyHead', 'transactionCount', 'kaiUPulse', 'reserveUsdCents', 'settlementPhiMicro', 'historyDigest', ...(native?['balancePhiMicro','usdPerPhiMicrocents']:[])]);
  if (![c.accountHead, c.identityBindingDigest, c.genesisHead, c.historyHead, c.historyDigest].every(digest) || !unsigned(c.kaiUPulse) || c.kaiUPulse.length > 30 || !unsigned(c.reserveUsdCents) || !unsigned(c.settlementPhiMicro)) fail('CHECKPOINT_INVALID');
  if(native&&(!unsigned(c.balancePhiMicro)||!unsigned(c.usdPerPhiMicrocents)||BigInt(c.usdPerPhiMicrocents)===0n))fail('CHECKPOINT_INVALID');
  if(complete){
    const f=record(v.sourceFrontier,['schema','authorizationHead','walletHead','lawfulInventoryHead','accountHistoryHead','assetHistoryDigest','assetHeads','artifactSourceHead','offlineSourceHead']);
    if(f.schema!=='receiz.bank.account-source-frontier.v1'||![f.authorizationHead,f.walletHead,f.lawfulInventoryHead,f.accountHistoryHead,f.assetHistoryDigest].every(digest)
      ||![f.artifactSourceHead,f.offlineSourceHead].every(h=>h===null||digest(h))||f.accountHistoryHead!==c.historyHead)fail('FRONTIER_INVALID');
    const rows=(value:unknown)=>{if(!Array.isArray(value)||value.length>100_000)fail('COMPONENTS_INVALID');return value;};
    const heads=new Map<string,string>();let prior='';
    for(const row of rows(f.assetHeads)){const h=record(row,['assetId','sourceSha256']);if(!text(h.assetId,256)||!digest(h.sourceSha256)||h.assetId<=prior)fail('FRONTIER_INVALID');prior=h.assetId;heads.set(h.assetId,h.sourceSha256);}
    const p=record(v.components,['lawfulValues','assets','assetOffers','artifactIntrinsicPhiMicro','offlineLockedPhiMicro','offlineLockedUsdCents']);
    if(![p.artifactIntrinsicPhiMicro,p.offlineLockedPhiMicro,p.offlineLockedUsdCents].every(unsigned))fail('COMPONENTS_INVALID');
    if(v.schema==='bankeiz.public-account-statement.v4'&&((BigInt(p.artifactIntrinsicPhiMicro as string)>0n&&f.artifactSourceHead===null)||((BigInt(p.offlineLockedPhiMicro as string)>0n||BigInt(p.offlineLockedUsdCents as string)>0n)&&f.offlineSourceHead===null)))fail('SOURCE_CLOSURE_REQUIRED');
    const unique=(values:unknown,key:string,fields:readonly string[],check:(row:Record<string,unknown>)=>boolean,optional:readonly string[]=[])=>{let prior='';for(const value of rows(values)){const row=record(value,[...fields,...optional.filter(k=>!!value&&typeof value==='object'&&Object.hasOwn(value,k))]);if(!text(row[key],256)||row[key]<=prior||!check(row))fail('COMPONENTS_INVALID');prior=row[key] as string;}};
    unique(p.lawfulValues,'membershipId',['membershipId','admissionDigest','valueHeadDigest','settlementPhiMicro'],r=>digest(r.admissionDigest)&&(r.valueHeadDigest===null||digest(r.valueHeadDigest))&&unsigned(r.settlementPhiMicro));
    unique(p.assets,'assetId',['assetId','name','symbol','description','linkedProofDigest','supplyMicro','quantityMicro','backingRail','backingPhiMicro','backingUsdCents','status','issuanceSourceSha256','headSourceSha256'],r=>
      text(r.name,80)&&text(r.symbol,16)&&typeof r.description==='string'&&r.description.length<=2000&&!/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/u.test(r.description)&&r.linkedProofDigest===null
      &&[r.supplyMicro,r.quantityMicro,r.backingPhiMicro,r.backingUsdCents].every(unsigned)&&(BigInt(r.supplyMicro as string)>0n||r.status==='redeemed'&&r.quantityMicro==='0'&&r.backingPhiMicro==='0'&&r.backingUsdCents==='0')&&BigInt(r.quantityMicro as string)<=BigInt(r.supplyMicro as string)
      &&['reserve','settlement','composite'].includes(String(r.backingRail))&&(inspectNativeAssetBacking(r),true)&&['active','redeemed'].includes(String(r.status))&&digest(r.issuanceSourceSha256)&&digest(r.headSourceSha256)
      &&heads.get(r.assetId as string)===r.headSourceSha256,['backingComponents']);
    unique(p.assetOffers,'offerId',['offerId','assetId','side','remainingQuantityMicro','lockedPhiMicro','lockedUsdCents','headSourceSha256'],r=>text(r.assetId,256)&&heads.has(r.assetId as string)&&['ask','bid'].includes(String(r.side))&&[r.remainingQuantityMicro,r.lockedPhiMicro,r.lockedUsdCents].every(unsigned)&&digest(r.headSourceSha256));
  }
  if (!Array.isArray(v.transactions) || v.transactions.length > 100_000 || c.transactionCount !== v.transactions.length) fail('HISTORY_INCOMPLETE');
  let previous = c.genesisHead, time = 0n, reserve = 0n, settlement = 0n, gross = 0n;
  const ids = new Set<string>(), digests = new Set<string>();
  for (let index = 0; index < v.transactions.length; index++) {
    const t = record(v.transactions[index], ['sequence', 'transactionId', 'eventDigest', 'previousEventDigest', 'kaiUPulse', 'kind', 'description', 'reserveDeltaUsdCents', 'settlementDeltaPhiMicro', ...(native?['balanceDeltaPhiMicro']:[])]);
    // Identity events may be acquired offline before their later accepted
    // append. Their exact original coordinate is preserved. They cannot move
    // funds or lower the high-water coordinate used for financial causality.
    const identityEvent=native&&["account-signed-out","account-created","account-opened"].includes(String(t.kind))
      &&t.reserveDeltaUsdCents==="0"&&t.settlementDeltaPhiMicro==="0"&&t.balanceDeltaPhiMicro==="0";
    if (t.sequence !== index + 1 || !text(t.transactionId, 256) || !digest(t.eventDigest) || t.previousEventDigest !== previous || !unsigned(t.kaiUPulse) || t.kaiUPulse.length > 30 || BigInt(t.kaiUPulse) < time && !identityEvent || BigInt(t.kaiUPulse) > BigInt(c.kaiUPulse) || ids.has(t.transactionId) || digests.has(t.eventDigest) || t.eventDigest === c.genesisHead || !text(t.kind, 64) || !text(t.description) || !signed(t.reserveDeltaUsdCents) || !signed(t.settlementDeltaPhiMicro)) fail('HISTORY_INVALID');
    if(native){
      if(!signed(t.balanceDeltaPhiMicro))fail('HISTORY_INVALID');
      const r=BigInt(t.reserveDeltaUsdCents),s=BigInt(t.settlementDeltaPhiMicro),g=BigInt(t.balanceDeltaPhiMicro),abs=(n:bigint)=>n<0n?-n:n;
      if(r!==0n&&s!==0n){
        // A complete native Note may carry both admitted rails in one atomic
        // movement. Its signed source retains the exact original backing.
        if(!complete||!["note-funded","note-funding-cancelled","note-deposited","asset-fund-asset","asset-redeem-asset"].includes(String(t.kind))||(r<0n)!==(s<0n)||(r<0n)!==(g<0n)||abs(s)>=abs(g)||(["note-funded","asset-fund-asset"].includes(String(t.kind)))!==(g<0n))fail('HISTORY_INVALID');
      }else if(r===0n&&t.settlementDeltaPhiMicro!==t.balanceDeltaPhiMicro)fail('HISTORY_INVALID');
      gross+=BigInt(t.balanceDeltaPhiMicro);if(gross<0n)fail('BALANCE_MISMATCH');
    }
    reserve += BigInt(t.reserveDeltaUsdCents); settlement += BigInt(t.settlementDeltaPhiMicro);
    if (reserve < 0n || settlement < 0n || native && settlement > gross) fail('BALANCE_MISMATCH');
    ids.add(t.transactionId); digests.add(t.eventDigest); previous = t.eventDigest; time = BigInt(t.kaiUPulse)>time?BigInt(t.kaiUPulse):time;
  }
  if(native){
    // Reserve Phi backing is fixed by admitted movements. Repricing it is
    // never a Settlement credit; only native Settlement deltas credit that rail.
    if(gross!==BigInt(c.balancePhiMicro as string)||settlement!==BigInt(c.settlementPhiMicro)
      ||(reserve===0n)!==(gross===settlement))fail('BALANCE_MISMATCH');
  }
  if (previous !== c.historyHead || reserve !== BigInt(c.reserveUsdCents) || !native && settlement !== BigInt(c.settlementPhiMicro)) fail('BALANCE_MISMATCH');
  return freeze(structuredClone(input)) as AccountStatement;
}
