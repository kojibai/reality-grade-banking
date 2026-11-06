// Search reuses the rows carried by this document. Public accepted records load
// in the background; only the server admits new proofs and publishes changes.
const mounted=new WeakSet();
const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/\s+/g,' ').trim();
const hash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const originalPath=(id,digest)=>`/api/bank/registry/original/${id}/${digest}`;
const maxProofBytes=4*1024*1024;
const pngHeader=[137,80,78,71,13,10,26,10];
const displayCacheName='bankeiz-registry-display-v1',displayCacheKey='/api/bank/registry';
const publicationFields=['schema','institutionId','name','scope','cases','artifactSha256','evidenceSha256','holderReceizId','implementationBuildSha256','officialProofUrl','acceptedAt','url'];
const publicationSnapshot=value=>Object.fromEntries(publicationFields.map(key=>[key,value[key]]));
const entrySnapshot=entry=>({institutionId:entry.institutionId,revision:entry.revision,current:publicationSnapshot(entry.current),history:entry.history.map(publicationSnapshot)});
function validPublication(value,record){
 if(!value||value.schema!=='bank.registry.publication.v1'||value.institutionId!==record.id||value.name!==record.name||value.scope!=='Public integration contract'||!Number.isSafeInteger(value.cases)||value.cases<1||value.cases>10000||!hash(value.artifactSha256)||!hash(value.evidenceSha256)||!hash(value.implementationBuildSha256)||typeof value.holderReceizId!=='string'||!/^[A-Za-z0-9][A-Za-z0-9._:@-]{0,159}$/.test(value.holderReceizId)||typeof value.acceptedAt!=='string'||value.acceptedAt.length>40||!Number.isFinite(Date.parse(value.acceptedAt))||value.url!==originalPath(record.id,value.artifactSha256))return false;
 const expected=record.element.querySelector('[data-registry-proof-form]')?.dataset.registryOfficialProof;
 return value.officialProofUrl===expected||(record.id==='bankeiz'&&value.officialProofUrl==='https://bankeiz.com'+value.url);
}
function validEntry(entry,record){
 return !!entry&&entry.institutionId===record.id&&Number.isSafeInteger(entry.revision)&&entry.revision>=1&&Array.isArray(entry.history)&&entry.history.length===entry.revision-1&&validPublication(entry.current,record)&&entry.history.every(value=>validPublication(value,record))&&new Set([entry.current,...entry.history].map(value=>value.artifactSha256)).size===entry.history.length+1;
}
function node(document,tag,text,className){const element=document.createElement(tag);if(text!==undefined)element.textContent=text;if(className)element.className=className;return element;}
function renderPublication(record,entry){
 const element=record.element,document=element.ownerDocument,value=entry.current;
 const target=element.querySelector('[data-published-conformance]');
 if(!target)return;
 const heading=node(document,'h4','Verified conformance Original');
 const note=node(document,'p','This PASS covers the Public integration contract at the exact assessed build below. It does not establish production receiving qualification.');
 const scope=node(document,'dl',undefined,'isc-scope');
 for(const [label,text,code] of [['Assessed scope',value.scope],['Cases passed',`${value.cases} / ${value.cases}`],['Implementation build SHA-256',value.implementationBuildSha256,true],['Evidence SHA-256',value.evidenceSha256,true],['Original artifact SHA-256',value.artifactSha256,true],['Credential holder · Receiz ID',value.holderReceizId,true],['Published in the Registry',value.acceptedAt]]){
  const row=node(document,'div'),term=node(document,'dt',label),description=node(document,'dd');
  description.append(code?node(document,'code',text):document.createTextNode(text));row.append(term,description);scope.append(row);
 }
 const actions=node(document,'div',undefined,'isc-recorded-actions');
 const original=node(document,'a','Open the original conformance certificate ↗');original.setAttribute('href',value.url);
 const endorsement=node(document,'a',record.id==='bankeiz'?'Inspect the published Original ↗':'Inspect the institution’s publication ↗');endorsement.setAttribute('href',value.officialProofUrl);
 actions.append(original,endorsement);
 const content=[heading,note,scope,actions];
 if(entry.history.length){
  const history=node(document,'div',undefined,'isc-proof-history'),list=node(document,'ol');
  history.append(node(document,'h4','Previous accepted Originals'));
  for(const previous of entry.history){const item=node(document,'li'),link=node(document,'a',`${previous.acceptedAt} · ${previous.scope} ↗`);link.setAttribute('href',previous.url);item.append(link);list.append(item);}
  history.append(list);content.push(history);
 }
 target.replaceChildren(...content);target.hidden=false;
 const existing=element.querySelector('[data-existing-conformance]');
 if(existing){
  if(record.id==='bankeiz'&&hash(existing.dataset.recordedArtifactSha256)){
   if(existing.dataset.recordedArtifactSha256!==value.artifactSha256){
    if(!existing.querySelector('[data-prior-static-record]')){
     const previous=node(document,'details',undefined,'isc-prior-record');previous.dataset.priorStaticRecord='';
     previous.append(node(document,'summary','Previously published Bankeiz record'),...existing.childNodes);existing.replaceChildren(previous);
    }
   }else{
    const previous=existing.querySelector('[data-prior-static-record]');if(previous){const original=previous.querySelector('.isc-original-evidence');if(original)existing.replaceChildren(original);}
    target.replaceChildren(node(document,'h4','Registry publication'),node(document,'p',`The accepted Original matches the existing published record. Published in the Registry ${value.acceptedAt}.`),actions,...content.slice(4));
   }
   existing.hidden=false;target.after(existing);
  }else existing.hidden=true;
 }
 const context=element.querySelector('[data-qualification-context]');
 const label=context?.querySelector('strong');if(label)label.textContent='Verified conformance record';
 if(context){
  let visible=context.querySelector('.isc-visible-scope');if(!visible){visible=node(document,'p',undefined,'isc-visible-scope');context.insertBefore(visible,context.lastElementChild);}
  visible.textContent=`${value.scope} · ${value.cases} / ${value.cases} cases passed`;
  const detail=[...context.querySelectorAll('p')].find(value=>!value.classList.contains('isc-required-standard')&&!value.classList.contains('isc-visible-scope'));
  if(detail)detail.textContent='The Original, holder and complete passing test evidence are verified for this exact scope and build.';
 }
 element.dataset.qualification='PASS';element.classList.remove('isc-red');element.classList.add('isc-green');
 const verdict=element.querySelector('[data-qualification-verdict]');if(verdict)verdict.textContent='PASS';
 record.status='pass';record.accepted=entry;
}

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
  const records=[...directory.querySelectorAll('[data-directory-record]')].map((element,index)=>({element,index,id:element.dataset.institutionId,name:element.dataset.directoryName??'',country:element.dataset.directoryCountry,text:normalize(element.dataset.directorySearch),region:element.dataset.directoryRegion,status:element.dataset.qualification?.toLowerCase(),accepted:null}));
  // The server-carried accepted state belongs to the HTML already selected by
  // the reader. Seed it synchronously before any older display cache can arrive.
  for(const record of records){
   try{const text=record.element.querySelector('[data-registry-public-state]')?.textContent;if(!text)continue;const entry=JSON.parse(text);if(validEntry(entry,record)&&record.status==='pass'&&String(entry.revision)===record.element.dataset.registryRevision&&entry.current.artifactSha256===record.element.dataset.registryCurrentSha256)record.accepted=entry;}catch{/* Keep the available server-rendered record intact. */}
  }
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
   const totals=directory.closest('.isc-register')??directory;
   const passed=records.filter(record=>record.status==='pass').length;
   for(const [key,value] of [['listed',records.length],['qualified',passed],['evidence-required',records.length-passed]]){const total=totals.querySelector(`[data-register-count="${key}"]`);if(total)total.textContent=String(value);}
  };
  let cacheState=Promise.resolve(null),cacheWrites=Promise.resolve();
  const saveAcceptedDisplay=()=>{
   // CacheStorage.put replaces this one metadata response atomically. A failed
   // save never deletes the previous durable display copy. It grants no proof
   // admission, account, ownership, payment or receiving authority.
   cacheWrites=cacheWrites.then(async()=>{const cache=await cacheState;if(!cache)return;const selected=records.filter(record=>record.accepted).map(record=>entrySnapshot(record.accepted));if(selected.length)await cache.put(displayCacheKey,new Response(JSON.stringify({schema:'bank.registry.display.v1',records:selected}),{headers:{'Content-Type':'application/json'}}));}).catch(()=>{});
  };
  const apply=(entry,persist=true)=>{
   const record=records.find(record=>record.id===entry?.institutionId);
   if(!record||!validEntry(entry,record))return false;
   const carriedRevision=Number(record.element.dataset.registryRevision),carriedHash=record.element.dataset.registryCurrentSha256;
   if(!record.accepted&&Number.isSafeInteger(carriedRevision)&&carriedRevision>=1&&hash(carriedHash)){
    if(entry.revision<carriedRevision)return true;
    if(entry.revision===carriedRevision&&entry.current.artifactSha256!==carriedHash)return false;
    if(![entry.current,...entry.history].some(value=>value.artifactSha256===carriedHash))return false;
   }
   if(record.accepted&&entry.revision<record.accepted.revision)return true;
   if(record.accepted&&entry.revision===record.accepted.revision&&entry.current.artifactSha256!==record.accepted.current.artifactSha256)return false;
   if(record.accepted&&entry.revision===record.accepted.revision)return true;
   if(record.accepted){const retained=new Set([entry.current,...entry.history].map(value=>value.artifactSha256));if(![record.accepted.current,...record.accepted.history].every(value=>retained.has(value.artifactSha256)))return false;}
   renderPublication(record,entry);update();if(persist)saveAcceptedDisplay();return true;
  };
  controls.addEventListener('submit',event=>event.preventDefault());
  query.addEventListener('input',update);query.addEventListener('search',update);
  region.addEventListener('change',update);status.addEventListener('change',update);
  country?.addEventListener('change',update);sort?.addEventListener('change',update);
  clear.addEventListener('click',event=>{event.preventDefault();query.value='';region.value='all';status.value='all';if(country)country.value='all';if(sort)sort.value='default';update();query.focus({preventScroll:true});});
  mounted.add(directory);controls.hidden=false;
  query.disabled=false;region.disabled=false;status.disabled=false;
  if(country)country.disabled=false;if(sort)sort.disabled=false;
  update();
  cacheState=(async()=>{
   let cache;try{if(!globalThis.caches)return null;cache=await globalThis.caches.open(displayCacheName);}catch{return null;}
   try{const response=await cache.match(displayCacheKey);if(response){const value=await response.json();if(value?.schema==='bank.registry.display.v1'&&Array.isArray(value.records))for(const entry of value.records)apply(entry,false);}}catch{/* Cache availability is never a prerequisite for opening the Registry. */}
   return cache;
  })();
  if(records.some(record=>record.accepted))saveAcceptedDisplay();
  const forms=[];let publishingAvailable=true,mutation=0;
  const readPublicRecords=async()=>{
   const response=await fetch('/api/bank/registry',{headers:{'Accept':'application/json'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(20000)});
   if(!response.ok)throw Error('REGISTRY_UNAVAILABLE');
   const value=await response.json();if(value?.schema!=='bank.registry.public.v1'||typeof value.publishingAvailable!=='boolean'||!Array.isArray(value.records))throw Error('REGISTRY_RESPONSE_INVALID');
   return value;
  };
  for(const record of records){
   const form=record.element.querySelector('[data-registry-proof-form]');
   const input=form?.querySelector('input[type="file"]'),button=form?.querySelector('button[type="submit"]'),message=form?.querySelector('[data-registry-proof-status]');
   if(!form||!input||!button||!message)continue;
   let busy=false;
   const announce=(text,state='')=>{message.textContent=text;message.dataset.state=state;};
   const refresh=()=>{button.disabled=busy||!input.files?.length||!publishingAvailable;input.disabled=busy;form.setAttribute('aria-busy',String(busy));};
   input.addEventListener('change',()=>{if(publishingAvailable)announce(input.files?.length?'Ready to verify. The public record changes only after the proof is accepted.':'');refresh();});
   form.addEventListener('submit',async event=>{
    event.preventDefault();const file=input.files?.[0];if(busy||!file||!publishingAvailable)return;
    busy=true;mutation++;refresh();announce('Verifying the Original and its institution binding…');
    let publicationRequested=false,definitiveRefusal=false,bytes;
    try{
     if(file.size<8||file.size>maxProofBytes)throw Error('Choose a public Original PNG up to 4 MiB.');
     bytes=new Uint8Array(await file.arrayBuffer());
     if(bytes.length!==file.size||!pngHeader.every((value,index)=>bytes[index]===value))throw Error('Choose the original conformance certificate as a PNG file.');
     publicationRequested=true;
     const response=await fetch('/api/bank/registry/'+encodeURIComponent(record.id),{method:'POST',headers:{'Content-Type':'image/png','Accept':'application/json'},body:bytes,credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(60000)});
     const value=await response.json();
     if(!response.ok||value?.ok!==true){definitiveRefusal=response.status>=400&&response.status<500&&response.status!==408;const supplied=value?.message??value?.error;const reason=typeof supplied==='string'&&supplied.length<=500?supplied:'The proof was not accepted.';throw Error(reason);}
     if(!apply(value.entry))throw Error('REGISTRY_PUBLICATION_UNCONFIRMED');
     input.value='';announce('Proof verified and published. The Registry record now shows PASS for the assessed scope.','success');
    }catch(cause){
     if(publicationRequested&&!definitiveRefusal){
      announce('Publication could not be confirmed. Check the public record or retry this same Original.','error');
      try{
       const value=await readPublicRecords();
       for(const entry of value.records)apply(entry);
       const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(value=>value.toString(16).padStart(2,'0')).join('');
       const confirmed=value.records.some(entry=>validEntry(entry,record)&&[entry.current,...entry.history].some(proof=>proof.artifactSha256===digest));
       if(confirmed)announce('The public record confirms this Original is accepted. PASS applies to the published assessed scope.','success');
      }catch{/* A missing acknowledgement cannot establish whether the write committed. Keep the Original ready for an idempotent retry. */}
     }else announce(cause instanceof Error?cause.message:'The proof could not be read. Choose the public Original and retry.','error');
    }
    finally{busy=false;refresh();}
   });
   form.hidden=false;refresh();forms.push({refresh,announce});
  }
  if(forms.length){
   const readMutation=mutation;
   void readPublicRecords().then(value=>{
    for(const entry of value.records)apply(entry);
    if(readMutation===mutation){publishingAvailable=value.publishingAvailable;if(!publishingAvailable)for(const form of forms)form.announce('Public publishing is not connected yet. Existing records remain available.');for(const form of forms)form.refresh();}
   }).catch(()=>{if(readMutation===mutation)for(const form of forms)form.announce('Public Registry updates are temporarily unavailable. Existing records remain available.');});
  }
 }
}
