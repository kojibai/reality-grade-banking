import {renderToString} from 'react-dom/server';
import {receizKaiNow} from '@receiz/sdk';
import {PublicExplorer} from '../src/public-explorer/PublicExplorer';
import {PublicDocumentCapabilitiesContext,PublicDocumentFormatContext,PublicDocumentPulseContext} from '../src/core/public-document-format';
import {profilePagePath,retainPublicProfile,type PublicProfile} from '../src/receiz/public-profile';

/** Use the same public view and freeze its first display coordinate. A profile
 * genuinely absent from the saved family needs no replica or opening screen. */
export function renderPublicProfile(profile:PublicProfile):string{
 const {locale,timeZone}=new Intl.DateTimeFormat().resolvedOptions(),frame={locale,timeZone,pulse:receizKaiNow().pulse};
 retainPublicProfile(profile);
 const source={catalog:null,historyCatalog:null,pulse:frame.pulse,quoteStatus:'stale' as const,sportsStatus:'missing' as const,status:'stale' as const,error:null,refresh:async()=>{}};
 const content=renderToString(<PublicDocumentCapabilitiesContext.Provider value={{intersectionObserver:false}}><PublicDocumentFormatContext.Provider value={frame}><PublicDocumentPulseContext.Provider value={frame.pulse}><PublicExplorer active={false} initialPath={profilePagePath(profile.username)} initialSource={source} initialAsOfPulse={frame.pulse}/></PublicDocumentPulseContext.Provider></PublicDocumentFormatContext.Provider></PublicDocumentCapabilitiesContext.Provider>,{identifierPrefix:'public-explore-'});
 return `<!-- bank.profile.frame ${Buffer.from(JSON.stringify(frame)).toString('base64url')} -->`+content;
}
