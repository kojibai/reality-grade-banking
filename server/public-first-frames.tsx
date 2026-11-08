import {renderToString} from 'react-dom/server';
import {PublicDocumentCapabilitiesContext,PublicDocumentFormatContext,PublicDocumentPulseContext,type PublicFirstFrame} from '../src/core/public-document-format';
import {PublicExplorer} from '../src/public-explorer/PublicExplorer';
import type {PublicMarketItem} from '../src/receiz/public-market';
import {assetPagePath} from '../src/receiz/public-asset-page';
import {VerifyApp} from '../src/verification/VerifyApp';
import {PublicBookingPage} from '../src/features/booking/PublicBookingPage';
import {createPublicBooking} from '../src/receiz/public-booking';
import {createPublicBookingRequest} from '../src/receiz/public-booking-request';

/** Build-only presentation of already-held public inputs. These renders run
 * no effects, Source readers, identity operations or financial commands. */
export function renderAssetFirstFrame(item:PublicMarketItem|null,frame:PublicFirstFrame){
 const source={catalog:null,historyCatalog:null,pulse:frame.pulse,quoteStatus:'stale' as const,sportsStatus:'missing' as const,status:'stale' as const,error:null,refresh:async()=>{}};
 return renderToString(<PublicDocumentCapabilitiesContext.Provider value={{intersectionObserver:false}}><PublicDocumentFormatContext.Provider value={frame}><PublicDocumentPulseContext.Provider value={frame.pulse}><PublicExplorer active={false} initialPath={assetPagePath(item?.id??'source')} initialSource={source} initialAsset={item??undefined} initialAsOfPulse={frame.pulse}/></PublicDocumentPulseContext.Provider></PublicDocumentFormatContext.Provider></PublicDocumentCapabilitiesContext.Provider>,{identifierPrefix:'public-explore-'});
}
export function renderVerificationFirstFrame(){return renderToString(<VerifyApp initialDigest={null}/>,{identifierPrefix:'public-verify-'});}
export function renderBookingFirstFrame(username:string){
 // The actual URL supplies the browser's service. With no availability held,
 // the shared component paints only its real, generic booking interface.
 const service=createPublicBooking({username,request:createPublicBookingRequest()});
 return renderToString(<PublicBookingPage service={service}/>,{identifierPrefix:'public-booking-'});
}
