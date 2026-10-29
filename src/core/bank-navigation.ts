import {afterPublicNavigationReady} from './public-document-entry';
/** Ask the existing public navigator to reveal the retained Bank surface. */
export function requestBankNavigation(hash:string):boolean{
  const detail={hash,handled:false};
  afterPublicNavigationReady(()=>dispatchEvent(new CustomEvent('bankeiz:navigate-bank',{detail})));
  return detail.handled;
}
