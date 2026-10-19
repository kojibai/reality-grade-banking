import {receizKaiNow} from '@receiz/sdk';
import type {SigilMetadataLite} from '@receiz/sdk/valuation';
import {calculatePhiUsd} from './phi-usd';
import {formatUsdCents} from './model';

const escape=(value:unknown)=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function mountPhiUsdCalculator(root:HTMLElement,download:(value:unknown,filename:string)=>void){
 const find=<T extends HTMLElement>(selector:string)=>{const element=root.querySelector<T>(selector);if(!element)throw Error(`Φ converter element missing: ${selector}`);return element;};
 const amount=find<HTMLInputElement>('[data-phi-usd-amount]'),coordinate=find<HTMLInputElement>('[data-phi-usd-coordinate]'),source=find<HTMLSelectElement>('[data-phi-usd-source]');
 const output=find('[data-phi-usd-result]'),rate=find('[data-phi-usd-rate]'),trace=find('[data-phi-usd-trace]'),error=find('[data-phi-usd-error]'),button=find<HTMLButtonElement>('[data-phi-usd-download]');
 let record:ReturnType<typeof calculatePhiUsd>|null=null,metadata:SigilMetadataLite|null=null,calculatedPhi='1',manualPhi='1';
 const paint=()=>{
  coordinate.readOnly=true;coordinate.value=String(receizKaiNow().uPulse);amount.readOnly=source.value==='calculated';if(amount.readOnly)amount.value=calculatedPhi;
  if(!metadata)return;
  try{
   const next=calculatePhiUsd(amount.value,coordinate.value,metadata);record=next;
   const update=(element:Element,value:unknown)=>{const text=String(value);if(element.textContent!==text)element.textContent=text;};
   update(output,formatUsdCents(next.usdCents));update(rate,`$${next.quote.usdPerPhi} per Φ`);error.textContent='';button.disabled=false;
   const entries:[string,unknown][]=[['Live Kai µPulse',next.valuationKaiUPulse],['Whole Kai pulse',next.valuationKaiPulse],['Φ micro-units',next.amountPhiMicro],['Intrinsic premium',next.quote.premium],['Adoption coordinate',next.quote.adoption],['Moment rarity score',next.quote.rarityScore],...Object.entries(next.quote.multipliers),['Combined issuance multiplier',next.quote.issuanceMultiplier],['Φ per $ · q9',next.quote.phiPerUsd],['$ per Φ · q9',next.quote.usdPerPhi]];
   if(!trace.firstElementChild)trace.innerHTML=`<dl class="value-binding-list">${entries.map(([label])=>`<div><dt>${escape(label)}</dt><dd></dd></div>`).join('')}</dl><pre data-phi-usd-arithmetic></pre><details class="value-detail"><summary>Exact object inputs and pinned policies</summary><pre data-phi-usd-policies></pre></details>`;
   trace.querySelectorAll('dd').forEach((element,index)=>update(element,entries[index][1]));
   update(trace.querySelector('[data-phi-usd-arithmetic]')!,`Φ = ${next.trace.phi}\n$ per Φ = ${next.quote.usdPerPhi}\n$ = Φ × rate = ${next.trace.rawUsd}\n$ cents before rounding = ${next.trace.rawCents}\n$ cents = Math.round(Φ × rate × 100) = ${next.usdCents}`);
   update(trace.querySelector('[data-phi-usd-policies]')!,JSON.stringify({quoteInputs:next.quoteInputs,valuationPolicy:next.valuationPolicy,issuancePolicy:next.issuancePolicy},null,2));
  }catch(cause){record=null;output.textContent='—';rate.textContent='—';trace.replaceChildren();button.disabled=true;error.textContent=cause instanceof Error?cause.message:'This conversion could not be calculated.';}
 };
 amount.addEventListener('input',()=>{if(!amount.readOnly)manualPhi=amount.value;paint();});source.addEventListener('change',()=>{amount.value=source.value==='calculated'?calculatedPhi:manualPhi;paint();});
 button.addEventListener('click',()=>{if(record)download(record,'bankeiz-phi-usd-calculation.json');});find<HTMLFormElement>('[data-phi-usd-form]').addEventListener('submit',event=>{event.preventDefault();paint();});
 paint();const timer=setInterval(()=>{if(!root.isConnected){clearInterval(timer);return;}if(document.visibilityState==='visible'&&!root.closest('[hidden]'))paint();},1000);
 return {setCalculatedPhi(micro:string,meta:SigilMetadataLite){const value=BigInt(micro);calculatedPhi=`${value/1000000n}.${(value%1000000n).toString().padStart(6,'0')}`;metadata=structuredClone(meta);paint();}};
}
