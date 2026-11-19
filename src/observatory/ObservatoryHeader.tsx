import {useScrollReveal} from '../core/useScrollReveal';
import {useSyncExternalStore} from 'react';
import {readAccountAppearance,subscribeAccountAppearance} from '../receiz/account-appearance';
import {BottomNav} from '../components/BottomNav';
import {requestBankNavigation} from '../core/bank-navigation';
import {routeHash} from '../core/routes';
import {Search} from 'lucide-react';
import {BankMark} from '../components/BankMark';

export function ObservatoryHeader({active}:{active:boolean}) {
  const appearance=useSyncExternalStore(subscribeAccountAppearance,readAccountAppearance,()=>null);
  const {away,reveal} = useScrollReveal(active, '.obs-header a:focus-visible,.analytics-dock button:focus-visible');
  return <><header className="obs-topbar" data-tucked={away || undefined} onFocus={reveal}><div className="obs-header">
    <a href="/" className="obs-brand" aria-label="Bankeiz home"><BankMark/></a>
    <nav aria-label="Main navigation"><a href="/explore/">Explore</a><a href="/market-cap/">Market</a><a href="/ledger/">Ledger</a><a href="/learn/">Learn</a><a href="/discover/" className="obs-discover" aria-label="Discover people and their work" title="Discover"><Search size={20} strokeWidth={1.5}/></a></nav>
  </div></header>
    {active&&appearance?.identityKeyId&&<div className="analytics-dock" data-tucked={away||undefined} onFocus={reveal}>
      <BottomNav panel={null} onNavigate={panel=>requestBankNavigation(routeHash(panel))} onDeposit={()=>requestBankNavigation(routeHash('account',{kind:'deposit'}))}/>
    </div>}</>;
}
