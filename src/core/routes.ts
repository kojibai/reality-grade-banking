import type { Panel } from '../components/BottomNav';
import type { UIAction } from './useBank';
export interface ConsoleRoute { panel: Panel; sheet: UIAction | null; }
export function sheetCloseBehavior(state: { overlayEntry?: boolean; sheet?: UIAction } | null): 'back' | 'replace' { return state?.overlayEntry ? 'back' : 'replace'; }
export function routeHash(panel: Panel, action: UIAction | null = null): string {
  if (!action) return `#${panel}`;
  if(action.kind==='market-trade')return `#${panel}/market-trade/${encodeURIComponent(action.marketItemId)}/${action.side}`;
  const id = 'assetId' in action ? action.assetId : 'depositId' in action ? action.depositId : undefined;
  return `#${panel}/${action.kind}${id ? `/${encodeURIComponent(id)}` : ''}${action.kind === 'trade' ? `/${action.mode}` : ''}`;
}
export function parseRoute(hash: string): ConsoleRoute {
  try {
    const [panelPart, kind, id, mode] = hash.replace(/^#/, '').split('/').map(decodeURIComponent);
    const panel: Panel = ['account', 'market', 'assets', 'ledger'].includes(panelPart) ? panelPart as Panel : 'account';
    if (!kind) return { panel, sheet: null };
    if (['asset', 'proof', 'bridge'].includes(kind) && id) return { panel, sheet: { kind: kind as 'asset' | 'proof' | 'bridge', assetId: id } };
    if(kind==='market-trade'&&id&&['buy','sell'].includes(mode))return{panel,sheet:{kind:'market-trade',marketItemId:id,side:mode as 'buy'|'sell'}};
    if (kind === 'trade' && id && ['buy', 'sell'].includes(mode)) return { panel, sheet: { kind: 'trade', assetId: id, mode: mode as 'buy' | 'sell' } };
    if (kind === 'pending' && id) return { panel, sheet: { kind: 'pending', depositId: id } };
    if (kind === 'send') return { panel, sheet: { kind: 'send', assetId: id } };
    if (['deposit', 'receive', 'balance', 'growth', 'profile', 'currency', 'exchange', 'rules', 'messages'].includes(kind)) return { panel, sheet: { kind: kind as 'deposit' | 'receive' | 'balance' | 'growth' | 'profile' | 'currency' | 'exchange' | 'rules' | 'messages' } };
    return { panel, sheet: null };
  } catch { return { panel: 'account', sheet: null }; }
}
