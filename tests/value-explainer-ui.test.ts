// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
// @ts-expect-error Public-page templates are plain ESM.
import { valueExplainerContent } from '../scripts/value-explainer-template.mjs';
import { mountValueExplainer, traceMarkup } from '../src/value-explainer/main';
import {calculateIllustration,DEMO_SCENARIO,formatUsdCents} from '../src/value-explainer/model';
import {calculatePhiUsd} from '../src/value-explainer/phi-usd';
const clock=vi.hoisted(()=>({pulse:14710100,uPulse:14710100000123n}));
vi.mock('@receiz/sdk',async importOriginal=>({...await importOriginal<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({...clock})}));

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks();vi.useRealTimers();clock.pulse=14710100;clock.uPulse=14710100000123n; });

function mount() {
  document.body.innerHTML = valueExplainerContent();
  const root = document.querySelector<HTMLElement>('[data-value-explainer]')!;
  mountValueExplainer(root);
  return root;
}
const metadata=()=>calculateIllustration({...DEMO_SCENARIO,evaluationPulse:String(clock.pulse)}).metadata;
const converted=(amount:string,kai=String(clock.uPulse))=>calculatePhiUsd(amount,kai,metadata());
function manualPhi(root:HTMLElement){const source=root.querySelector<HTMLSelectElement>('[data-phi-usd-source]')!;source.value='manual';source.dispatchEvent(new Event('change',{bubbles:true}));}

it('automatically converts the calculated Phi and allows independent entry then relinking',()=>{
 const root=mount(),amount=root.querySelector<HTMLInputElement>('[data-phi-usd-amount]')!,source=root.querySelector<HTMLSelectElement>('[data-phi-usd-source]')!;
 const phi=()=>root.querySelector('[data-value-amount]')!.textContent!.replaceAll(',','').replace(' Φ','');
 expect(amount.value).toBe(phi());expect(amount.readOnly).toBe(true);
 const form=root.querySelector<HTMLFormElement>('[data-value-demo]')!;
 root.querySelector<HTMLInputElement>('#value-quality')!.value='high';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 expect(amount.value).toBe(phi());
 manualPhi(root);amount.value='2';amount.dispatchEvent(new Event('input',{bubbles:true}));
 root.querySelector<HTMLInputElement>('[data-value-sample]')!.value='0';root.querySelector('[data-value-sample]')!.dispatchEvent(new Event('input',{bubbles:true}));
 expect(amount.value).toBe('2');expect(amount.readOnly).toBe(false);
 source.value='calculated';source.dispatchEvent(new Event('change',{bubbles:true}));expect(amount.value).toBe(phi());expect(amount.readOnly).toBe(true);
});

it('updates the standalone Phi conversion from the actual Kai clock while preserving captured proof calculations', () => {
  vi.useFakeTimers();clock.pulse=14692714;clock.uPulse=14692714000000n;
  const root=mount(),proofValue=root.querySelector('[data-value-amount]')!.textContent;
  manualPhi(root);
  expect(root.querySelector('[data-phi-usd-result]')?.textContent).toBe(formatUsdCents(converted('1').usdCents));
  const amount=root.querySelector<HTMLInputElement>('[data-phi-usd-amount]')!;
  amount.value='1.234567';amount.dispatchEvent(new Event('input',{bubbles:true}));
  expect(root.querySelector('[data-phi-usd-result]')!.textContent).toBe(formatUsdCents(converted('1.234567').usdCents));
  clock.pulse=13959986;clock.uPulse=13959986000000n;vi.advanceTimersByTime(1000);
  expect(root.querySelector('[data-phi-usd-coordinate]')?.getAttribute('readonly')).not.toBeNull();
  expect(root.querySelector<HTMLInputElement>('[data-phi-usd-coordinate]')!.value).toBe('13959986000000');
  expect(root.querySelector('[data-phi-usd-rate]')!.textContent).toBe(`$${converted('1.234567').quote.usdPerPhi} per Φ`);
  expect(root.querySelector('[data-value-amount]')!.textContent).toBe(proofValue);
  root.remove();vi.advanceTimersByTime(1000);expect(vi.getTimerCount()).toBe(0);
});

it('uses only the live coordinate, exposes no editable exchange rate and clears invalid amounts',()=>{
 vi.useFakeTimers();const root=mount();manualPhi(root);
 const coordinate=root.querySelector<HTMLInputElement>('[data-phi-usd-coordinate]')!,amount=root.querySelector<HTMLInputElement>('[data-phi-usd-amount]')!;
 expect(coordinate.readOnly).toBe(true);expect(root.querySelector('[data-phi-usd-live]')).toBeNull();expect(root.querySelector('[data-value-display-rate]')).toBeNull();
 coordinate.value='0';clock.uPulse+=1000000n;vi.advanceTimersByTime(1000);expect(coordinate.value).toBe(String(clock.uPulse));
 amount.value='1e3';amount.dispatchEvent(new Event('input',{bubbles:true}));expect(root.querySelector('[data-phi-usd-result]')!.textContent).toBe('—');expect(root.querySelector('[data-phi-usd-trace]')!.textContent).toBe('');expect(root.querySelector<HTMLButtonElement>('[data-phi-usd-download]')!.disabled).toBe(true);expect(root.querySelector('[data-phi-usd-error]')!.textContent).toContain('six decimal places');
});

it('downloads complete conversion operands, policy and exact cent-rounding arithmetic', async () => {
  clock.pulse=14692714;clock.uPulse=14692714000000n;const root=mount();let exported:Blob|undefined;
  manualPhi(root);
  vi.spyOn(URL,'createObjectURL').mockImplementation(blob=>{exported=blob as Blob;return 'blob:conversion';});vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  root.querySelector<HTMLButtonElement>('[data-phi-usd-download]')!.click();const record=JSON.parse(await exported!.text());
  expect(record).toMatchObject({sdkVersion:'129.0.0',amountPhiMicro:'1000000',valuationKaiUPulse:'14692714000000',usdCents:converted('1').usdCents,writesPerformed:0});
  expect(record.trace.roundedCents).toBe(Number(converted('1').usdCents));expect(record.conversion.algorithm).toBe('receiz.market-proof-usd.v129');expect(record.issuancePolicy.basePhiPerUsd).toBe(0.1);
  expect(record.quoteInputs).toMatchObject({usd:100,currentStreakDays:0,lifetimeUsdSoFar:0,plannedHoldBeats:0});
  expect(record.valuationPolicy.checksum).toBe('b05b2049');
});
it('keeps the policy inspector and focus intact across live quote updates', () => {
  vi.useFakeTimers();const root=mount(),details=root.querySelector<HTMLDetailsElement>('[data-phi-usd-trace] details')!,summary=details.querySelector('summary')!;
  details.open=true;summary.focus();clock.uPulse+=1000000n;vi.advanceTimersByTime(1000);
  expect(root.querySelector('[data-phi-usd-trace] details')).toBe(details);expect(details.open).toBe(true);expect(document.activeElement).toBe(summary);
});

it('adds, calculates and removes cashflows without confusing them with the edition size',()=>{
  const root=mount(),form=root.querySelector<HTMLFormElement>('[data-value-demo]')!;
  const before=root.querySelector('[data-value-chart] path[stroke="#7e9aff"]')!.getAttribute('d');
  const add=root.querySelector<HTMLButtonElement>('[data-value-add-cashflow]')!;
  add.click();add.click();
  const rows=root.querySelectorAll('[data-value-cashflow]');
  expect(rows).toHaveLength(2);
  expect(rows[0].querySelector<HTMLInputElement>('[name="cashflowPulse"]')!.value).toBe(root.querySelector<HTMLInputElement>('#value-origin')!.value);
  rows.forEach((row,index)=>{
    row.querySelector<HTMLInputElement>('[name="cashflowAmount"]')!.value=index?'20':'3.5';
    row.querySelector<HTMLInputElement>('[name="cashflowPulse"]')!.value=String(clock.pulse+(index?17491:0));
  });
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  const cashflow=root.querySelector('[data-value-breakdown]')!.lastElementChild!;
  expect(cashflow.textContent).toContain((3.5+20/(1+17491/17491.270421)).toFixed(6)+' Φ');
  expect(root.querySelector('[data-value-chart] path[stroke="#7e9aff"]')!.getAttribute('d')).not.toBe(before);
  expect(root.querySelector('[data-value-trace]')!.textContent).toContain('ip.phi.1.presentValue');
  expect(root.querySelector<HTMLInputElement>('#value-size')!.value).toBe('1');
  rows.forEach(row=>row.querySelector<HTMLButtonElement>('[data-value-remove-cashflow]')!.click());
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  expect(root.querySelectorAll('[data-value-cashflow]')).toHaveLength(0);
  expect(cashflow.isConnected).toBe(false);
  expect(root.querySelector('[data-value-breakdown]')!.lastElementChild!.textContent).toContain('0.000000 Φ');
  expect(root.querySelector('[data-value-demo-error]')!.textContent).toBe('');
});

it('rejects an invalid entered payment and prevents exporting that result',()=>{
  const root=mount();
  root.querySelector<HTMLButtonElement>('[data-value-add-cashflow]')!.click();
  root.querySelector<HTMLInputElement>('[name="cashflowAmount"]')!.value='-1';
  root.querySelector<HTMLFormElement>('[data-value-demo]')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  expect(root.querySelector<HTMLElement>('[data-value-demo-error]')!.hidden).toBe(false);
  expect(root.querySelector('[data-value-demo-error]')!.textContent).toContain('Cashflow 1 amount');
  expect(root.querySelector<HTMLButtonElement>('[data-value-download-illustration]')!.disabled).toBe(true);
  const slider=root.querySelector<HTMLInputElement>('[data-value-sample]')!;
  slider.value='0';slider.dispatchEvent(new Event('input',{bubbles:true}));
  expect(root.querySelector<HTMLButtonElement>('[data-value-download-illustration]')!.disabled).toBe(true);
});

it('downloads the entered cashflows with the same computed result and captured coordinate',async()=>{
  const root=mount(),form=root.querySelector<HTMLFormElement>('[data-value-demo]')!;
  root.querySelector<HTMLButtonElement>('[data-value-add-cashflow]')!.click();
  root.querySelector<HTMLInputElement>('[name="cashflowAmount"]')!.value='12.5';
  root.querySelector<HTMLInputElement>('[name="cashflowPulse"]')!.value=String(clock.pulse);
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  let exported:Blob|undefined;
  vi.spyOn(URL,'createObjectURL').mockImplementation(blob=>{exported=blob as Blob;return 'blob:test';});
  vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});
  root.querySelector<HTMLButtonElement>('[data-value-download-illustration]')!.click();
  const record=JSON.parse(await exported!.text());
  expect(record.scenario.cashflows).toEqual([{atPulse:String(clock.pulse),amountPhi:'12.5'}]);
  expect(record.evaluationPulse).toBe(clock.pulse);
  expect(record.unsigned.inputs.pv_phi).toBe(12.5);
  expect(record.unsigned.valuePhi.toFixed(6)).toBe(root.querySelector('[data-value-amount]')!.textContent!.replaceAll(',','').replace(' Φ',''));
  expect(record.sdkVersion).toBe('129.0.0');
  expect(record.writesPerformed).toBe(0);
});

it('mounts idempotently and computes real samples when the coordinate changes', async () => {
  const root = mount(), form = root.querySelector<HTMLFormElement>('[data-value-demo]')!;
  const before = root.querySelector('[data-value-amount]')!.textContent;
  mountValueExplainer(root);
  expect(root.querySelectorAll('.value-trace-list')).toHaveLength(1);
  const input = root.querySelector<HTMLInputElement>('#value-evaluation')!;
  clock.pulse=14710120;input.value = '1034982'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(root.querySelector('[data-value-amount]')!.textContent).not.toBe(before);
  expect(root.querySelector('[data-value-coordinate]')!.textContent).toBe('14710120 pulses');
  expect(input.value).toBe('14710120');expect(input.readOnly).toBe(true);
  expect(root.querySelector('[data-value-result-kind]')!.textContent).toBe('Present value at pulse 14710120');
  expect(root.querySelector('#value-origin')!.getAttribute('value')).toBe('1000000');
  const slider = root.querySelector<HTMLInputElement>('[data-value-sample]')!;
  slider.value = '0'; slider.dispatchEvent(new Event('input', { bubbles: true }));
  expect(root.querySelector('[data-value-coordinate]')!.textContent).toBe('1000000 pulses');
  expect(root.querySelector('[data-value-chart] svg')!.getAttribute('aria-label')).toContain('vertical axis starts at zero');
});

it('keeps an invalid new interval visibly rejected and disables its export', () => {
  const root = mount(), form = root.querySelector<HTMLFormElement>('[data-value-demo]')!;
  root.querySelector<HTMLInputElement>('#value-origin')!.value = '99999999';
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(root.querySelector<HTMLElement>('[data-value-demo-error]')!.hidden).toBe(false);
  expect(root.querySelector('[data-value-demo-error]')!.textContent).toContain('at or after');
  expect(root.querySelector<HTMLButtonElement>('[data-value-download-illustration]')!.disabled).toBe(true);
});

it('places the live conversion directly underneath the Phi calculator and removes the educational rate form',()=>{
 const root=mount(),section=root.querySelector('#phi-to-usd')!;expect(section.previousElementSibling?.id).toBe('calculation');expect(root.querySelector('#dollar-display')).toBeNull();expect(root.textContent).not.toContain('educational selection');
});

it('renders complete trace text without treating metadata as HTML', () => {
  const rendered = traceMarkup([{ id: 'x', label: '<img src=x onerror=alert(1)>', formula: '<script>', operands: { caller: '<svg/onload=x>' }, result: '<b>1</b>', unit: 'Φ', sourceReferences: ['<a>'] }]);
  document.body.innerHTML = rendered;
  expect(document.querySelector('img,script,svg')).toBeNull();
  expect(document.body.textContent).toContain('<svg/onload=x>');
  expect(document.body.textContent).toContain('<b>1</b>');
});

it('continues the live rate after hidden-page suspension without changing the captured Phi calculation',()=>{
 vi.useFakeTimers();const visibility=vi.spyOn(document,'visibilityState','get'),root=mount(),coordinate=root.querySelector<HTMLInputElement>('[data-phi-usd-coordinate]')!,captured=root.querySelector('[data-value-amount]')!.textContent,old=coordinate.value;
 visibility.mockReturnValue('hidden');clock.uPulse+=10000000n;vi.advanceTimersByTime(1000);expect(coordinate.value).toBe(old);visibility.mockReturnValue('visible');vi.advanceTimersByTime(1000);expect(coordinate.value).toBe(String(clock.uPulse));expect(root.querySelector('[data-value-amount]')!.textContent).toBe(captured);
});
