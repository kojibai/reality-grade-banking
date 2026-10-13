import type { ReactNode } from 'react';
import { BottomNav, type Panel } from './BottomNav';

export function ConsoleShell({ children, panel, onNavigate, onDeposit, onProfile, identityLabel = 'ID' }: { children: ReactNode; panel: Panel; onNavigate: (panel: Panel) => void; onDeposit: () => void; onProfile: () => void; identityLabel?: string }) {
  return <div className="console"><header className="app-header"><button className="wordmark" onClick={() => onNavigate('account')} aria-label="Receiz bank home">receiz<span>bank</span></button><div className="header-tools"><button className="avatar" onClick={onProfile} aria-label="Account settings">{identityLabel}</button></div></header><main className="main-panel" id="main-content">{children}</main><BottomNav panel={panel} onNavigate={onNavigate} onDeposit={onDeposit} /></div>;
}
