import {useSyncExternalStore} from 'react';
import {siteFooter} from '../../branding/site-footer.mjs';
import '../styles/site-footer.css';
const subscribe=(update:()=>void)=>{window.addEventListener('receiz-bank:surface',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('receiz-bank:surface',update);window.removeEventListener('popstate',update);};};
const currentPath=()=>window.location.pathname;
export function SiteFooter(){return siteFooter(useSyncExternalStore(subscribe,currentPath,()=>''));}
