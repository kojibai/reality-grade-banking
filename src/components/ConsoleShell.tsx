import type { ReactNode } from 'react';
import { BottomNav, type Panel } from './BottomNav';

export function ConsoleShell({ children, panel, onNavigate, onDeposit, onProfile }: { children: ReactNode; panel: Panel; onNavigate: (panel: Panel) => void; onDeposit: () => void; onProfile: () => void }) {
  return <div className="console"><header className="app-header"><button className="wordmark" onClick={() => onNavigate('account')} aria-label="Receiz bank home">receiz<span>bank</span></button><div className="header-tools"><span className="demo-label" title="Demonstration account. No real money moves.">Demo</span><button className="avatar" onClick={onProfile} aria-label="Account settings">JD</button></div></header><main className="main-panel" id="main-content" key={panel}>{children}</main><BottomNav panel={panel} onNavigate={onNavigate} onDeposit={onDeposit} /></div>;
}
