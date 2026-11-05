// Read the existing saved public document on navigation intent. Reuse the
// mounted router and public roots; this never reconstructs financial history.
const MAX=32*1024*1024,HEX=/^[a-f0-9]{64}$/,prepared=new Set(['explore','ledger','feed','discover']);
const fields=['x-receiz-public-material-revision','x-receiz-public-render-build','x-receiz-public-html-sha256'];
function coordinate(response,build){
 const values=fields.map(key=>response.headers.get(key)),state=response.headers.get('x-receiz-public-html-state'),at=response.headers.get('x-receiz-public-state-coordinate'),pending=response.headers.get('x-receiz-public-pending-state-coordinate');
 if(!response.ok||![...values,at].every(value=>HEX.test(value??''))||build&&values[1]!==build||state!=='current'&&state!=='retained'||state==='current'&&pending!==null||state==='retained'&&(!HEX.test(pending??'')||pending===at))throw Error('DISCOVERY_DOCUMENT_UNAVAILABLE');return values;
}
function aborted(promise,signal){signal.throwIfAborted();return new Promise((resolve,reject)=>{const stop=()=>reject(signal.reason);signal.addEventListener('abort',stop,{once:true});promise.then(value=>{signal.removeEventListener('abort',stop);resolve(value);},error=>{signal.removeEventListener('abort',stop);reject(error);});});}
const sha=async text=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
async function load(path,previous,build){
 const bankIdentity=document.getElementById('receiz-navigation')?.publicMarketIdentity?.()??null;
 const runtime=previous?.runtime??path.slice(1,-1),qualified=prepared.has(runtime),signal=AbortSignal.timeout(15000),request={credentials:'omit',redirect:'error',cache:'no-store',signal,headers:{accept:'text/html'}};
 if(previous?.preparedRevision&&previous.content){
  const response=await aborted(fetch(path,{...request,method:'HEAD'}),signal),values=coordinate(response,build);void response.body?.cancel().catch(()=>{});
  if(values[0]===previous.preparedRevision&&values[1]===previous.preparedBuild&&(!previous.preparedHtmlSha256||values[2]===previous.preparedHtmlSha256)){const state=response.headers.get('x-receiz-public-html-state');return previous.preparedState===state&&previous.preparedBankIdentity===bankIdentity?previous:{...previous,preparedState:state,preparedBankIdentity:bankIdentity};}
 }
 const response=await aborted(fetch(path,request),signal),values=qualified?coordinate(response,build):null;
 if(!response.ok||!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')??'')||Number(response.headers.get('content-length'))>MAX)throw Error('DISCOVERY_DOCUMENT_UNAVAILABLE');
 const reader=response.body?.getReader();if(!reader)throw Error('DISCOVERY_DOCUMENT_UNAVAILABLE');const decoder=new TextDecoder('utf-8',{fatal:true});let text='',size=0;
 const cancel=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',cancel,{once:true});
 try{for(;;){signal.throwIfAborted();const next=await aborted(reader.read(),signal);signal.throwIfAborted();if(next.done)break;size+=next.value.length;if(size>MAX)throw Error('DISCOVERY_DOCUMENT_TOO_LARGE');text+=decoder.decode(next.value,{stream:true});}text+=decoder.decode();}finally{signal.removeEventListener('abort',cancel);void reader.cancel().catch(()=>{});reader.releaseLock();}
 if(values&&await sha(text)!==values[2])throw Error('DISCOVERY_DOCUMENT_INVALID');
 const doc=new DOMParser().parseFromString(text,'text/html'),root=previous?.runtime||qualified?doc.querySelector(`[data-public-runtime="${runtime}"]`):doc.getElementById('public-learn-root');
 if(!root||!doc.title||doc.title.length>500)throw Error('DISCOVERY_DOCUMENT_INVALID');
 let shared='',head=previous?.head;
 if(!previous?.runtime&&!qualified){
  const start=text.indexOf('<div id="public-learn-root">'),end=text.indexOf('<script id="receiz-navigation"'),close=text.lastIndexOf('</div>',end);
  if(!HEX.test(previous?.contentSha256??'')||start<0||end<0||close<start||await sha(text.slice(start+28,close))!==previous.contentSha256)throw Error('DISCOVERY_DOCUMENT_INVALID');
  if(previous.headSha256){const raw=text.match(/<head>([\s\S]*?)<\/head>/)?.[1];if(!HEX.test(previous.headSha256)||!Number.isSafeInteger(previous.headLength)||previous.headLength<1||previous.headLength>MAX||!raw||raw.length<previous.headLength)throw Error('DISCOVERY_DOCUMENT_INVALID');head=raw.slice(0,previous.headLength);if(await sha(head)!==previous.headSha256)throw Error('DISCOVERY_DOCUMENT_INVALID');}
  if(previous.sharedExampleSha256){shared=text.match(/<template data-shared-example-views>[^<]*<\/template>/)?.[0]??'';if(await sha(shared)!==previous.sharedExampleSha256)throw Error('DISCOVERY_DOCUMENT_INVALID');}
 }

 if(values){
  const seed=doc.getElementById(runtime==='ledger'?'public-ledger-document-seed':'public-market-seed');let value;try{value=JSON.parse(seed?.textContent??'null');}catch{}
  if(!value||value.schema!==(runtime==='ledger'?'bank.public-ledger.document.v1':'bank.public-market.document.v1')||value.generation!==values[0]||value.path!==path.slice(1,-1))throw Error('DISCOVERY_DOCUMENT_INVALID');
  if(!root.contains(seed))root.append(seed);
 }
 const entry=previous?.runtime||qualified?[...doc.head.querySelectorAll('script[type="module"][src]')].map(node=>node.getAttribute('src')).find(value=>previous?.entry?value===previous.entry:new RegExp(`^/(?:assets/${runtime}-[\\w-]+\\.js|src/public-${runtime}/main\\.tsx)$`).test(value??'')):undefined;
 if((previous?.runtime||qualified)&&!entry)throw Error('DISCOVERY_DOCUMENT_INVALID');
 return {...(previous?.runtime||qualified?{runtime,entry}:{}),title:doc.title,head:previous?.runtime||qualified?doc.head.innerHTML.replace(/<script\b[^>]*type="module"[^>]*>[\s\S]*?<\/script>/gi,''):head,content:root.innerHTML+shared,...(values?{preparedRevision:values[0],preparedBuild:values[1],preparedHtmlSha256:values[2],preparedState:response.headers.get('x-receiz-public-html-state'),preparedBankIdentity:bankIdentity}:{}),preparedRoot:root};
}
let opener=null;
export function init(pages=document.getElementById('receiz-navigation')?.pages,navigate=document.getElementById('receiz-navigation')?.navigate){
 if(opener)return opener;if(!pages||typeof navigate!=='function')return null;
 const pending=new Map();let attempt=0;
 const descriptor=path=>/^\/verify\/[a-f0-9]{64}\/$/.test(path)?'/verify/':path;
 const known=path=>Object.hasOwn(pages,descriptor(path))||path==='/feed/'||path==='/discover/';
 const needs=path=>{const page=pages[descriptor(path)];return known(path)&&!(page?.content||page?.runtime&&document.querySelector(`[data-public-runtime="${page.runtime}"]`));};
 const destination=event=>{
  const link=event.target.closest?.('a[href]');if(!link||link.download||link.target&&link.target!=='_self')return;
  const url=new URL(link.href,location.href);return url.origin===location.origin&&!url.search&&known(url.pathname.replace(/\/?$/,'/'))?url:null;
 };
 const prepare=(url,path=url?.pathname)=>{
  path=path?.replace(/\/?$/,'/');if(!known(path))return Promise.resolve();
  const target=path;path=descriptor(path);
  const from=location.href,selected=url?++attempt:attempt,build=pages[path]?.preparedBuild??Object.values(pages).find(page=>page.preparedBuild)?.preparedBuild;
  let ready=pending.get(path);if(!ready){ready=load(path,pages[path],build).then(page=>pages[path]=page).finally(()=>pending.delete(path));pending.set(path,ready);}
  return ready.then(page=>{if(url&&selected===attempt&&location.href===from){document.getElementById('public-navigation-status')?.remove();if(page.preparedRoot){dispatchEvent(new CustomEvent('bankeiz:prepared-discovery',{detail:{root:page.preparedRoot,path:page.runtime}}));delete page.preparedRoot;}navigate(target+url.hash);}}).catch(()=>{if(url&&selected===attempt&&location.href===from){
   document.getElementById('public-navigation-status')?.remove();const status=document.createElement('p'),retry=document.createElement('button');status.id='public-navigation-status';status.setAttribute('role','status');status.textContent='This page could not open. ';retry.textContent='Try again';retry.onclick=()=>{status.remove();void prepare(url);};status.append(retry);(document.querySelector('main:not([hidden])')??document.body).append(status);
  }});
 };
 opener=url=>prepare(url);const element=document.getElementById('receiz-navigation');if(element)element.openPreparedDiscovery=opener;
 document.addEventListener('click',event=>{if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;const url=destination(event);if(url&&needs(url.pathname.replace(/\/?$/,'/'))){event.preventDefault();void prepare(url);}});
 const warm=event=>{const url=destination(event);if(url&&needs(url.pathname.replace(/\/?$/,'/')))void prepare(undefined,url.pathname);};
 document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);return opener;
}
