import {createContext} from 'react';
/** Freeze the server's public presentation through hydration. Default readers
 * continue using the user's locale and timezone after that first commit. */
export type PublicDocumentFormat={locale:string;timeZone:string};
export const PublicDocumentFormatContext=createContext<PublicDocumentFormat|undefined>(undefined);
export const PublicDocumentCapabilitiesContext=createContext<{intersectionObserver:boolean}|undefined>(undefined);
