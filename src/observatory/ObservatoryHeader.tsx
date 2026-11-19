import {useScrollReveal} from '../core/useScrollReveal';
import {Search} from 'lucide-react';
import {BankMark} from '../components/BankMark';

export function ObservatoryHeader({active}:{active:boolean}) {
  const {away,reveal} = useScrollReveal(active, '.obs-header a:focus-visible');
  return <header className="obs-topbar" data-tucked={away || undefined} onFocus={reveal}><div className="obs-header">
    <a href="/" className="obs-brand" aria-label="Bankeiz home"><BankMark/></a>
    <nav aria-label="Main navigation"><a href="/explore/">Explore</a><a href="/market-cap/">Market</a><a href="/ledger/">Ledger</a><a href="/discover/" className="obs-discover" aria-label="Discover people and their work" title="Discover"><Search size={20} strokeWidth={1.5}/></a></nav>
  </div></header>;
}
