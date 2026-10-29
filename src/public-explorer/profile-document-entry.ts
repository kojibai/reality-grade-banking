/** The complete carried profile precedes navigation's opening element. Its
 * presence means the parser has closed the profile JSON; its trailing payload
 * need not finish before the existing profile can become interactive. */
export function startProfileDocumentRuntime(start:()=>void,doc:Document=document):()=>void{
 let started=false,observer:MutationObserver|undefined;
 const stop=()=>{observer?.disconnect();doc.removeEventListener('DOMContentLoaded',finish);};
 const finish=()=>{if(started)return;started=true;stop();start();};
 const ready=()=>{
  const seed=doc.getElementById('public-profile-seed')??doc.getElementById('public-profile-error');
  return !!doc.getElementById('public-explore-root')&&seed?.nextElementSibling?.id==='receiz-navigation';
 };
 if(doc.readyState!=='loading'||ready())finish();
 else{observer=new MutationObserver(()=>{if(ready())finish();});observer.observe(doc,{subtree:true,childList:true});doc.addEventListener('DOMContentLoaded',finish,{once:true});}
 return stop;
}
