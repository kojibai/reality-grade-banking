import type {PublicRuntime} from './public-runtime';
/** A following sibling navigation element proves that the parser closed the
 * existing runtime root. Its unrelated payload need not finish first. */
export function startPublicDocumentRuntime(name:PublicRuntime,start:()=>void,doc:Document=document,sourceReady:()=>boolean=()=>true):()=>void{
 let started=false,observer:MutationObserver|undefined;
 const stop=()=>{observer?.disconnect();doc.removeEventListener('DOMContentLoaded',finish);};
 const finish=()=>{if(started)return;started=true;stop();start();};
 const ready=()=>{
  const root=doc.getElementById(`public-${name}-root`)??doc.getElementById('root'),navigation=doc.getElementById('receiz-navigation');
  return !!root&&!!navigation&&root.parentNode===navigation.parentNode&&!!(root.compareDocumentPosition(navigation)&4)&&sourceReady();
 };
 if(doc.readyState!=='loading'||ready())finish();
 else{observer=new MutationObserver(()=>{if(ready())finish();});observer.observe(doc,{subtree:true,childList:true});doc.addEventListener('DOMContentLoaded',finish,{once:true});}
 return stop;
}
/** The existing router consumes this payload before installing its listeners.
 * Keep source events until that listener exists, without repeating any read. */
export function afterPublicNavigationReady(publish:()=>void,doc:Document|undefined=typeof document==='undefined'?undefined:document){
 if(doc&&(doc.readyState==='loading'||doc.readyState==='interactive'&&!!doc.getElementById('receiz-navigation')?.textContent))doc.addEventListener('DOMContentLoaded',publish,{once:true});else publish();
}
