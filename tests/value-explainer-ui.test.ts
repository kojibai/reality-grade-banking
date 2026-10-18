// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
// @ts-expect-error Public-page templates are plain ESM.
import { valueExplainerContent } from '../scripts/value-explainer-template.mjs';
import { mountValueExplainer, traceMarkup } from '../src/value-explainer/main';

afterEach(() => { document.body.replaceChildren(); vi.restoreAllMocks(); });

function mount() {
  document.body.innerHTML = valueExplainerContent();
  const root = document.querySelector<HTMLElement>('[data-value-explainer]')!;
  mountValueExplainer(root);
  return root;
}

it('mounts idempotently and computes real samples when the coordinate changes', async () => {
  const root = mount(), form = root.querySelector<HTMLFormElement>('[data-value-demo]')!;
  const before = root.querySelector('[data-value-amount]')!.textContent;
  mountValueExplainer(root);
  expect(root.querySelectorAll('.value-trace-list')).toHaveLength(1);
  const input = root.querySelector<HTMLInputElement>('#value-evaluation')!;
  input.value = '1034982'; form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(root.querySelector('[data-value-amount]')!.textContent).not.toBe(before);
  expect(root.querySelector('[data-value-coordinate]')!.textContent).toBe('1034982 pulses');
  expect(root.querySelector('#value-origin')!.getAttribute('value')).toBe('1000000');
  const slider = root.querySelector<HTMLInputElement>('[data-value-sample]')!;
  slider.value = '0'; slider.dispatchEvent(new Event('input', { bubbles: true }));
  expect(root.querySelector('[data-value-coordinate]')!.textContent).toBe('1000000 pulses');
  expect(root.querySelector('[data-value-chart] svg')!.getAttribute('aria-label')).toContain('vertical axis starts at zero');
});

it('keeps an invalid new interval visibly rejected and disables its export', () => {
  const root = mount(), form = root.querySelector<HTMLFormElement>('[data-value-demo]')!;
  root.querySelector<HTMLInputElement>('#value-evaluation')!.value = '999999';
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  expect(root.querySelector<HTMLElement>('[data-value-demo-error]')!.hidden).toBe(false);
  expect(root.querySelector('[data-value-demo-error]')!.textContent).toContain('at or after');
  expect(root.querySelector<HTMLButtonElement>('[data-value-download-illustration]')!.disabled).toBe(true);
});

it('clears an obsolete dollar result when a new display rate is invalid', async () => {
  const root = mount();
  await vi.waitFor(() => expect(root.querySelector('[data-value-usd]')!.textContent).toBe('$191.48'));
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
