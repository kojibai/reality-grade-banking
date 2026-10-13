// Deterministic application projection only. These functions do not verify a
// receipt, admit ownership/funding, mutate a wallet, issue currency or commit.
// Native execution must independently verify all enclosing sources and bind
// these consequences to one SDK plan and an atomic participant commit.
export interface BankShareLock { owner: string; shares: string; purpose: 'sale' | 'backing'; }
export interface BankAssetProjection { assetId: string; totalShares: string; owners: Record<string, string>; locks: Record<string, BankShareLock>; custody: 'awaiting-receipt' | 'held' | 'redemption-pending' | 'released'; receiptArtifactDigest: string; }
export type AssetChange =
  | { kind: 'transfer'; from: string; to: string; shares: string }
  | { kind: 'lock'; owner: string; lockId: string; shares: string; purpose: 'sale' | 'backing' }
  | { kind: 'unlock'; owner: string; lockId: string }
  | { kind: 'sell'; owner: string; buyer: string; lockId: string; paymentIntentDigest: string }
  | { kind: 'redeem'; owner: string };
export interface BankBackingProjection { commitmentId: string; rail: 'reserve' | 'settlement'; amountPhiMicro: string; sourceArtifactDigest: string; valueHead: string; }
export interface BankCurrencyProjection { currencyId: string; supply: string; balances: Record<string, string>; backing: BankBackingProjection[]; redemption?: BankBackingProjection[]; }
export type CurrencyChange = { kind: 'transfer'; from: string; to: string; units: string } | { kind: 'redeem'; owner: string; units: string };
const SHA = /^[a-f0-9]{64}$/;
function fail(code: string): never { throw new Error(code); }
function units(value: string, positive = true): bigint {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,39})$/.test(value) || (positive && value === '0')) fail('INVALID_UNITS');
  return BigInt(value);
}
function coordinate(value: string): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.:-]{1,160}$/.test(value) || ['__proto__', 'constructor', 'prototype'].includes(value)) fail('INVALID_COORDINATE');
  return value;
}
function balancesTotal(balances: Record<string, string>): bigint {
  return Object.entries(balances).reduce((total, [owner, amount]) => { coordinate(owner); return total + units(amount, false); }, 0n);
}
function validateAsset(value: BankAssetProjection): void {
  coordinate(value.assetId);
  if (balancesTotal(value.owners) !== units(value.totalShares)) fail('SHARE_SUPPLY_MISMATCH');
  const locked = new Map<string, bigint>();
  for (const [id, lock] of Object.entries(value.locks)) {
    coordinate(id); coordinate(lock.owner); if (!['sale', 'backing'].includes(lock.purpose)) fail('INVALID_LOCK');
    locked.set(lock.owner, (locked.get(lock.owner) ?? 0n) + units(lock.shares));
  }
  for (const [owner, amount] of locked) if (amount > units(value.owners[owner] ?? '0', false)) fail('INSUFFICIENT_AVAILABLE_SHARES');
}
function available(value: BankAssetProjection, owner: string): bigint {
  coordinate(owner);
  return units(value.owners[owner] ?? '0', false) - Object.values(value.locks).filter(lock => lock.owner === owner).reduce((total, lock) => total + units(lock.shares), 0n);
}
function move(balances: Record<string, string>, from: string, to: string, amount: bigint): void {
  coordinate(from); coordinate(to); if (from === to) fail('SAME_RECIPIENT');
  const previous = units(balances[from] ?? '0', false); if (amount > previous) fail('INSUFFICIENT_UNITS');
  balances[from] = (previous - amount).toString(); balances[to] = (units(balances[to] ?? '0', false) + amount).toString();
  if (balances[from] === '0') delete balances[from];
}
export function previewAssetChange(source: BankAssetProjection, change: AssetChange): BankAssetProjection {
  const value: BankAssetProjection = structuredClone(source); validateAsset(value);
  if (value.custody !== 'held' || !SHA.test(value.receiptArtifactDigest)) fail('CUSTODY_REQUIRED');
  switch (change.kind) {
    case 'transfer': {
      const amount = units(change.shares); if (amount > available(value, change.from)) fail('INSUFFICIENT_AVAILABLE_SHARES');
      move(value.owners, change.from, change.to, amount); break;
    }
    case 'lock': {
      coordinate(change.lockId); if (Object.hasOwn(value.locks, change.lockId)) fail('LOCK_EXISTS');
      const amount = units(change.shares); if (amount > available(value, change.owner)) fail('INSUFFICIENT_AVAILABLE_SHARES');
      value.locks[change.lockId] = { owner: change.owner, shares: amount.toString(), purpose: change.purpose }; break;
    }
    case 'unlock': {
      coordinate(change.lockId); const lock = value.locks[change.lockId]; if (!lock || lock.owner !== change.owner) fail('LOCK_OWNER_MISMATCH');
      delete value.locks[change.lockId]; break;
    }
    case 'sell': {
      coordinate(change.lockId); const lock = value.locks[change.lockId]; if (!lock || lock.owner !== change.owner || lock.purpose !== 'sale') fail('LOCK_OWNER_MISMATCH');
      if (!SHA.test(change.paymentIntentDigest)) fail('PAYMENT_INTENT_REQUIRED');
      // This digest binds a proposal only. Native execution must verify the
      // exact buyer-to-seller rail intent and commit payment plus delivery.
      delete value.locks[change.lockId]; move(value.owners, change.owner, change.buyer, units(lock.shares)); break;
    }
    case 'redeem': {
      if (available(value, change.owner) !== units(value.totalShares)) fail('WHOLE_OWNERSHIP_REQUIRED');
      value.custody = 'redemption-pending'; break;
    }
    default: fail('UNKNOWN_ASSET_CHANGE');
  }
  validateAsset(value); return value;
}
function validateCurrency(value: BankCurrencyProjection): void {
  coordinate(value.currencyId); const supply = units(value.supply, false);
  if (balancesTotal(value.balances) !== supply) fail('SUPPLY_MISMATCH');
  if (!value.backing.length) fail('BACKING_REQUIRED');
  const commitments = new Set<string>(), sources = new Set<string>(); let backing = 0n;
  for (const item of value.backing) {
    coordinate(item.commitmentId); if (!['reserve', 'settlement'].includes(item.rail) || !SHA.test(item.sourceArtifactDigest) || !SHA.test(item.valueHead)) fail('INVALID_BACKING');
    const source = `${item.rail}:${item.sourceArtifactDigest}:${item.valueHead}`;
    if (commitments.has(item.commitmentId) || sources.has(source)) fail('DUPLICATE_BACKING');
    commitments.add(item.commitmentId); sources.add(source); backing += units(item.amountPhiMicro, false);
  }
  if (supply > 0n && backing === 0n) fail('BACKING_REQUIRED');
  if (supply === 0n && backing > 0n) fail('BACKING_SUPPLY_MISMATCH');
}
export function previewCurrencyChange(source: BankCurrencyProjection, change: CurrencyChange): BankCurrencyProjection {
  const value: BankCurrencyProjection = structuredClone(source); delete value.redemption; validateCurrency(value);
  const amount = units(change.units);
  if (change.kind === 'transfer') move(value.balances, change.from, change.to, amount);
  else if (change.kind === 'redeem') {
    coordinate(change.owner); const owned = units(value.balances[change.owner] ?? '0', false), supply = units(value.supply);
    if (amount > owned) fail('INSUFFICIENT_UNITS');
    value.balances[change.owner] = (owned - amount).toString(); if (value.balances[change.owner] === '0') delete value.balances[change.owner];
    value.redemption = value.backing.map(item => ({ ...item, amountPhiMicro: (amount * units(item.amountPhiMicro, false) / supply).toString() }));
    value.backing = value.backing.map((item, index) => ({ ...item, amountPhiMicro: (units(item.amountPhiMicro, false) - units(value.redemption![index].amountPhiMicro, false)).toString() }));
    value.supply = (supply - amount).toString();
  } else fail('UNKNOWN_CURRENCY_CHANGE');
  validateCurrency(value); return value;
}
