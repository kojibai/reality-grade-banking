import type { ReceizIdentityPublicBinding } from '@receiz/sdk';
import { heldAccountProofBytes, isVerifiedAccountProof, verifyAccountProof, type VerifiedAccountProof } from './account-proof';
import { verifyAccountProofContinuation } from './account-proof-public';
import { loadReceiz } from './client';
import type { WalletObservation } from './wallet-observation';
import { appendWalletPoint } from './wallet-series';

type State = { schema: 'bank.account-ledger.v1'; accountUid: string; observedAt: string; sourceJson: string };
type Owner = Pick<ReceizIdentityPublicBinding, 'keyId' | 'artifactOwnerReceizId'>;
export interface LocalAccountLedger { proof: VerifiedAccountProof; observation: WalletObservation; }

/** An account statement can extend its own retained projection, or an older
 * same-account observation whose last transaction coordinate it covers. A
 * locally committed note successor always wins over a delayed shared read. */
export function canAdoptAccountLedgerObservation(current: WalletObservation | null, next: WalletObservation): boolean {
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
  if (current && current.wallet.userId === next.wallet.userId && (['totalUsdCents', 'reserveUsdCents', 'settlementUsdCents', 'balancePhiMicro'] as const).every(key => current.wallet[key] === next.wallet[key])) return current;
  const observedAt = current && Date.parse(current.observedAt) >= Date.parse(next.observedAt)
    ? new Date(Math.max(Date.now(), Date.parse(current.observedAt) + 1)).toISOString() : next.observedAt;
  return { ...next, observedAt, history: appendWalletPoint(current?.history ?? [], next.wallet, observedAt, next.history?.at(-1)?.kaiUPulse ?? next.wallet.kaiUpulse) };
}

/** The existing native account statement verifies every signed movement from
 * genesis and reconciles both rails. Display rows never supply this input. */
export async function accountLedgerObservation(proof: VerifiedAccountProof, accountUid: string, observedAt: string): Promise<WalletObservation> {
  if (!isVerifiedAccountProof(proof) || proof.statement.schema !== 'bankeiz.public-account-statement.v2' || !/^[A-Za-z0-9_.:-]{1,128}$/.test(accountUid) || !Number.isFinite(Date.parse(observedAt))) throw Error('ACCOUNT_LEDGER_SOURCE_REQUIRED');
  const c = proof.statement.checkpoint, sdk = await loadReceiz();
  // SharedWallet coordinates describe its last transaction, not the later
  // checkpoint issuance time. Keep those comparable across both read paths.
  const financial = proof.statement.transactions.filter(row => BigInt(row.reserveDeltaUsdCents) !== 0n || BigInt(row.settlementDeltaPhiMicro) !== 0n || BigInt(row.balanceDeltaPhiMicro ?? '0') !== 0n);
  const lastEntryKaiUPulse = financial.length ? financial.reduce((head, row) => BigInt(row.kaiUPulse) > head ? BigInt(row.kaiUPulse) : head, 0n).toString() : c.kaiUPulse;
  const settlement = c.settlementPhiMicro === '0' ? '0' : sdk.quoteReceizDisplayUsdV122(c.settlementPhiMicro, c.usdPerPhiMicrocents!);
  const wallet = {
    userId: accountUid, totalUsdCents: (BigInt(c.reserveUsdCents) + BigInt(settlement)).toString(),
    reserveUsdCents: c.reserveUsdCents, settlementUsdCents: settlement, balancePhiMicro: c.balancePhiMicro!,
    portfolioUsdCents: null, pnlUsdCents: null, withdrawableUsdCents: null, projectionComplete: true,
    pulse: (BigInt(lastEntryKaiUPulse) / 1_000_000n).toString(), kaiUpulse: lastEntryKaiUPulse,
  };
  return { wallet, observedAt, history: [{ userId: accountUid, at: observedAt, kaiUPulse: c.kaiUPulse, totalUsdCents: wallet.totalUsdCents, reserveUsdCents: wallet.reserveUsdCents, settlementUsdCents: wallet.settlementUsdCents }] };
}

/** Encrypted storage beneath canonical verification. The host account alias is
 * retained only after the existing same-identity authenticated account read;
 * it is display routing, never ownership, funding or execution authority. */
export function createLocalAccountLedger(input: { owner: Owner; read(): Promise<unknown>; write(value: State, expected: unknown): Promise<void>; assertOpen(): void }) {
  let pending: Promise<unknown> = Promise.resolve();
  async function open(value: unknown): Promise<LocalAccountLedger | null> {
    if (value === null || value === undefined) return null;
    const s = value as State;
    if (!s || typeof s !== 'object' || Object.keys(s).sort().join(',') !== 'accountUid,observedAt,schema,sourceJson' || s.schema !== 'bank.account-ledger.v1' || typeof s.sourceJson !== 'string' || typeof s.accountUid !== 'string' || typeof s.observedAt !== 'string') throw Error('ACCOUNT_LEDGER_SOURCE_REQUIRED');
    const proof = await verifyAccountProof(new File([s.sourceJson], 'account-ledger.json', { type: 'application/json' }), input.owner);
    input.assertOpen();
    return { proof, observation: await accountLedgerObservation(proof, s.accountUid, s.observedAt) };
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
      try { await input.write(state, previous); input.assertOpen(); return { proof, observation }; }
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
    async restore() { input.assertOpen(); await pending.catch(() => {}); const opened = await open(await input.read()); input.assertOpen(); return opened; },
    retain(proof: VerifiedAccountProof, accountUid: string) {
      const operation = pending.catch(() => {}).then(() => retain(proof, accountUid));
      pending = operation;
      return operation;
    },
  };
}
