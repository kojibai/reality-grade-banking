import { House, ChartNoAxesColumnIncreasing, Plus, Layers, NotebookText } from 'lucide-react';
export type Panel = 'account' | 'market' | 'assets' | 'ledger';

export function BottomNav({ panel, onNavigate, onDeposit, locked = false }: { panel: Panel; onNavigate: (panel: Panel) => void; onDeposit: () => void; locked?: boolean }) {
  const items = [{ id: 'account', label: 'Account', icon: House }, { id: 'market', label: 'Market', icon: ChartNoAxesColumnIncreasing }, { id: 'deposit', label: 'Add', icon: Plus }, { id: 'assets', label: 'Assets', icon: Layers }, { id: 'ledger', label: 'Ledger', icon: NotebookText }] as const;
  return <nav className="bottom-nav" aria-label="Main navigation">{items.map(({ id, label, icon: Icon }) => <button key={id} disabled={locked} className={`nav-item ${panel === id ? 'selected' : ''} ${id === 'deposit' ? 'nav-deposit' : ''}`} aria-current={panel === id ? 'page' : undefined} onClick={() => id === 'deposit' ? onDeposit() : onNavigate(id)}><span className="nav-icon"><Icon size={23} strokeWidth={1.8} /></span><span>{label}</span></button>)}</nav>;
}
