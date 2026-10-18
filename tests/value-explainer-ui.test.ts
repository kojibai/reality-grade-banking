// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
// @ts-expect-error Public-page templates are plain ESM.
import { valueExplainerContent } from '../scripts/value-explainer-template.mjs';
import { mountValueExplainer, traceMarkup } from '../src/value-explainer/main';
import {calculateIllustration,DEMO_SCENARIO,formatUsdCents} from '../src/value-explainer/model';
import {quoteDisplayUsd} from '../src/value-explainer/proof';
const clock=vi.hoisted(()=>({pulse:14710100,uPulse:14710100000123n}));
vi.mock('@receiz/sdk',async importOriginal=>({...await importOriginal<typeof import('@receiz/sdk')>(),receizKaiNow:()=>({...clock})}));

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks();clock.pulse=14710100;clock.uPulse=14710100000123n; });

function mount() {
  document.body.innerHTML = valueExplainerContent();
  const root = document.querySelector<HTMLElement>('[data-value-explainer]')!;
  mountValueExplainer(root);
  return root;
}

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

it('clears an obsolete dollar result when a new display rate is invalid', async () => {
  const root = mount();
  const value=calculateIllustration({...DEMO_SCENARIO,evaluationPulse:String(clock.pulse)});
  await vi.waitFor(() => expect(root.querySelector('[data-value-usd]')!.textContent).toBe(formatUsdCents(quoteDisplayUsd(value.proofValuePhiMicro,DEMO_SCENARIO.usdPerPhiMicrocents))));
  const rate = root.querySelector<HTMLInputElement>('[data-value-display-rate]')!;
  rate.value = '0'; rate.dispatchEvent(new Event('input', { bubbles: true }));
  await vi.waitFor(() => expect(root.querySelector('[data-value-usd-error]')!.textContent).toContain('positive'));
  expect(root.querySelector('[data-value-usd]')!.textContent).toBe('—');
  expect(root.querySelector('[data-value-basis-digest]')!.textContent).toBe('—');
});

it('renders complete trace text without treating metadata as HTML', () => {
  const rendered = traceMarkup([{ id: 'x', label: '<img src=x onerror=alert(1)>', formula: '<script>', operands: { caller: '<svg/onload=x>' }, result: '<b>1</b>', unit: 'Φ', sourceReferences: ['<a>'] }]);
  document.body.innerHTML = rendered;
  expect(document.querySelector('img,script,svg')).toBeNull();
  expect(document.body.textContent).toContain('<svg/onload=x>');
  expect(document.body.textContent).toContain('<b>1</b>');
});

it('keeps intrinsic sample inspection usable when only the educational dollar rate is invalid',async()=>{
 const root=mount(),rate=root.querySelector<HTMLInputElement>('[data-value-display-rate]')!;rate.value='0';rate.dispatchEvent(new Event('input',{bubbles:true}));
 const slider=root.querySelector<HTMLInputElement>('[data-value-sample]')!;slider.value='0';expect(()=>slider.dispatchEvent(new Event('input',{bubbles:true}))).not.toThrow();
 expect(root.querySelector('[data-value-coordinate]')!.textContent).toBe('1000000 pulses');
 await vi.waitFor(()=>expect(root.querySelector('[data-value-usd]')!.textContent).toBe('—'));
});
