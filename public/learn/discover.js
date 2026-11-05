// Read only the existing saved public document on Feed/Discover intent. This
// descriptor preserves the mounted Bank and playback; it grants no authority.
const MAX=32*1024*1024,HEX=/^[a-f0-9]{64}$/;
const fields=['x-receiz-public-material-revision','x-receiz-public-render-build','x-receiz-public-html-sha256'];
function coordinate(response){const values=fields.map(key=>response.headers.get(key));if(!response.ok||!values.every(value=>HEX.test(value??''))||!['current','retained'].includes(response.headers.get('x-receiz-public-html-state')))throw Error('DISCOVERY_DOCUMENT_UNAVAILABLE');return values;}
async function load(path,previous){
 const request={credentials:'omit',redirect:'error',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{accept:'text/html'}};
 if(previous?.preparedRevision){
  const response=await fetch(path,{...request,method:'HEAD'}),values=coordinate(response);await response.body?.cancel();
  if(values[0]===previous.preparedRevision&&values[1]===previous.preparedBuild&&(!previous.preparedHtmlSha256||values[2]===previous.preparedHtmlSha256))return previous;
 }
 const response=await fetch(path,request),values=coordinate(response);
 if(!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX)throw Error('DISCOVERY_DOCUMENT_UNAVAILABLE');
 const reader=response.body?.getReader();if(!reader)throw Error('DISCOVERY_DOCUMENT_UNAVAILABLE');const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;
 try{for(;;){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>MAX)throw Error('DISCOVERY_DOCUMENT_TOO_LARGE');text+=decoder.decode(next.value,{stream:true});}text+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
 const doc=new DOMParser().parseFromString(text,'text/html'),runtime=path==='/feed/'?'feed':'discover',root=doc.querySelector(`[data-public-runtime="${runtime}"]`),seed=root?.querySelector('#public-market-seed');
 if(!root||!seed?.textContent?.startsWith(`{"schema":"bank.public-market.document.v1","generation":"${values[0]}","path":"${runtime}",`))throw Error('DISCOVERY_DOCUMENT_INVALID');
 const entry=[...doc.head.querySelectorAll('script[type="module"][src]')].map(node=>node.getAttribute('src')).find(value=>new RegExp(`^/(?:assets/${runtime}-[\\w-]+\\.js|src/public-${runtime}/main\\.tsx)$`).test(value??''));
 if(!entry||!doc.title||doc.title.length>500)throw Error('DISCOVERY_DOCUMENT_INVALID');
 return {runtime,title:doc.title,head:doc.head.innerHTML.replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/gi,''),content:root.innerHTML,entry,preparedRevision:values[0],preparedBuild:values[1],preparedHtmlSha256:values[2],preparedRoot:root};
}
let opener=null;
export function init(pages=document.getElementById('receiz-navigation')?.pages,navigate=document.getElementById('receiz-navigation')?.navigate){
 if(opener)return opener;if(!pages||typeof navigate!=='function')return null;
 const pending=new Map();let attempt=0;
 const destination=event=>{
  const link=event.target.closest?.('a[href]');if(!link||link.download||link.target&&link.target!=='_self')return;
  const url=new URL(link.href,location.href);return url.origin===location.origin&&!url.search&&/^\/(?:feed|discover)\/?$/.test(url.pathname)?url:null;
 };
 const prepare=(url,path=url?.pathname)=>{
  path=path?.replace(/\/?$/,'/');if(path!=='/feed/'&&path!=='/discover/')return Promise.resolve();
  const from=location.href,selected=url?++attempt:attempt;
  let ready=pending.get(path);if(!ready){ready=load(path,pages[path]).then(page=>pages[path]=page).finally(()=>pending.delete(path));pending.set(path,ready);}
  return ready.then(page=>{if(url&&selected===attempt&&location.href===from){if(page.preparedRoot){dispatchEvent(new CustomEvent('bankeiz:prepared-discovery',{detail:{root:page.preparedRoot,path:page.runtime}}));delete page.preparedRoot;}navigate(path+url.hash);}}).catch(()=>{if(url&&selected===attempt&&location.href===from)location.assign(url.href);});
 };
 opener=url=>prepare(url);const element=document.getElementById('receiz-navigation');if(element)element.openPreparedDiscovery=opener;
 document.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=destination(event);if(url&&(!pages[url.pathname.replace(/\/?$/,'/')]||pages[url.pathname.replace(/\/?$/,'/')].preparedRevision)){event.preventDefault();void prepare(url);}});
 const warm=event=>{const url=destination(event);if(url&&(!pages[url.pathname.replace(/\/?$/,'/')]||pages[url.pathname.replace(/\/?$/,'/')].preparedRevision))void prepare(undefined,url.pathname);};
 document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);return opener;
}
