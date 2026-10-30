import {projectReceizAccountDisplayName} from './account-name.js';
import type { ReceizKeyFile } from '@receiz/sdk';
import { loadReceiz } from './client';
import { BANK_APPLICATION_ID } from './config';

/** Creation-only initialization of an SDK-generated, unused device identity.
 * The signed empty genesis is local account truth, never a funding capability.
 * Import/restore must preserve their existing sources and never call this path.
 */
export async function initializeFreshBankAccount(keyFile: ReceizKeyFile, passphrase = ''): Promise<ReceizKeyFile> {
  const sdk = await loadReceiz(), projection = await sdk.projectReceizIdentityAccount(keyFile);
  const snapshot = projection.verifiedState as Record<string, unknown> | null;
  const account = snapshot?.account as { userId?: unknown } | undefined;
  const identityKey = snapshot?.identityKey as { keyId?: unknown } | undefined;
  if (!projection.portableStateVerified || projection.authority !== 'verified-identity-portable-state' || !snapshot || snapshot.schema !== 'receiz.device.identity.v1' || snapshot.createdAt !== keyFile.issuedAt || !Number.isFinite(Date.parse(keyFile.issuedAt)) || account?.userId !== keyFile.owner.uid || identityKey?.keyId !== 'pending' || Object.keys(snapshot).some(key => !['schema', 'createdAt', 'account', 'identityKey'].includes(key))) throw new Error('BANK_FRESH_IDENTITY_GENESIS_REQUIRED');
  const at = new Date().toISOString(), kai = sdk.receizKaiNow();
  const wallet = {
    userId: keyFile.owner.uid, balanceUsd: '0.00', balancePhiMicro: '0',
    valueStates: { settledBalanceUsdCents: '0', ecosystemBalanceUsdCents: '0', livePortfolioValueUsdCents: '0', unrealizedPnlUsdCents: '0', withdrawableNowUsdCents: '0' },
    sync: { projectionComplete: true }, rollup: { lastEntryKaiPulse: String(kai.pulse), lastEntryKaiUpulse: String(kai.uPulse) },
  };
  return sdk.appendReceizIdentityPortableState({ keyFile, passphrase, schema: 'receiz.account.state.v3', exportedAt: at, snapshot: {
    ...snapshot, schema: 'receiz.account.state.v3', exportedAt: at,
    bankGenesis: { schema: 'bank.account-genesis.v1', applicationId: BANK_APPLICATION_ID, keyId: keyFile.keyId, userId: keyFile.owner.uid, createdAt: keyFile.issuedAt, kaiUPulse: String(kai.uPulse) },
    wallet: { routeSummary: wallet },
  } });
}

/** Name the original creation event before the existing SDK seals the identity. */
export function freshAccountIdentityOptions(createdAt=new Date().toISOString()) {
 return {createdAt,displayName:projectReceizAccountDisplayName({createdAt})};
}
