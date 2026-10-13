import type { SharedWallet } from './shared-wallet';
import { BANK_OBSERVATION_APPLICATION_IDS } from './config';
export interface WalletObservation { wallet: SharedWallet; observedAt: string; }
export function readWalletObservation(input: unknown, binding: { keyId: string; artifactSha256: string }): WalletObservation | null {
  if (!input || typeof input !== 'object') return null;
  const value = input as Record<string, unknown>, wallet = value.wallet as SharedWallet;
  if (value.schema !== 'receiz.bank.private-wallet-observation.v1' || value.authority !== 'read-only-observation' || !BANK_OBSERVATION_APPLICATION_IDS.some(id => id === value.applicationId) || value.keyId !== binding.keyId || value.artifactSha256 !== binding.artifactSha256 || typeof value.observedAt !== 'string' || !Number.isFinite(Date.parse(value.observedAt)) || !wallet || typeof wallet.userId !== 'string' || !wallet.userId || wallet.userId.length > 128) return null;
  for (const amount of [wallet.totalUsdCents, wallet.reserveUsdCents, wallet.settlementUsdCents, wallet.balancePhiMicro]) if (typeof amount !== 'string' || !/^(0|[1-9]\d{0,39})$/.test(amount)) return null;
  if (BigInt(wallet.totalUsdCents) !== BigInt(wallet.reserveUsdCents) + BigInt(wallet.settlementUsdCents)) return null;
  return { wallet, observedAt: value.observedAt };
}
