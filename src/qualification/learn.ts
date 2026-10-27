const mounted=new WeakSet<HTMLElement>();
const escape=(v:unknown)=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function mountOriginalExample(root:HTMLElement){
 if(mounted.has(root))return;mounted.add(root);
 const verify=root.querySelector<HTMLButtonElement>('[data-example-verify]')!,tamper=root.querySelector<HTMLButtonElement>('[data-example-tamper]')!,status=root.querySelector<HTMLElement>('[data-example-status]')!,output=root.querySelector<HTMLElement>('[data-example-result]')!,challenge=root.querySelector<HTMLElement>('[data-example-challenge]')!;
 let source:File|null=null,busy=false;
 async function sample(){if(source)return source;const response=await fetch('/proofs/sealed-essay.png',{credentials:'omit'});if(!response.ok)throw Error('The public sample could not be read.');source=new File([await response.arrayBuffer()],'sealed-essay.png',{type:'image/png'});return source;}
 async function run(altered:boolean){
  if(busy)return;busy=true;verify.disabled=true;tamper.disabled=true;
  const target=altered?challenge:status;target.textContent=altered?'Changing one essay character, repairing the PNG checksum, then verifying…':'Opening the complete sealed proof and reproducing its value on this device…';
  try{
   const [{receizKaiNow},{inspectOriginalExample,challengeOriginalExample},model]=await Promise.all([import('@receiz/sdk'),import('./example'),import('../value-explainer/model')]);
   const file=await sample(),coordinate=String(receizKaiNow().uPulse);
   if(altered){const rejected=await challengeOriginalExample(file,coordinate);target.textContent="Altered proof rejected. The edited content no longer matches the sealed proof. The original file is unchanged.";const detail=document.createElement("details");detail.className="originals-details";const summary=document.createElement("summary");summary.textContent="Verifier result";const code=document.createElement("code");code.textContent=rejected;detail.append(summary,code);target.replaceChildren(document.createTextNode(target.textContent),detail);return;}
   const result=await inspectOriginalExample(file,coordinate),p=result.projection;
   if(p.status!=='available')throw Error(`This source cannot be valued: ${p.code}`);
   if(!root.isConnected)return;
   const binding=(label:string,value:unknown)=>`<div><dt>${escape(label)}</dt><dd>${escape(value??'Not carried')}</dd></div>`;
   status.textContent='Proof verified. Value reproduced. Replay verified.';
   output.innerHTML=`<div class="originals-example-value"><span>Proof-bound value at this captured moment</span><strong>${escape(model.formatPhiMicro(p.proofValuePhiMicro))} Φ</strong><p>${p.displayUsdCents===null?'':escape(model.formatUsdCents(p.displayUsdCents))+' · deterministic dollar valuation'}</p><small>Evaluation Kai µPulse ${escape(p.valuationKaiUPulse)}</small></div><p class="originals-note">This is the Original’s computed value. A completed sale records an actual exchange price; Settlement records an accepted financial use. Inspect each on its own evidence.</p><details class="originals-details"><summary>Inspect the source and calculation</summary><dl class="originals-bindings">${[binding('Proof digest',p.proofDigest),binding('Sealed origin · Kai pulse',p.originKaiPulse),binding('Origin · Kai µPulse',result.displayFacts!.originKaiUPulse),binding('Origin coordinate basis',result.displayFacts!.originBasis),binding(result.displayFacts!.headLabel,result.displayFacts!.head),binding('Value law',p.algorithm+' · '+p.policyChecksum),binding('Projection digest',p.projectionDigest),binding('Account writes',p.writesPerformed)].join('')}</dl><h4>Every calculation step</h4><ol class="originals-trace">${p.calculation.map(term=>`<li><strong>${escape(term.label)}</strong><code>${escape(term.formula)}</code><pre>${escape(JSON.stringify(term.operands,null,2))}</pre><p>${escape(term.result)} ${escape(term.unit)}</p></li>`).join('')}</ol></details><button type="button" class="originals-outline" data-example-replay>Download verified replay ↓</button>`;
   output.hidden=false;
   output.querySelector('[data-example-replay]')!.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(result.replay,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`original-value-replay-${result.replay!.replayDigest.slice(0,12)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  }catch(cause){target.textContent=cause instanceof Error?cause.message:'Proof could not be verified.';}
  finally{busy=false;verify.disabled=false;tamper.disabled=false;}
 }
 verify.addEventListener('click',()=>void run(false));tamper.addEventListener('click',()=>void run(true));verify.disabled=false;tamper.disabled=false;
}
function boot(){document.querySelectorAll<HTMLElement>('[data-originals-example]').forEach(mountOriginalExample);}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();window.addEventListener('receiz-learn:page',boot);}
