// Strict public projection inspection only; no financial admission or proof authority.
export interface AccountProofTransaction {
  sequence: number; transactionId: string; eventDigest: string; previousEventDigest: string; kaiUPulse: string;
  kind: string; description: string; reserveDeltaUsdCents: string; settlementDeltaPhiMicro: string; balanceDeltaPhiMicro?: string;
}
export interface AccountStatement {
  schema: 'bankeiz.public-account-statement.v1' | 'bankeiz.public-account-statement.v2'; applicationId: string;
  domain?: 'receiz.bank.native-account-statement.root-signature.v2'; issuerRootKid?: string; rootSignature?: Readonly<{kid:string;alg:'Ed25519';sig:string}>;
  account: { receizId: string; keyId: string; alg: 'Ed25519' | 'P-256'; publicKeyRawB64u: string };
  checkpoint: { accountHead: string; identityBindingDigest: string; genesisHead: string; historyHead: string;
    transactionCount: number; kaiUPulse: string; reserveUsdCents: string; settlementPhiMicro: string; balancePhiMicro?: string; usdPerPhiMicrocents?: string; historyDigest: string };
  transactions: readonly AccountProofTransaction[];
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
  const native=!!input&&typeof input==='object'&&'schema' in input&&input.schema==='bankeiz.public-account-statement.v2';
  const v = record(input, ['schema', 'applicationId', 'account', 'checkpoint', 'transactions',...(native?['domain','issuerRootKid','rootSignature']:[])]);
  if (!['bankeiz.public-account-statement.v1','bankeiz.public-account-statement.v2'].includes(String(v.schema)) || v.applicationId !== applicationId) fail('APPLICATION_MISMATCH');
  if(native){
    const signature=record(v.rootSignature,['kid','alg','sig']);
    if(v.domain!=='receiz.bank.native-account-statement.root-signature.v2'||!text(v.issuerRootKid,256)||signature.kid!==v.issuerRootKid||signature.alg!=='Ed25519'||typeof signature.sig!=='string'||!/^[A-Za-z0-9_-]{86}$/u.test(signature.sig))fail('NATIVE_STATEMENT_UNVERIFIED');
  }
  const a = record(v.account, ['receizId', 'keyId', 'alg', 'publicKeyRawB64u']);
  if (!text(a.receizId, 128) || !/^[a-z0-9][a-z0-9._-]*\.receiz\.id$/u.test(a.receizId) || !digest(a.keyId) || !['Ed25519', 'P-256'].includes(String(a.alg)) || !text(a.publicKeyRawB64u, 256) || !/^[A-Za-z0-9_-]+$/u.test(a.publicKeyRawB64u)) fail('IDENTITY_INVALID');
  const c = record(v.checkpoint, ['accountHead', 'identityBindingDigest', 'genesisHead', 'historyHead', 'transactionCount', 'kaiUPulse', 'reserveUsdCents', 'settlementPhiMicro', 'historyDigest', ...(native?['balancePhiMicro','usdPerPhiMicrocents']:[])]);
  if (![c.accountHead, c.identityBindingDigest, c.genesisHead, c.historyHead, c.historyDigest].every(digest) || !unsigned(c.kaiUPulse) || c.kaiUPulse.length > 30 || !unsigned(c.reserveUsdCents) || !unsigned(c.settlementPhiMicro)) fail('CHECKPOINT_INVALID');
  if(native&&(!unsigned(c.balancePhiMicro)||!unsigned(c.usdPerPhiMicrocents)||BigInt(c.usdPerPhiMicrocents)===0n))fail('CHECKPOINT_INVALID');
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
      if(!signed(t.balanceDeltaPhiMicro)||BigInt(t.reserveDeltaUsdCents)!==0n&&t.settlementDeltaPhiMicro!=="0"||BigInt(t.reserveDeltaUsdCents)===0n&&t.settlementDeltaPhiMicro!==t.balanceDeltaPhiMicro)fail('HISTORY_INVALID');
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
