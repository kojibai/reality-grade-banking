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
