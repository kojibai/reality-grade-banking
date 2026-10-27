import {rememberNativeBalanceCalculation} from './balance-calculation-observation';
import type { ReceizIdentityPublicBinding } from '@receiz/sdk';
import { heldAccountProofBytes, isVerifiedAccountProof, verifyAccountProof, type VerifiedAccountProof } from './account-proof';
import { verifyAccountProofContinuation } from './account-proof-public';
import { loadReceiz } from './client';
import type { WalletObservation } from './wallet-observation';
import { appendWalletPoint, mergeWalletPoints, walletPointTime, type WalletPoint } from './wallet-series';
import { hasSettledAccountView } from './account-view';
import {projectHistoricalWallet} from './historical-wallet';

type State = { schema: 'bank.account-ledger.v1'; accountUid: string; observedAt: string; sourceJson: string };
type Owner = Pick<ReceizIdentityPublicBinding, 'keyId' | 'artifactOwnerReceizId'>;
export interface LocalAccountLedger { proof: VerifiedAccountProof; observation: WalletObservation; }

/** An account statement can extend its own retained projection, or an older
 * same-account observation whose last transaction coordinate it covers. A
 * locally committed note successor always wins over a delayed shared read. */
export function canAdoptAccountLedgerObservation(current: WalletObservation | null, next: WalletObservation): boolean {
  if (next.walletScope === 'native-cash-only' && (!current || (['totalUsdCents','reserveUsdCents','settlementUsdCents','balancePhiMicro'] as const).some(key => current.wallet[key] !== next.wallet[key]))) return false;
  if (!current) return true;
  if (current.source === 'local-note-head') return false;
  if (current.source === 'account-genesis') return true;
  if (current.wallet.userId !== next.wallet.userId) return false;
  const amounts = ['totalUsdCents', 'reserveUsdCents', 'settlementUsdCents', 'balancePhiMicro'] as const;
  if (amounts.every(key => current.wallet[key] === next.wallet[key])) return true;
  const before = current.wallet.kaiUpulse, after = next.wallet.kaiUpulse;
  return typeof before === 'string' && /^\d{1,30}$/.test(before) && typeof after === 'string' && /^\d{1,30}$/.test(after) && BigInt(after) >= BigInt(before);
}

/** Keep newer chart/read observations when the retained proof has the same
 * amounts. A changed checkpoint is a new local observation of its source; its
 * adoption must not trim history that was recorded after the source was kept. */
export function mergeAccountLedgerObservation(current: WalletObservation | null, next: WalletObservation): WalletObservation {
  const history = mergeWalletPoints([next.history ?? [], current?.history ?? []], next.wallet.userId);
  if (current && current.wallet.userId === next.wallet.userId && (['totalUsdCents', 'reserveUsdCents', 'settlementUsdCents', 'balancePhiMicro'] as const).every(key => current.wallet[key] === next.wallet[key])) {
    const quoteHold = current.quoteHold ?? next.quoteHold;
    const walletScope = current.walletScope === 'native-cash-only' || next.walletScope === 'native-cash-only' ? 'native-cash-only' : next.historyBasis ? next.walletScope : current.walletScope;
    return history.length === (current.history?.length ?? 0) && history.every((point, index) => point === current.history?.[index]) && !!current.historyBasis && current.walletScope === walletScope && current.quoteHold === quoteHold ? current : { ...current, quoteHold, walletScope, history, historyBasis: next.historyBasis ?? current.historyBasis };
  }
  const observedAt = current && Date.parse(current.observedAt) >= Date.parse(next.observedAt)
    ? new Date(Math.max(Date.now(), Date.parse(current.observedAt) + 1)).toISOString() : next.observedAt;
  const quoteHold = current?.quoteHold?.userId === next.wallet.userId ? current.quoteHold : next.quoteHold;
  return { ...next, quoteHold, observedAt, history: appendWalletPoint(history, next.wallet, observedAt, next.history?.at(-1)?.kaiUPulse ?? next.wallet.kaiUpulse) };
}

/** The existing native account statement verifies every signed movement from
 * genesis and reconciles both rails. Display rows never supply this input. */
export async function accountLedgerObservation(proof: VerifiedAccountProof, accountUid: string, observedAt: string): Promise<WalletObservation> {
  if (!isVerifiedAccountProof(proof) || !['bankeiz.public-account-statement.v2','bankeiz.public-account-statement.v3','bankeiz.public-account-statement.v4'].includes(proof.statement.schema) || !/^[A-Za-z0-9_.:-]{1,128}$/.test(accountUid) || !Number.isFinite(Date.parse(observedAt))) throw Error('ACCOUNT_LEDGER_SOURCE_REQUIRED');
  const c = proof.statement.checkpoint, sdk = await loadReceiz();
  // SharedWallet coordinates describe its last transaction, not the later
  // checkpoint issuance time. Keep those comparable across both read paths.
  const financial = proof.statement.transactions.filter(row => BigInt(row.reserveDeltaUsdCents) !== 0n || BigInt(row.settlementDeltaPhiMicro) !== 0n || BigInt(row.balanceDeltaPhiMicro ?? '0') !== 0n);
  const lastEntryKaiUPulse = financial.length ? financial.reduce((head, row) => BigInt(row.kaiUPulse) > head ? BigInt(row.kaiUPulse) : head, 0n).toString() : c.kaiUPulse;
  const settlement = c.settlementPhiMicro === '0' ? '0' : sdk.quoteReceizDisplayUsdV122(c.settlementPhiMicro, c.usdPerPhiMicrocents!);
  const wallet = {
    userId: accountUid,balanceSourceSha256:proof.sourceDigest, totalUsdCents: (BigInt(c.reserveUsdCents) + BigInt(settlement)).toString(),
    reserveUsdCents: c.reserveUsdCents, settlementUsdCents: settlement, balancePhiMicro: c.balancePhiMicro!,
    settlementPhiMicro:c.settlementPhiMicro,reservePhiMicro:(BigInt(c.balancePhiMicro!)-BigInt(c.settlementPhiMicro)).toString(),
    portfolioUsdCents: null, pnlUsdCents: null, withdrawableUsdCents: null, projectionComplete: true,
    pulse: (BigInt(lastEntryKaiUPulse) / 1_000_000n).toString(), kaiUpulse: lastEntryKaiUPulse,
  };
  const history:WalletPoint[]=projectHistoricalWallet({transactions:proof.statement.transactions,userId:accountUid,endKaiUPulse:c.kaiUPulse});
  // Historical model samples use their own Kai price. The accepted source's
  // exact checkpoint quote and wallet remain unchanged and win at its endpoint.
  const separate = proof.statement.components;
  const excludesAggregate = separate && (BigInt(separate.artifactIntrinsicPhiMicro) > 0n || separate.lawfulValues.some(value=>BigInt(value.settlementPhiMicro)>0n));
  const observation:WalletObservation={ wallet, observedAt, walletScope: excludesAggregate ? 'native-cash-only' : 'native-full', history: appendWalletPoint(history, wallet, walletPointTime(c.kaiUPulse), c.kaiUPulse), historyBasis: { schema: 'bank.account-history-display.v1', startKaiUPulse: history[0]?.kaiUPulse ?? c.kaiUPulse, endKaiUPulse: c.kaiUPulse, settlementPhiMicro: c.settlementPhiMicro, balancePhiMicro: c.balancePhiMicro!, reserveUsdCents: c.reserveUsdCents } };
  rememberNativeBalanceCalculation(observation,{kind:'native',userId:accountUid,kaiUPulse:c.kaiUPulse,source:'verified-account-checkpoint',sourceDigest:proof.sourceDigest,statement:{checkpoint:proof.statement.checkpoint,transactions:proof.statement.transactions,sourceFrontier:proof.statement.sourceFrontier,components:proof.statement.components},reserveUsdCents:c.reserveUsdCents,settlementPhiMicro:c.settlementPhiMicro,balancePhiMicro:c.balancePhiMicro!,rateMicrocents:c.usdPerPhiMicrocents!,output:wallet});return observation;
}

/** Encrypted storage beneath canonical verification. The host account alias is
 * retained only after the existing same-identity authenticated account read;
 * it is display routing, never ownership, funding or execution authority. */
export function createLocalAccountLedger(input: { owner: Owner; read(): Promise<unknown>; write(value: State, expected: unknown): Promise<void>; assertOpen(): void }) {
  let pending: Promise<unknown> = Promise.resolve();
  async function stateDigest(value: unknown) { const sdk = await loadReceiz(); return sdk.sha256ReceizBytes(new TextEncoder().encode(JSON.stringify(value))); }
  async function openSource(value: unknown) {
    if (value === null || value === undefined) return null;
    const s = value as State;
    if (!s || typeof s !== 'object' || Object.keys(s).sort().join(',') !== 'accountUid,observedAt,schema,sourceJson' || s.schema !== 'bank.account-ledger.v1' || typeof s.sourceJson !== 'string' || typeof s.accountUid !== 'string' || typeof s.observedAt !== 'string') throw Error('ACCOUNT_LEDGER_SOURCE_REQUIRED');
    const proof = await verifyAccountProof(new File([s.sourceJson], 'account-ledger.json', { type: 'application/json' }), input.owner);
    input.assertOpen();
    return { proof, state: s };
  }
  async function open(value: unknown): Promise<LocalAccountLedger | null> {
    const source = await openSource(value); if (!source) return null;
    const { proof, state: s } = source;
    const observation = await accountLedgerObservation(proof, s.accountUid, s.observedAt);
    observation.historyBasis!.retainedStateSha256 = await stateDigest(value);
    return { proof, observation };
  }
  async function retain(proof: VerifiedAccountProof, accountUid: string): Promise<LocalAccountLedger> {
    input.assertOpen();
    if (!isVerifiedAccountProof(proof) || proof.statement.account.keyId !== input.owner.keyId || proof.statement.account.receizId !== input.owner.artifactOwnerReceizId) throw Error('ACCOUNT_LEDGER_OWNER_MISMATCH');
    for (let attempt = 0; attempt < 3; attempt++) {
      const previous = await input.read(), prior = await open(previous);
      input.assertOpen();
      if (prior) {
        if (prior.observation.wallet.userId !== accountUid) throw Error('ACCOUNT_LEDGER_ACCOUNT_MISMATCH');
        if (prior.proof.sourceDigest === proof.sourceDigest) return prior;
        try { verifyAccountProofContinuation(prior.proof, proof); }
        catch { verifyAccountProofContinuation(proof, prior.proof); return prior; }
      }
      const observedAt = new Date().toISOString(), observation = await accountLedgerObservation(proof, accountUid, observedAt);
      const state: State = { schema: 'bank.account-ledger.v1', accountUid, observedAt, sourceJson: new TextDecoder('utf-8', { fatal: true }).decode(heldAccountProofBytes(proof)) };
      input.assertOpen();
      try { await input.write(state, previous); input.assertOpen(); observation.historyBasis!.retainedStateSha256 = await stateDigest(state); return { proof, observation }; }
      catch (cause) {
        input.assertOpen();
        // A competing tab may have kept another genuine extension. Reopen it
        // and compare complete histories before any retry; never overwrite it.
        if (!(cause instanceof Error) || !/^BANK_NOTE_(?:INTENT_CHANGED|IDENTITY_OR_INTENT_CHANGED)$/.test(cause.message)) throw cause;
      }
    }
    throw Error('ACCOUNT_LEDGER_RETENTION_CHANGED');
  }
  return {
    async original(): Promise<VerifiedAccountProof | null> {
      input.assertOpen(); await pending.catch(() => {});
      const source = await openSource(await input.read()); input.assertOpen();
      return source?.proof ?? null;
    },
    async restore(current?: WalletObservation | null) {
      input.assertOpen(); await pending.catch(() => {}); const value = await input.read(); input.assertOpen();
      // Exact retained bytes with known coverage are already represented in
      // this identity-bound display cache. Pre-marker caches must reopen their
      // source before they can acquire full-native valuation eligibility.
      if (value && hasSettledAccountView(current ?? null) && (current?.walletScope === 'native-full' || current?.walletScope === 'native-cash-only') && current.historyBasis?.retainedStateSha256 === await stateDigest(value)) return null;
      const opened = await open(value); input.assertOpen(); return opened;
    },
    retain(proof: VerifiedAccountProof, accountUid: string) {
      const operation = pending.catch(() => {}).then(() => retain(proof, accountUid));
      pending = operation;
      return operation;
    },
  };
}
