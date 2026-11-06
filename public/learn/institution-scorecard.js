// Filters the directory already carried by this document. No remote lookup,
// proof admission, account access or financial action occurs here.
const mounted=new WeakSet();
const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();

export function init(root=document){
 const directories=root.matches?.('[data-institution-directory]')?[root]:root.querySelectorAll('[data-institution-directory]');
 for(const directory of directories){
  if(mounted.has(directory))continue;
  const controls=directory.querySelector('[data-directory-controls]');
  const query=directory.querySelector('[data-directory-query]');
  const region=directory.querySelector('[data-directory-region-filter]');
  const status=directory.querySelector('[data-directory-status-filter]');
  const country=directory.querySelector('[data-directory-country-filter]');
  const sort=directory.querySelector('[data-directory-sort]');
  const list=directory.querySelector('[data-directory-record-list]');
  const clear=directory.querySelector('[data-directory-clear]');
  const results=directory.querySelector('[data-directory-results]');
  const empty=directory.querySelector('[data-directory-empty]');
  if(!controls||!query||!region||!status||!clear||!results||!empty)continue;
  const records=[...directory.querySelectorAll('[data-directory-record]')].map((element,index)=>({element,index,name:element.dataset.directoryName??'',country:element.dataset.directoryCountry,text:normalize(element.dataset.directorySearch),region:element.dataset.directoryRegion,status:element.dataset.qualification?.toLowerCase()}));
  const collator=new Intl.Collator(undefined,{sensitivity:'base',numeric:true});
  const update=()=>{
   const terms=normalize(query.value).split(' ').filter(Boolean);
   let count=0;
   for(const record of records){
    const match=terms.every(term=>record.text.includes(term))&&(region.value==='all'||region.value===record.region)&&(status.value==='all'||status.value===record.status)&&(!country||country.value==='all'||country.value===record.country);
    record.element.hidden=!match;
    if(match)count++;
   }
   if(sort&&list){
    const order=[...records];
    if(sort.value==='name-asc')order.sort((a,b)=>collator.compare(a.name,b.name)||a.index-b.index);
    if(sort.value==='name-desc')order.sort((a,b)=>collator.compare(b.name,a.name)||a.index-b.index);
    if(sort.value==='pass-first')order.sort((a,b)=>Number(b.status==='pass')-Number(a.status==='pass')||collator.compare(a.name,b.name)||a.index-b.index);
    order.forEach((record,index)=>{if(list.children[index]!==record.element)list.insertBefore(record.element,list.children[index]??null);});
   }
   results.textContent=`Showing ${count} of ${records.length} institutions`;
   empty.hidden=count!==0;
   clear.disabled=!query.value&&region.value==='all'&&status.value==='all'&&(!country||country.value==='all')&&(!sort||sort.value==='default');
  };
  controls.addEventListener('submit',event=>event.preventDefault());
  query.addEventListener('input',update);
  query.addEventListener('search',update);
  region.addEventListener('change',update);
  status.addEventListener('change',update);
  country?.addEventListener('change',update);
  sort?.addEventListener('change',update);
  clear.addEventListener('click',event=>{event.preventDefault();query.value='';region.value='all';status.value='all';if(country)country.value='all';if(sort)sort.value='default';update();query.focus({preventScroll:true});});
  mounted.add(directory);
  controls.hidden=false;
  query.disabled=false;region.disabled=false;status.disabled=false;
  if(country)country.disabled=false;if(sort)sort.disabled=false;
  update();
 }
}
