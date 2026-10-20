import type { ReactNode } from 'react';
import {MessageCircle} from 'lucide-react';
import { BottomNav, type Panel } from './BottomNav';
import { branding } from '../../branding/profile.mjs';
import {BankMark} from './BankMark';
import { KaiKlok } from './KaiKlok';
import {ProfileAvatar} from './ProfileAvatar';

export function ConsoleShell({ children, panel, onNavigate, onDeposit, onProfile, onMessages, identityLabel = 'ID', identityImage, locked = false, active = true }: { children: ReactNode; panel: Panel; onNavigate: (panel: Panel) => void; onDeposit: () => void; onProfile: () => void; onMessages?: () => void; identityLabel?: string; identityImage?:string|null; locked?: boolean; active?: boolean }) {
  return <div className="console"><header className="app-header"><button disabled={locked} className="bank-home-mark" onClick={() => onNavigate('account')} aria-label={`${branding.applicationName} home`}><BankMark/></button><KaiKlok active={active} /><div className="header-tools">{onMessages&&<button disabled={locked} className="message-entry" onClick={onMessages} aria-label="Open your Twin and messages"><MessageCircle size={21} strokeWidth={1.65}/></button>}<button disabled={locked} className="avatar" onClick={onProfile} aria-label="Account settings"><ProfileAvatar src={identityImage} name={identityLabel} fallback={identityLabel} eager/></button></div></header><main className="main-panel" id="main-content">{children}<p className="bank-signature"><a href="/learn/reality-grade-banking/">Reality-Grade Banking</a></p></main><BottomNav locked={locked} panel={panel} onNavigate={onNavigate} onDeposit={onDeposit} /></div>;
}
