import {BalanceDetails} from './BalanceDetails';
import {currentAvailabilityDifference} from '../../receiz/wallet-availability';
import {AccountProofPanel} from './AccountProofPanel';
import {EarnFromOriginals} from '../qualification/EarnFromOriginals';
import {BusinessUpgradePanel} from '../messages/BusinessUpgradePanel';
import {MarketTradeFlow} from '../market/MarketTradeFlow';
import {useEffect} from 'react';
import type { UIAction } from '../../core/useBank';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { SharedWallet } from '../../receiz/shared-wallet';
import { Sheet } from '../../components/Sheet';
import { formatMoney } from '../../core/money';
import { LiveDeposit } from '../deposit/LiveDeposit';
import { LiveSend, LiveReceive } from './LivePayments';
import { FundedWalletBalance } from './FundedWalletPayments';
import type { PaymentRequest } from '../../receiz/payment-request';
import { LiveAssetDetail } from '../assets/LiveAssets';
import { LiveOwnership } from '../assets/LiveOwnership';
import { LiveExchange } from '../market/LiveExchange';
import type { PublicMarketItem } from '../../receiz/public-market';
import { CreateAsset } from '../assets/CreateAsset';
import {AssetCreationSheet} from '../assets/AssetCreationSheet';
import { IdentityProfile } from './IdentityProfile';
export function LiveActions({ action, identity, wallet, onClose, onForget, onRefresh, paymentRequest, cardResumeSessionId, onCardResumeConsumed, onOpenAssistant = onClose, onVaultsEntryConsumed, onLinkedPaymentSaved, active = true, marketItems = [], onOpen }: { onOpen?:(action:UIAction)=>void; onOpenAssistant?:()=>void;onVaultsEntryConsumed?:()=>void; onLinkedPaymentSaved?:(token:string)=>void; cardResumeSessionId?:string|null;onCardResumeConsumed?:()=>void;marketItems?: PublicMarketItem[]; active?: boolean; action: UIAction; identity: OpenIdentity; wallet: SharedWallet | null; onClose: () => void; onForget: () => Promise<void>; onRefresh: () => void; paymentRequest?: PaymentRequest | null }) {
  useEffect(()=>{if(action.kind==='send'&&cardResumeSessionId)onCardResumeConsumed?.();},[action.kind,cardResumeSessionId,onCardResumeConsumed]);
  const titles: Record<string, string> = { business: 'Business', 'market-trade':'Market trade','account-proof':'Your account proof','earn-originals':'Earn from Originals',deposit: 'Add', send: 'Send', receive: 'Receive', balance: 'Your balance', growth: 'Settlement', profile: 'Your Receiz ID', currency: 'New original', exchange: 'Exchange', rules: 'Money rules' };
  let body;
  if (action.kind === 'balance' || action.kind === 'growth') {
    const observation=identity.knownWallet?.()??null;
    const difference=currentAvailabilityDifference(wallet,observation?.history??[],observation?.observedAt??null);
    const showOfflineBalance=action.kind==='balance'&&active&&!!identity.fundedWallet;
    body=<>
      <p className="balance-label">{showOfflineBalance?'Available online':'Available balance'}</p>
      <div className="success-amount navy-text balance-sheet-amount">{wallet?formatMoney(wallet.totalUsdCents):'—'}</div>
      <p className="body-copy small-copy">{wallet?difference!==null?'Your Settlement calculation is below.':'Ready to send, receive or keep with you.':'Your verified account balance appears here.'}</p>
      <p className="balance-local-time">{new Date().toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})} · Local time</p>
      {showOfflineBalance&&<FundedWalletBalance key={identity.binding.artifactSha256} identity={identity} onRefresh={onRefresh} onSendNearby={onOpen?()=>onOpen({kind:'send',nearbyGuide:{}}):undefined}/>}
      <BalanceDetails wallet={wallet} observation={observation} focusSettlement={action.kind==='balance'&&action.focus==='settlement'}/>
    </>;
  }
  else if(action.kind==='earn-originals') body=<EarnFromOriginals key={`${identity.binding?.artifactSha256}:${wallet?.userId??identity.walletReceivingAddress?.()??''}`} identity={identity} accountUid={wallet?.userId??identity.walletReceivingAddress?.()??null} onOpen={onOpen}/>;
  else if (action.kind === 'account-proof') body = <AccountProofPanel identity={identity}/>;
  else if (action.kind === 'business') body = <BusinessUpgradePanel identity={identity} onOpenAssistant={onOpenAssistant} active={active}/>;
  else if (action.kind === 'profile') body = <IdentityProfile active={active} accountUid={wallet?.userId} vaultsEntry={action.vaults} onUseSendNearby={onOpen?amount=>onOpen({kind:'send',nearbyGuide:{amount}}):undefined} onVaultsEntryConsumed={onVaultsEntryConsumed} identity={identity} onForget={onForget} onRefresh={onRefresh} />;
  else if (action.kind === 'currency') body = <CreateAsset marketItems={marketItems} active={active} identity={identity} onRefresh={onRefresh} onClose={onClose} />;
  else if(action.kind==='market-trade') body=<MarketTradeFlow key={`${identity.binding?.artifactSha256}:${action.marketItemId}:${action.side}`} identity={identity} wallet={wallet} intent={{itemId:action.marketItemId,side:action.side,title:marketItems.find(item=>item.id===action.marketItemId)?.title??'Proof object'}} onRefresh={onRefresh}/>;
  else if (action.kind === 'trade') body = <LiveOwnership identity={identity} mode={action.mode} initialDigest={action.assetId} onRefresh={onRefresh} />;
  else if (action.kind === 'exchange') body = <LiveExchange identity={identity} items={marketItems} onRefresh={onRefresh} />;
  else if (action.kind === 'receive') {
    const payment=action.nearbyPayment;
    body=<LiveReceive identity={identity} onRefresh={onRefresh} active={active} linkedPayment={payment}
      onLinkedPaymentSaved={payment?()=>onLinkedPaymentSaved?.(payment):undefined}/>;
  }
  else if (action.kind === 'deposit') body = <LiveDeposit identity={identity} onClose={onClose} onRefresh={onRefresh} resumeSessionId={cardResumeSessionId} onResumeConsumed={onCardResumeConsumed} onCreateAsset={onOpen?()=>onOpen({kind:'currency'}):undefined} />;
  else if (action.kind === 'send') body = <LiveSend active={active} identity={identity} onRefresh={onRefresh} wallet={wallet} initialRequest={action.nearbyGuide?null:action.paymentRequest??(action.recipient?null:paymentRequest)} initialRecipient={action.recipient} initialNearbyGuide={action.nearbyGuide} onClose={onClose} />;
  else if (action.kind === 'pending' || action.kind === 'asset' || action.kind === 'proof') body = <LiveAssetDetail identity={identity} active={active} onRefresh={onRefresh} marketItems={marketItems} onTrade={onOpen?(side,marketItemId)=>onOpen({kind:'market-trade',side,marketItemId}):undefined} digest={action.kind === 'pending' ? action.depositId : action.assetId} />;
  else if (action.kind === 'bridge') body = <LiveOwnership identity={identity} mode="send" initialDigest={action.assetId} onRefresh={onRefresh} />;
  else body = <div className="empty-state"><h3>Automatic transfers are not available yet.</h3><p>You can review and approve each transfer from Send.</p></div>;
  return action.kind==='currency'?<AssetCreationSheet active={active} onClose={onClose}>{body}</AssetCreationSheet>:<Sheet active={active} title={titles[action.kind] ?? 'Your asset'} onClose={onClose}>{body}</Sheet>;
}
