import {renderToString} from 'react-dom/server';
import {receizKaiNow} from '@receiz/sdk';
import {PublicProfilePage} from '../src/public-explorer/PublicProfilePage';
import {BankMark} from '../src/components/BankMark';
import {ProfileFooter} from '../src/public-explorer/ProfileFooter';
import type {PublicProfile} from '../src/receiz/public-profile';

/** The existing profile components render the first document too. There is no
 * placeholder profile and no second, separately styled server-side design. */
export function renderPublicProfile(profile:PublicProfile):string{
 const source={catalog:null,historyCatalog:null,pulse:receizKaiNow().pulse,quoteStatus:'stale' as const,sportsStatus:'loading' as const,status:'loading' as const,error:null,refresh:async()=>{}};
 return renderToString(<div className="console public-explorer is-profile"><a className="explorer-skip" href="#explorer-main">Skip to explorer</a><header className="app-header"><a className="bank-home-mark" href="/" aria-label="Bankeiz home"><BankMark/></a><div className="header-tools"><a className="avatar explorer-account" href="/" aria-label="Open your account">ID</a></div></header><main className="main-panel" id="explorer-main"><div><PublicProfilePage username={profile.username} initialProfile={profile} source={source} active={false}/></div><ProfileFooter/></main></div>,{identifierPrefix:'public-explore-'});
}
