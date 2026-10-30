// Static navigation is read only after a new Discover intent. This presentation
// descriptor never reads identity, changes proof state, or owns native playback.
async function load(){
 const response=await fetch('/discover/navigation.json',{credentials:'omit',redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!response.ok||Number(response.headers.get('content-length'))>600000)throw Error('DISCOVERY_DOCUMENT_UNAVAILABLE');
 const text=await response.text();if(text.length>600000)throw Error('DISCOVERY_DOCUMENT_TOO_LARGE');const page=JSON.parse(text);
 if(page?.runtime!=='discover'||typeof page.title!=='string'||typeof page.head!=='string'||typeof page.content!=='string'||!/^\/(?:assets\/discover-[\w-]+\.js|src\/public-discover\/main\.tsx)$/.test(page.entry)||!page.content.includes('public-discovery-seed'))throw Error('DISCOVERY_DOCUMENT_INVALID');
 return page;
}
let installed=false;
export function init(pages=document.getElementById('receiz-navigation')?.pages,navigate=document.getElementById('receiz-navigation')?.navigate){
 if(installed||!pages||typeof navigate!=='function'||pages['/discover/'])return;installed=true;
 let held=null,attempt=0;
 const destination=event=>{
  const link=event.target.closest?.('a[href]');if(!link||link.download||link.target&&link.target!=='_self')return;
  const url=new URL(link.href,location.href);return url.origin===location.origin&&!url.search&&/^\/discover\/?$/.test(url.pathname)&&!pages['/discover/']?url:null;
 };
 const prepare=url=>{
  const from=location.href,selected=url?++attempt:attempt;
  const ready=pages['/discover/']?Promise.resolve(pages['/discover/']):held ||= load().then(page=>pages['/discover/']=page).finally(()=>{held=null;});
  return ready.then(()=>{if(url&&selected===attempt&&location.href===from)navigate('/discover/'+url.hash);}).catch(()=>{if(url&&selected===attempt&&location.href===from)location.assign(url.href);});
 };
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const url=destination(event);if(url){event.preventDefault();void prepare(url);}
 });
 const warm=event=>{if(destination(event))void prepare();};
 document.addEventListener('pointerover',warm,{passive:true});document.addEventListener('focusin',warm);
}
