import type { BankOperation, BankState, BalanceView, BankEvent } from './types';
import { SCALE, exactAmount, demoUsdCents } from './money';

export function assetValuePhiMicro(state: BankState, assetId: string, quantityMicro?: string): string {
  const asset = state.assets.find(a => a.id === assetId);
  const quantity = quantityMicro ?? state.holdings.find(h => h.assetId === assetId)?.quantityMicro ?? '0';
  return asset ? (BigInt(quantity) * BigInt(asset.pricePhiMicro) / SCALE).toString() : '0';
}
export function projectBalance(state: BankState): BalanceView {
  const assets = state.holdings.reduce((sum, holding) => sum + BigInt(assetValuePhiMicro(state, holding.assetId, holding.quantityMicro)), 0n);
  const backing = state.currencies.reduce((sum, currency) => sum + BigInt(currency.backingPhiMicro), 0n);
  const total = BigInt(state.reservePhiMicro) + BigInt(state.settlementPhiMicro) + assets + backing;
  return { totalUsdCents: demoUsdCents(total.toString()), reserveUsdCents: demoUsdCents(state.reservePhiMicro), settlementUsdCents: demoUsdCents(state.settlementPhiMicro), assetsUsdCents: demoUsdCents(assets.toString()), backingUsdCents: demoUsdCents(backing.toString()), growthUsdCents: demoUsdCents(state.growthPhiMicro) };
}
export function applyOperation(state: BankState, operation: BankOperation): BankState {
  const signature = JSON.stringify(operation, Object.keys(operation).sort());
  const prior = state.appliedOperations[operation.id];
  if (prior) { if (prior !== signature) throw new Error('This operation already refers to a different intent.'); return state; }
  const next = structuredClone(state);
  const event: BankEvent = { id: operation.id, title: '', kind: operation.kind, amountPhiMicro: '0', time: 'Just now', actor: state.identity.actor, proofRef: `demo:${operation.id}`, source: 'demo' };
  const debit = (rail: 'reserve' | 'settlement', amount: bigint) => { const key = rail === 'reserve' ? 'reservePhiMicro' : 'settlementPhiMicro'; if (BigInt(next[key]) < amount) throw new Error('Insufficient available value.'); next[key] = (BigInt(next[key]) - amount).toString(); };
  const credit = (rail: 'reserve' | 'settlement', amount: bigint) => { const key = rail === 'reserve' ? 'reservePhiMicro' : 'settlementPhiMicro'; next[key] = (BigInt(next[key]) + amount).toString(); };
  const owned = (assetId: string, quantity: bigint) => { const holding = next.holdings.find(h => h.assetId === assetId); if (!holding || BigInt(holding.quantityMicro) < quantity) throw new Error('You do not own that amount.'); return holding; };
  switch (operation.kind) {
    case 'intake': {
      exactAmount(operation.quantityMicro, true); exactAmount(operation.estimatePhiMicro, true);
      if (!operation.title.trim()) throw new Error('Name the asset you are depositing.');
      next.deposits.unshift({ id: operation.id, title: operation.title.trim(), category: operation.category, quantityMicro: operation.quantityMicro, estimatePhiMicro: operation.estimatePhiMicro, status: 'awaiting', handoff: operation.category === 'stock' ? 'transfer' : operation.category === 'property' ? 'title' : 'delivery' });
      event.title = `${operation.title} deposit started`; break;
    }
    case 'accept-custody': {
      const deposit = next.deposits.find(d => d.id === operation.depositId);
      if (!deposit || deposit.status !== 'awaiting') throw new Error('This deposit is not awaiting custody.');
      const id = `asset-${deposit.id}`;
      next.assets.unshift({ id, title: deposit.title, category: deposit.category, unit: deposit.category === 'stock' ? 'shares' : 'units', pricePhiMicro: deposit.estimatePhiMicro, change: 0, totalUnitsMicro: deposit.quantityMicro, availableMicro: '0', custody: deposit.category === 'stock' ? 'Securities custody' : deposit.category === 'property' ? 'Verified title' : 'Bank vault', description: 'A demonstration of custody-backed ownership. The source, inspection and receiving records must qualify before real issuance.', history: [Number(deposit.estimatePhiMicro) / 1e6, Number(deposit.estimatePhiMicro) / 1e6], source: 'demo' });
      next.holdings.unshift({ assetId: id, quantityMicro: deposit.quantityMicro }); deposit.status = 'custodied';
      event.title = `${deposit.title} received`; event.assetId = id; event.quantityMicro = deposit.quantityMicro; event.custody = next.assets[0].custody; event.amountPhiMicro = assetValuePhiMicro(next, id); break;
    }
    case 'fund': { const amount = exactAmount(operation.amountPhiMicro, true); credit('reserve', amount); event.title = 'Dollars added'; event.amountPhiMicro = amount.toString(); event.rail = 'reserve'; break; }
    case 'send': { const amount = exactAmount(operation.amountPhiMicro, true); if (!operation.recipient.trim()) throw new Error('Choose a recipient.'); debit(operation.rail, amount); event.title = `Sent to ${operation.recipient}`; event.amountPhiMicro = amount.toString(); event.rail = operation.rail; event.recipient = operation.recipient.trim(); break; }
    case 'send-asset': {
      const quantity = exactAmount(operation.quantityMicro, true), holding = owned(operation.assetId, quantity), asset = next.assets.find(a => a.id === operation.assetId)!;
      if (!operation.recipient.trim()) throw new Error('Choose a recipient.');
      holding.quantityMicro = (BigInt(holding.quantityMicro) - quantity).toString(); event.title = `${asset.title} ownership sent`; event.assetId = asset.id; event.quantityMicro = quantity.toString(); event.amountPhiMicro = assetValuePhiMicro(next, asset.id, quantity.toString()); event.recipient = operation.recipient.trim(); event.custody = asset.custody; break;
    }
    case 'sell': {
      const quantity = exactAmount(operation.quantityMicro, true), holding = owned(operation.assetId, quantity), asset = next.assets.find(a => a.id === operation.assetId)!;
      const value = BigInt(assetValuePhiMicro(next, asset.id, quantity.toString())); if (value === 0n) throw new Error('Amount is too small.');
      holding.quantityMicro = (BigInt(holding.quantityMicro) - quantity).toString(); asset.availableMicro = (BigInt(asset.availableMicro) + quantity).toString(); credit(operation.rail, value); event.title = `${asset.title} sold ${operation.counterparty === 'market' ? 'on Market' : 'to the bank'}`; event.assetId = asset.id; event.amountPhiMicro = value.toString(); event.rail = operation.rail; event.quantityMicro = quantity.toString(); event.custody = asset.custody; break;
    }
    default: throw new Error('This operation is not available yet.');
  }
  next.events.unshift(event); next.appliedOperations[operation.id] = signature; return next;
}
