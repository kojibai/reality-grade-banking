import type { ReactNode } from 'react';
import { BottomNav, type Panel } from './BottomNav';

export function ConsoleShell({ children, panel, onNavigate, onDeposit, onProfile, identityLabel = 'ID', locked = false }: { children: ReactNode; panel: Panel; onNavigate: (panel: Panel) => void; onDeposit: () => void; onProfile: () => void; identityLabel?: string; locked?: boolean }) {
  return <div className="console"><header className="app-header"><button disabled={locked} className="wordmark" onClick={() => onNavigate('account')} aria-label="Receiz bank home">receiz<span>bank</span></button><div className="header-tools"><button disabled={locked} className="avatar" onClick={onProfile} aria-label="Account settings">{identityLabel}</button></div></header><main className="main-panel" id="main-content">{children}</main><BottomNav locked={locked} panel={panel} onNavigate={onNavigate} onDeposit={onDeposit} /></div>;
}
