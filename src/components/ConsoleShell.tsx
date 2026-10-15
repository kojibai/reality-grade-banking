import type { ReactNode } from 'react';
import { BottomNav, type Panel } from './BottomNav';
import { branding } from '../../branding/profile.mjs';

export function ConsoleShell({ children, panel, onNavigate, onDeposit, onProfile, identityLabel = 'ID', locked = false }: { children: ReactNode; panel: Panel; onNavigate: (panel: Panel) => void; onDeposit: () => void; onProfile: () => void; identityLabel?: string; locked?: boolean }) {
  return <div className="console"><header className="app-header"><button disabled={locked} className="wordmark" onClick={() => onNavigate('account')} aria-label={`${branding.applicationName} home`}>{branding.wordmark}<span>{branding.descriptor}</span></button><div className="header-tools"><button disabled={locked} className="avatar" onClick={onProfile} aria-label="Account settings">{identityLabel}</button></div></header><main className="main-panel" id="main-content">{children}<p className="bank-signature">Reality-Grade Banking</p></main><BottomNav locked={locked} panel={panel} onNavigate={onNavigate} onDeposit={onDeposit} /></div>;
}
