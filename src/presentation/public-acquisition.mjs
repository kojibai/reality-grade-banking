// Deliberately bounded public acquisition measurement. No account state, form
// values, user routes, identifiers, storage or payment results enter this module.
const ORIGIN='https://bankeiz.com';
export const publicAcquisitionPaths=Object.freeze(['/learn/','/learn/guides/','/learn/offline-banking/','/learn/banking-outage/','/learn/notes/','/learn/security/','/learn/payments/','/banking/','/accept/','/accept-payments/','/protect/','/privacy/']);
const paths=new Set(publicAcquisitionPaths);
export function publicAcquisitionPath(value){try{const url=new URL(value,ORIGIN);return url.origin===ORIGIN&&!url.username&&!url.password&&paths.has(url.pathname)?url.pathname:null;}catch{return null;}}
const protectedReferrer=win=>{const policies=[...win.document.head.querySelectorAll('meta[name="referrer"]')];return policies.length>0&&policies.every(node=>node.content==='no-referrer');};
const permitted=win=>win.location.origin===ORIGIN&&win.navigator.onLine!==false&&win.navigator.doNotTrack!=='1'&&win.doNotTrack!=='1'&&!win.navigator.globalPrivacyControl;
function publicReferrer(value){if(!value)return true;try{const url=new URL(value);if(url.search||url.hash||url.username||url.password)return false;return url.origin===ORIGIN?!!publicAcquisitionPath(url.href):url.protocol==='https:'&&url.pathname==='/';}catch{return false;}}
export function initPublicAcquisition(win=globalThis.window){
 if(!win||!protectedReferrer(win)||!permitted(win)||!publicAcquisitionPath(win.location.href)||!publicReferrer(win.document.referrer)||win.document.querySelector('script[data-bank-public-analytics]'))return;
 let active=true,lastPath='';
 const current=()=>active&&protectedReferrer(win)&&permitted(win)?publicAcquisitionPath(win.location.href):null;
 win.va=win.va||function(){(win.vaq=win.vaq||[]).push(Array.from(arguments));};
 win.va('beforeSend',event=>{
  const path=current();if(!path)return null;
  if(event.type==='pageview')return {type:'pageview',url:ORIGIN+path};
  if(event.type!=='event'||event.payload?.data?.guide!==path)return null;
  const {name,data}=event.payload;
  if(name==='Public account intent')return {type:'event',url:ORIGIN+path,payload:{name,data:{guide:path}}};
  if(name==='Public guide link'&&paths.has(data.destination))return {type:'event',url:ORIGIN+path,payload:{name,data:{guide:path,destination:data.destination}}};
  return null;
 });
 const view=()=>{const path=current();if(path&&path!==lastPath){lastPath=path;win.va('pageview',{route:path,path});}};
 const script=win.document.createElement('script');script.src='/_vercel/insights/script.js';script.defer=true;script.referrerPolicy='no-referrer';script.dataset.disableAutoTrack='1';script.dataset.bankPublicAnalytics='';
 script.onerror=()=>{active=false;if(Array.isArray(win.vaq))win.vaq.length=0;};
 // The official Vercel queue and disableAutoTrack contract keeps all pageviews
 // manual and all URLs filtered again immediately before transmission.
 win.document.head.appendChild(script);view();
 win.addEventListener('receiz-learn:page',view);win.addEventListener('popstate',view);
 win.document.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const guide=current(),anchor=event.target?.closest?.('a[href]');if(!guide||!anchor)return;let url;try{url=new URL(anchor.getAttribute('href'),win.location.href);}catch{return;}if(url.origin!==ORIGIN)return;
  if(url.pathname==='/'&&!url.search&&['','#account'].includes(url.hash))win.va('event',{name:'Public account intent',data:{guide}});
  else{const destination=publicAcquisitionPath(url.href);if(destination&&destination!==guide)win.va('event',{name:'Public guide link',data:{guide,destination}});}
 },{capture:true});
}
