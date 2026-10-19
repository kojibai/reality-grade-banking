import { receizKaiNow } from '@receiz/sdk';
import { calculatePhiUsd } from './phi-usd';
import { formatUsdCents } from './model';

const escape = (value: unknown) => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function mountPhiUsdCalculator(root: HTMLElement, download: (value: unknown, filename: string) => void) {
  const find = <T extends HTMLElement>(selector: string) => {
    const element=root.querySelector<T>(selector);if(!element)throw Error(`Phi converter element missing: ${selector}`);return element;
  };
  const amount=find<HTMLInputElement>('[data-phi-usd-amount]'),coordinate=find<HTMLInputElement>('[data-phi-usd-coordinate]'),live=find<HTMLInputElement>('[data-phi-usd-live]');
  const source=find<HTMLSelectElement>('[data-phi-usd-source]');
  const output=find('[data-phi-usd-result]'),rate=find('[data-phi-usd-rate]'),trace=find('[data-phi-usd-trace]'),error=find('[data-phi-usd-error]'),button=find<HTMLButtonElement>('[data-phi-usd-download]');
  let record: ReturnType<typeof calculatePhiUsd> | null = null;
  let calculatedPhi='1',manualPhi='1';
  const paint = () => {
    amount.readOnly=source.value==='calculated';
    if(amount.readOnly)amount.value=calculatedPhi;
    coordinate.readOnly=live.checked;
    if(live.checked)coordinate.value=String(receizKaiNow().uPulse);
    try {
      const next=calculatePhiUsd(amount.value,coordinate.value);record=next;
      const result=formatUsdCents(next.usdCents);if(output.textContent!==result)output.textContent=result;
      rate.textContent=`$${next.quote.usdPerPhiFixed8} per Φ`;
      error.textContent='';button.disabled=false;
      const entries: [string,unknown][]=[['Evaluation Kai µPulse',next.valuationKaiUPulse],['Whole Kai pulse',next.valuationKaiPulse],['Φ micro-units',next.amountPhiMicro],['Intrinsic premium',next.quote.premium],['Adoption coordinate',next.quote.adoption],['Moment rarity score',next.quote.rarityScore],...Object.entries(next.quote.multipliers),['Combined issuance multiplier',next.quote.issuanceMultiplier],['Φ per USD · q9',next.quote.phiPerUsd],['USD per Φ · q9',next.quote.usdPerPhi],['USD per Φ · toFixed(8)',next.quote.usdPerPhiFixed8],['Rate · $ microcents per Φ',next.usdPerPhiMicrocents]];
      // Keep inspectors and focused nodes mounted while the live quote changes.
      if(!trace.firstElementChild)trace.innerHTML=`<dl class="value-binding-list">${entries.map(([label])=>`<div><dt>${escape(label)}</dt><dd></dd></div>`).join('')}</dl><pre data-phi-usd-arithmetic></pre><details class="value-detail"><summary>Exact inputs and pinned policies</summary><pre data-phi-usd-policies></pre></details>`;
      const update=(element:Element,value:unknown)=>{const text=String(value);if(element.textContent!==text)element.textContent=text;};
      trace.querySelectorAll('dd').forEach((element,index)=>update(element,entries[index][1]));
      update(trace.querySelector('[data-phi-usd-arithmetic]')!,`product = ${next.amountPhiMicro} × ${next.usdPerPhiMicrocents}
        = ${next.trace.product}
USD cents = (${next.trace.product} + 500000000000) / 1000000000000
          = ${next.usdCents} (integer division)
remainder = ${next.trace.remainder}`);
      update(trace.querySelector('[data-phi-usd-policies]')!,JSON.stringify({quoteInputs:next.quoteInputs,valuationPolicy:next.valuationPolicy,issuancePolicy:next.issuancePolicy},null,2));
    } catch(cause) {
      record=null;output.textContent='—';rate.textContent='—';trace.replaceChildren();button.disabled=true;
      error.textContent=cause instanceof Error?cause.message:'This conversion could not be calculated.';
    }
  };
  amount.addEventListener('input',()=>{if(!amount.readOnly)manualPhi=amount.value;paint();});coordinate.addEventListener('input',paint);live.addEventListener('change',paint);
  source.addEventListener('change',()=>{amount.value=source.value==='calculated'?calculatedPhi:manualPhi;paint();});
  button.addEventListener('click',()=>{if(record)download(record,'bankeiz-phi-usd-calculation.json');});
  const form=find<HTMLFormElement>('[data-phi-usd-form]');form.addEventListener('submit',event=>{event.preventDefault();paint();});
  paint();
  const timer=setInterval(()=>{if(!root.isConnected){clearInterval(timer);return;}if(live.checked&&document.visibilityState==='visible'&&!root.closest('[hidden]'))paint();},1000);
  return {setCalculatedPhi(micro:string){const value=BigInt(micro);calculatedPhi=`${value/1_000_000n}.${(value%1_000_000n).toString().padStart(6,'0')}`;if(source.value==='calculated')paint();}};
}
