import { Sheet } from './Sheet';
import { useBank, type UIAction } from '../core/useBank';
import { DepositSheet } from '../features/deposit/DepositSheet';
import { AssetDetail } from '../features/market/AssetDetail';
import { TradeSheet } from '../features/market/TradeSheet';
import { CurrencySheet, ExchangeSheet } from '../features/market/CurrencySheet';
import { TransferSheet, ReceiveSheet, BridgeSheet } from '../features/account/TransferSheet';
import { BalanceDetails, GrowthDetails, ProofDetails, ProfileSheet } from '../features/account/AccountDetails';
import { RulesSheet } from '../features/account/RulesSheet';
export function ActionSheets({ action }: { action: UIAction }) {
  const { close, state } = useBank();
  if ('assetId' in action && action.assetId && !state.assets.some(asset => asset.id === action.assetId) || action.kind === 'pending' && !state.deposits.some(deposit => deposit.id === action.depositId)) return <Sheet title="Source unavailable" onClose={close}><p className="body-copy">This account does not hold the referenced source. Open its original proof or return to your account.</p></Sheet>;
  const titles = { deposit: 'Deposit', pending: 'Deposit', asset: 'Your asset', proof: 'Proof & history', trade: action.kind === 'trade' && action.mode === 'sell' ? 'Take cash' : 'Buy ownership', currency: 'Create a currency', exchange: 'Exchange', send: 'Send', receive: 'Receive', bridge: 'Transfer out', balance: 'Your balance', growth: 'Settlement growth', profile: 'Your account', rules: 'Money rules' };
  const body = (() => { switch (action.kind) { case 'deposit': return <DepositSheet />; case 'pending': return <DepositSheet depositId={action.depositId} />; case 'asset': return <AssetDetail assetId={action.assetId} />; case 'proof': return <ProofDetails assetId={action.assetId} />; case 'trade': return <TradeSheet assetId={action.assetId} mode={action.mode} />; case 'currency': return <CurrencySheet />; case 'exchange': return <ExchangeSheet />; case 'send': return <TransferSheet assetId={action.assetId} />; case 'receive': return <ReceiveSheet />; case 'bridge': return <BridgeSheet assetId={action.assetId} />; case 'balance': return <BalanceDetails />; case 'growth': return <GrowthDetails />; case 'profile': return <ProfileSheet />; case 'rules': return <RulesSheet />; } })();
  return <Sheet title={titles[action.kind]} onClose={close}>{body}</Sheet>;
}
