(()=>{
 const input=document.querySelector('[data-doc-search]');
 const source=document.querySelector('#docs-search-index');
 if(!input||!source)return;
 const index=JSON.parse(source.textContent),rows=[...document.querySelectorAll('[data-doc-row]')],status=document.querySelector('[data-doc-search-status]');
 input.addEventListener('input',()=>{
  const query=input.value.trim().toLowerCase(),words=query.split(/\s+/).filter(Boolean),found=new Set();
  for(const row of rows){const match=words.every(word=>(index[row.dataset.docId]??'').includes(word));row.hidden=!match;if(match)found.add(row.dataset.docId);}
  for(const group of document.querySelectorAll('.docs-nav-group,[data-doc-group]'))group.hidden=![...group.querySelectorAll('[data-doc-row]')].some(row=>!row.hidden);
  for(const empty of document.querySelectorAll('[data-doc-empty]'))empty.hidden=found.size>0;
  const paths=document.querySelector('.docs-reading-paths');if(paths)paths.hidden=words.length>0;
  const mobile=document.querySelector('[data-doc-mobile-nav]');if(query&&mobile)mobile.open=true;
  status.textContent=query?found.size+' matching '+(found.size===1?'topic':'topics'):'';
 });
})();

(()=>{
 const button=document.querySelector('[data-doc-theme-toggle]');
 if(!button)return;
 const root=document.documentElement, preference=matchMedia('(prefers-color-scheme: dark)');
 const key='bankeiz.docs.theme';
 try{
  const saved=localStorage.getItem(key);
  if(saved==='light'||saved==='dark')root.dataset.docTheme=saved;
 }catch{/* The current page can still switch themes. */}
 function update(){
  const theme=root.dataset.docTheme??(preference.matches?'dark':'light');
  const target=theme==='dark'?'light':'dark';
  button.dataset.target=target;
  const label='Switch to '+target+' mode';
  button.setAttribute('aria-label',label);
  button.title=label;
  for(const meta of document.querySelectorAll('meta[name="theme-color"]'))
   meta.content=theme==='dark'?'#101722':'#fbfcfe';
 }
 button.addEventListener('click',()=>{
  const next=button.dataset.target;
  root.dataset.docTheme=next;
  try{localStorage.setItem(key,next);}catch{/* Keep the page choice when storage is unavailable. */}
  update();
 });
 preference.addEventListener('change',update);
 update();
 button.hidden=false;
})();
