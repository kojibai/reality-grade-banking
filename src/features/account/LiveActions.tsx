import { useState } from 'react';
import type { UIAction } from '../../core/useBank';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { SharedWallet } from '../../receiz/shared-wallet';
import { Sheet } from '../../components/Sheet';
import { formatMoney } from '../../core/money';
import { LiveDeposit } from '../deposit/LiveDeposit';
import { LiveSend, LiveReceive } from './LivePayments';
import type { PaymentRequest } from '../../receiz/payment-request';
import { LiveAssetDetail } from '../assets/LiveAssets';
import { BankConnection } from './BankConnection';
export function LiveActions({ action, identity, wallet, onClose, onForget, onRefresh, paymentRequest }: { action: UIAction; identity: OpenIdentity; wallet: SharedWallet | null; onClose: () => void; onForget: () => Promise<void>; onRefresh: () => void; paymentRequest?: PaymentRequest | null }) {
  const [backup, setBackup] = useState(false);
  const titles: Record<string, string> = { deposit: 'Deposit', send: 'Send', receive: 'Receive', balance: 'Your balance', growth: 'Settlement', profile: 'Your Receiz ID', currency: 'Create a currency', exchange: 'Exchange', rules: 'Money rules' };
  const backupId = () => { const held = identity.backup(), url = URL.createObjectURL(new Blob([new Uint8Array(held.bytes)])); const link = document.createElement('a'); link.href = url; link.download = held.filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1_000); setBackup(true); };
  let body;
  if (action.kind === 'balance' || action.kind === 'growth') body = <><p className="body-copy">The same account shown in your Receiz wallet.</p><div className="detail-list"><div><span>Reserve</span><strong>{wallet ? formatMoney(wallet.reserveUsdCents) : 'Unavailable'}</strong></div><div><span>Settlement</span><strong>{wallet ? formatMoney(wallet.settlementUsdCents) : 'Unavailable'}</strong></div><div><span>Total</span><strong>{wallet ? formatMoney(wallet.totalUsdCents) : 'Unavailable'}</strong></div>{wallet?.pulse && <div><span>Kai pulse</span><strong>{wallet.pulse}</strong></div>}{wallet?.kaiUpulse && <div><span>Kai uPulse</span><strong>{wallet.kaiUpulse}</strong></div>}</div><p className="body-copy small-copy">Settlement transfers use destinations that preserve proof-backed continuity.</p></>;
  else if (action.kind === 'profile') body = <><p className="body-copy">Your verified identity is held on this device.</p><code className="proof-coordinate">{identity.binding.identityOwnerReceizId}</code><button className="primary-button" onClick={backupId}>Back up my Identity Seal</button>{backup && <div className="identity-import"><p className="body-copy">{identity.needsPhrase ? 'Save this recovery phrase separately from your downloaded Identity Seal. It unlocks your signing key on another device.' : 'Your Identity Seal opens without an unlock phrase.'}</p>{identity.needsPhrase && <input type="password" readOnly value={identity.backup().phrase} aria-label="Private recovery phrase" />}<button className="text-button" onClick={() => setBackup(false)}>{identity.needsPhrase ? 'Hide recovery phrase' : 'Hide backup details'}</button></div>}<BankConnection identity={identity} /><button className="secondary-button" onClick={() => void onForget()}>Remove ID from this device</button><p className="body-copy small-copy">Removing device custody does not close your Receiz account. Save your Identity Seal{identity.needsPhrase ? ', recovery phrase' : ''} and original deposited proofs before removing it. An unfinished card checkout is held on this device.</p></>;
  else if (action.kind === 'receive') body = <LiveReceive identity={identity} />;
  else if (action.kind === 'deposit') body = <LiveDeposit identity={identity} onClose={onClose} onRefresh={onRefresh} />;
  else if (action.kind === 'send') body = <LiveSend wallet={wallet} initialRequest={paymentRequest} onClose={onClose} />;
  else if (action.kind === 'pending' || action.kind === 'asset') body = <LiveAssetDetail identity={identity} digest={action.kind === 'pending' ? action.depositId : action.assetId} />;
  else body = <div className="empty-state"><h3>Open the required proof sources</h3><p>This action needs admitted ownership, funding and a qualified execution route. This bank has account read access; issuance and trading are not connected yet.</p></div>;
  return <Sheet title={titles[action.kind] ?? 'Your asset'} onClose={onClose}>{body}</Sheet>;
}
