import {InlineOpening} from '../../components/InlineOpening';
import { ArrowUpRight, ArrowDown, ChevronRight, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { type ChartPeriod } from '../../core/chart-history';
import { formatMoney } from '../../core/money';
import { BalanceChart } from './BalanceChart';
import { type WalletPoint } from '../../receiz/wallet-series';
import type { PublicMarketItem } from '../../receiz/public-market';
import type { SharedWallet } from '../../receiz/shared-wallet';
import type {BankNoteDepositResult} from '../../receiz/offline-notes';
import type {MarketPortfolio} from '../../receiz/market-portfolio';
import {AccountInvestmentValue} from './AccountInvestmentValue';
import {AccountAssetSummary} from './AccountAssetSummary';
import {AccountAvailability} from './AccountAvailability';
export function LiveAccount({ wallet, busy, error, observedAt, onRefresh, onSend, onReceive, onBalance, onAvailability = onBalance, onAssets, onInvestments = onAssets, onLedger, walletHistory = [], historyComplete = true, showcase = [], portfolio = null, marketItems = [], ready = true, receivedNotes = [] }: { wallet: SharedWallet | null; busy: boolean; error: string | null; observedAt: string | null; onRefresh: () => void; onSend: () => void; onReceive: () => void; onBalance: () => void; onAvailability?: () => void; onAssets: () => void; onInvestments?: () => void; onLedger: () => void; walletHistory?: WalletPoint[]; historyComplete?:boolean; showcase?: PublicMarketItem[]; portfolio?:MarketPortfolio|null;marketItems?:PublicMarketItem[];ready?: boolean; receivedNotes?:readonly BankNoteDepositResult[] }) {
  const [period, setPeriod] = useState<ChartPeriod>('ALL');
  const receivedUsdCents=useMemo(()=>receivedNotes.filter(note=>note.status==='received').reduce((sum,note)=>sum+BigInt(note.amountUsdCents),0n),[receivedNotes]);
  return <div className="account-layout live-account"><section className="account-primary"><button disabled={!ready} className="balance-display" onClick={onBalance} aria-label="View balance details"><span className="balance-label">Balance</span><span className="balance-amount">{wallet ? formatMoney(wallet.totalUsdCents) : '—'}</span>{!wallet && <span className="balance-change muted">{busy ? <InlineOpening label="Preparing your account"/> : 'Waiting for your account proof'}</span>}</button>
    {receivedUsdCents>0n&&<button className="received-note-balance" onClick={onReceive}><span>Received Notes<small>Reconciles before spending</small></span><strong>{formatMoney(receivedUsdCents.toString())}</strong><ChevronRight size={16}/></button>}
    <BalanceChart wallet={wallet} history={walletHistory} completeHistory={historyComplete} observedAt={observedAt} period={period} onPeriodChange={setPeriod} /><AccountAvailability wallet={wallet} history={walletHistory} observedAt={observedAt} ready={ready} onOpen={onAvailability}/><div className="money-actions"><button disabled={!ready} className="send-action" onClick={onSend}><ArrowUpRight size={29} strokeWidth={1.7} /><span>Send</span></button><button disabled={!ready} onClick={onReceive}><ArrowDown size={29} strokeWidth={1.7} /><span>Receive</span></button></div>
    <AccountInvestmentValue portfolio={portfolio} items={marketItems} ready={ready} onOpen={onInvestments}/>{error && <p className="form-error" role="status">{error}</p>}
    <button className="text-button" onClick={onRefresh} disabled={busy || !ready}><RefreshCw size={14} />{<>Refresh balance{busy && !wallet&&<InlineOpening compact label="Preparing account"/>}</>}</button>{observedAt && <p className="body-copy small-copy">Last read {new Date(observedAt).toLocaleString()}{error ? ' · retained observation' : ''}</p>}</section><div className="account-secondary"><AccountAssetSummary portfolio={portfolio} marketItems={marketItems} showcase={showcase} ready={ready} onAssets={onAssets}/><section><div className="section-heading"><h2>Recent activity</h2><button disabled={!ready} className="subtle-link" onClick={onLedger} aria-label="View all activity"><ChevronRight size={18} /></button></div><div className="rows-surface"><button disabled={!ready} className="asset-row" onClick={onLedger}><span className="row-copy"><strong>Your history</strong><span>Your transactions and receipts</span></span><ChevronRight size={18} /></button></div></section></div></div>;
}
