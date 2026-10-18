import { SIGIL_VALUATION_POLICY, type SigilCalculationTerm, type ReceizProofValueProjectionV129 } from '@receiz/sdk/valuation';
import {receizKaiNow} from '@receiz/sdk';
import {
  calculateIllustration, DEMO_SCENARIO, formatPhiMicro, formatUsdCents,
  illustrationRecord, sampleIllustration, stableStringify, type ValueScenario,
} from './model';

const mounted = new WeakSet<Element>();
const escape = (value: unknown) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const message = (error: unknown) => error instanceof Error ? error.message : 'The calculation could not be completed.';

export function traceMarkup(trace: readonly SigilCalculationTerm[]): string {
  return `<ol class="value-trace-list">${trace.map(term => `<li><strong>${escape(term.label)}<code>${escape(term.id)}</code></strong><div><p><code>${escape(term.formula)}</code></p><pre>${escape(stableStringify(term.operands))}</pre><div class="value-trace-result">${escape(term.result)} ${escape(term.unit)}</div><small>${term.sourceReferences.map(escape).join(' · ')}</small></div></li>`).join('')}</ol>`;
}

function downloadJson(value: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(value, null, 2) + '\n'], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function chartMarkup(samples: ReturnType<typeof sampleIllustration>['samples'], selected: number): string {
  const width = 640, height = 194, left = 65, right = 11, top = 23, bottom = 29;
  const max = Math.max(...samples.flatMap(sample => [sample.valuePhi, sample.floorPhi]), .000001) * 1.12;
  const x = (index: number) => left + (width - left - right) * index / Math.max(1, samples.length - 1);
  const y = (value: number) => height - bottom - (height - top - bottom) * value / max;
  const path = (field: 'valuePhi' | 'floorPhi') => samples.map((sample, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)} ${y(sample[field]).toFixed(2)}`).join(' ');
  const current = samples[selected];
  return `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(samples.length)} recomputed model samples from pulse ${escape(samples[0].pulse)} to ${escape(samples.at(-1)!.pulse)}. The vertical axis starts at zero; these are calculated values, not sale prices."><path d="M${left} ${top}V${height - bottom}H${width - right}" stroke="#52677d" fill="none"/><text x="0" y="${top + 5}">${max.toFixed(2)} Φ</text><text x="11" y="${height - bottom + 4}">0 Φ</text><path d="${path('floorPhi')}" stroke="#55bca5" stroke-width="1.4" stroke-dasharray="4 4" fill="none"/><path d="${path('valuePhi')}" stroke="#7e9aff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M${x(selected)} ${top}V${height - bottom}" stroke="#7591bd" stroke-dasharray="3 4"/><circle cx="${x(selected)}" cy="${y(current.valuePhi)}" r="5" fill="#7e9aff" stroke="#dbe5ff"/><text x="${left}" y="${height - 4}">${escape(samples[0].pulse)}</text><text x="${width - right}" y="${height - 4}" text-anchor="end">${escape(samples.at(-1)!.pulse)}</text></svg>`;
}

function binding(label: string, value: unknown) { return `<div><dt>${escape(label)}</dt><dd>${escape(value ?? 'Not carried')}</dd></div>`; }

function projectionMarkup(projection: ReceizProofValueProjectionV129): string {
  return `<h3>Proof-bound result</h3><p class="value-result-kind">Present value at pulse ${escape(BigInt(projection.valuationKaiUPulse)/1000000n)}</p><output class="value-result-amount">${formatPhiMicro(projection.proofValuePhiMicro)} <span>Φ</span></output><p>The SDK verified the original and independently replayed the selected coordinates. Writes performed: ${projection.writesPerformed}.</p><dl class="value-binding-list">${[
    binding('Current proof digest', projection.proofDigest), binding('Original proof digest', projection.originProofDigest),
    binding('Admitted history head', projection.historyHead), binding('Original Kai pulse', projection.originKaiPulse),
    binding('Original Kai µPulse', projection.originKaiUPulse), binding('Evaluation Kai µPulse', projection.valuationKaiUPulse),
    binding('Policy', `${projection.algorithm} · ${projection.policyChecksum}`), binding('Projection digest', projection.projectionDigest),
    binding('Market reference (Phi micro-units)', projection.marketReferenceValuePhiMicro),
    binding('Last completed sale (Phi micro-units)', projection.lastExecutedPricePhiMicro),
  ].join('')}</dl><button type="button" class="value-outline-button" data-value-download-replay>Download public replay</button><details class="value-detail"><summary>Complete proof-bound trace</summary><div class="value-detail-body">${traceMarkup(projection.calculation)}</div></details><details class="value-detail"><summary>Admitted inputs and transaction boundaries</summary><div class="value-detail-body"><pre>${escape(JSON.stringify({ inputs: projection.inputs, transactions: projection.transactions }, null, 2))}</pre></div></details>`;
}

export function mountValueExplainer(root: HTMLElement) {
  if (mounted.has(root)) return;
  mounted.add(root);
  const find = <T extends HTMLElement>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Value guide element missing: ${selector}`);
    return element;
  };
  root.querySelectorAll<HTMLButtonElement>('[data-value-enhanced]').forEach(button => button.disabled = false);
  find('[data-value-policy]').textContent = JSON.stringify(SIGIL_VALUATION_POLICY, null, 2);
  const form = find<HTMLFormElement>('[data-value-demo]');
  const slider = find<HTMLInputElement>('[data-value-sample]');
  const demoError = find('[data-value-demo-error]');
  const trace = find('[data-value-trace]');
  const rateInput = find<HTMLInputElement>('[data-value-display-rate]');
  const illustrationDownload = find<HTMLButtonElement>('[data-value-download-illustration]');
  const evaluationInput=find<HTMLInputElement>('#value-evaluation');
  const openingCoordinate=receizKaiNow();
  evaluationInput.readOnly=true;evaluationInput.value=String(openingCoordinate.pulse);
  let scenario: ValueScenario = { ...DEMO_SCENARIO,evaluationPulse:evaluationInput.value };
  let interval = sampleIllustration(scenario);
  let selected = interval.samples.length - 1;
  let dollarGeneration = 0;
  const readScenario = (evaluationPulse:string): ValueScenario => {
    const data = new FormData(form);
    return { originPulse: String(data.get('originPulse')), evaluationPulse, seriesSize: String(data.get('seriesSize')), quality: String(data.get('quality')) as ValueScenario['quality'], usdPerPhiMicrocents: rateInput.value };
  };
  const currentScenario = () => ({ ...scenario, evaluationPulse: interval.samples[selected].pulse, usdPerPhiMicrocents: rateInput.value });
  const updateDollarDisplay = async () => {
    const generation = ++dollarGeneration;
    const error = find('[data-value-usd-error]');
    const output = find('[data-value-usd]');
    const equation = find('[data-value-usd-equation]');
    const digest = find('[data-value-basis-digest]');
    // Clear previous success immediately so a failed new rate cannot retain it.
    output.textContent = '—'; equation.textContent = ''; digest.textContent = '—'; error.textContent = '';
    try {
      const { createDisplayBasis, quoteDisplayUsd } = await import('./proof');
      const computation = calculateIllustration(currentScenario());
      const rate = rateInput.value;
      const basis = await createDisplayBasis(rate);
      const cents = quoteDisplayUsd(computation.proofValuePhiMicro, rate);
      if (generation !== dollarGeneration) return;
      output.textContent = formatUsdCents(cents);
      equation.textContent = `${computation.proofValuePhiMicro} Phi micro-units × ${rate} microcents per Φ → ${cents} USD cents, with half-up rounding.`;
      digest.textContent = basis.priceBasisDigest;
    } catch (cause) { if (generation === dollarGeneration) error.textContent = message(cause); }
  };
  const paint = () => {
    const computation = calculateIllustration(currentScenario());
    const inputs = computation.unsigned.inputs;
    find('[data-value-amount]').innerHTML = `${formatPhiMicro(computation.proofValuePhiMicro)} <span>Φ</span>`;
    find('[data-value-coordinate]').textContent = `${interval.samples[selected].pulse} pulses`;
    find('[data-value-result-kind]').textContent=`${selected===interval.samples.length-1?'Present value':'Value'} at pulse ${interval.samples[selected].pulse}`;
    find('[data-value-chart]').innerHTML = chartMarkup(interval.samples, selected);
    find('[data-value-breakdown]').innerHTML = [
      ['Rarity floor', `${inputs.rarityFloor.toFixed(6)} Φ`], ['Premium band', `${inputs.premiumBandBase.toFixed(6)} Φ`],
      ['Combined wave', `${inputs.combinedOsc.toFixed(6)} ×`], ['Cashflow present value', `${inputs.pv_phi.toFixed(6)} Φ`],
    ].map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
    trace.innerHTML = traceMarkup(computation.calculation);
    illustrationDownload.disabled = false;
    void updateDollarDisplay();
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    demoError.hidden = true; demoError.textContent = '';
    try {
      const coordinate=receizKaiNow();evaluationInput.value=String(coordinate.pulse);
      const candidate = readScenario(evaluationInput.value);
      const next = sampleIllustration(candidate);
      scenario = candidate; interval = next; selected = interval.samples.length - 1;
      slider.value = String(selected); slider.disabled = false; paint();
    } catch (cause) {
      demoError.textContent = message(cause); demoError.hidden = false;
      illustrationDownload.disabled = true;
    }
  });
  slider.addEventListener('input', () => { selected = Number(slider.value); paint(); });
  rateInput.addEventListener('input', () => void updateDollarDisplay());
  illustrationDownload.addEventListener('click', () => {
    try { downloadJson(illustrationRecord(currentScenario()), 'bankeiz-illustrative-calculation.json'); }
    catch (cause) { demoError.textContent = message(cause); demoError.hidden = false; }
  });
  slider.disabled = false; paint();

  const proofForm = find<HTMLFormElement>('[data-value-proof-form]');
  const proofEvaluation=find<HTMLInputElement>('#value-proof-evaluation');proofEvaluation.readOnly=true;proofEvaluation.value=String(openingCoordinate.uPulse);
  const proofStatus = find('[data-value-proof-status]');
  const proofResult = find('[data-value-proof-result]');
  let proofGeneration = 0;
  proofForm.addEventListener('input', () => {
    proofGeneration += 1;
    proofStatus.textContent = ''; proofResult.hidden = true; proofResult.replaceChildren();
    const button = proofForm.querySelector<HTMLButtonElement>('button[type=submit]');
    if (button) button.disabled = false;
  });
  proofForm.addEventListener('submit', async event => {
    event.preventDefault();
    const coordinate=receizKaiNow();proofEvaluation.value=String(coordinate.uPulse);
    const generation = ++proofGeneration;
    const data = new FormData(proofForm), file = data.get('proofFile');
    const submit = proofForm.querySelector<HTMLButtonElement>('button[type=submit]')!;
    proofResult.hidden = true; proofResult.replaceChildren();
    if (!(file instanceof File) || !file.size) { proofStatus.textContent = 'Choose the complete public original.'; return; }
    submit.disabled = true; proofStatus.textContent = 'Verifying the original, then recomputing its replay…';
    try {
      const { inspectHeldProof } = await import('./proof');
      const result = await inspectHeldProof({ file, evaluationKaiUPulse: String(data.get('evaluationKaiUPulse')), additionalCoordinates: String(data.get('additionalCoordinates')), portableHistory: data.get('portableHistory') === 'on' });
      if (generation !== proofGeneration || !root.isConnected) return;
      if (result.projection.status === 'unavailable') {
        proofStatus.textContent = `${result.projection.code} — the original did not supply the public valuation inputs required by this contract.`;
        return;
      }
      proofStatus.textContent = `Verified replay · ${result.chart!.samples.length} explicit coordinate${result.chart!.samples.length === 1 ? '' : 's'} · writes performed: 0`;
      proofResult.innerHTML = projectionMarkup(result.projection);
      proofResult.hidden = false;
      proofResult.querySelector('[data-value-download-replay]')!.addEventListener('click', () => downloadJson(result.replay, `bankeiz-public-value-replay-${result.replay!.replayDigest.slice(0, 12)}.json`));
    } catch (cause) { if (generation === proofGeneration && root.isConnected) proofStatus.textContent = message(cause); }
    finally { if (generation === proofGeneration) submit.disabled = false; }
  });
  const replayFile = find<HTMLInputElement>('[data-value-replay-file]');
  let replayGeneration = 0;
  replayFile.addEventListener('change', async () => {
    const generation = ++replayGeneration;
    const status = find('[data-value-replay-status]'), output = find('[data-value-replay-result]');
    output.replaceChildren(); status.textContent = '';
    const file = replayFile.files?.[0]; if (!file) return;
    status.textContent = 'Verifying the source and recomputing every expected digest…';
    try {
      const { inspectReplayFile } = await import('./proof');
      const verification = await inspectReplayFile(file);
      if (generation !== replayGeneration || !root.isConnected) return;
      if (verification.status === 'invalid-replay') { status.textContent = `Replay rejected: ${verification.code}`; return; }
      status.textContent = `Verified replay · writes performed: ${verification.writesPerformed}`;
      output.innerHTML = `<dl class="value-binding-list">${binding('Replay digest', verification.replayDigest)}${verification.samples.map((sample, index) => sample.status === 'available' ? binding(`Sample ${index + 1}: ${sample.valuationKaiUPulse} Kai µPulse`, `${sample.proofValuePhiMicro} Phi micro-units · ${sample.projectionDigest}`) : binding(`Sample ${index + 1}`, sample.code)).join('')}</dl>`;
    } catch (cause) { if (generation === replayGeneration && root.isConnected) status.textContent = message(cause); }
  });
}

function boot() { document.querySelectorAll<HTMLElement>('[data-value-explainer]').forEach(mountValueExplainer); }
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
  window.addEventListener('receiz-learn:page', boot);
}
