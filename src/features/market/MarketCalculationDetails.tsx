import { useEffect, useState, type ReactNode } from 'react';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import { formatMoney, formatUnits } from '../../core/money';
import type { chartChange } from '../../core/chart-history';
import type { CapitalizationPoint } from '../../receiz/market-projection/history';
import { marketCalculationMatches, type GlobalMarketCalculation, type GlobalMarketContribution, type SigilQuoteCalculation, type SportsUnitCalculation, type SportsQuoteCalculation } from '../../receiz/market-projection/calculation';
import type { inspectMarketSigil } from '../../receiz/market-projection/inspect-calculation';
import './market-calculation.css';

const integer = (value: string) => BigInt(value).toLocaleString('en-US');
const json = (value: unknown) => JSON.stringify(value, (key, value) => key === 'frequencyHz' && value === 'undefined' ? 'Not carried; canonical neutral resonance applies' : typeof value === 'number' && !Number.isFinite(value) ? String(value) : value, 2);
const inspected = new WeakMap<SigilQuoteCalculation, Promise<ReturnType<typeof inspectMarketSigil>>>();
function readIntrinsic(value: SigilQuoteCalculation) { let held = inspected.get(value); if (!held) { held = import('../../receiz/market-projection/inspect-calculation').then(module => module.inspectMarketSigil(value)); inspected.set(value, held); void held.catch(() => { if (inspected.get(value) === held) inspected.delete(value); }); } return held; }
function Depth({ title, children }: { title: ReactNode; children: () => ReactNode }) {
  const [open, setOpen] = useState(false);
  return <details open={open}>
    <summary onClick={event => { event.preventDefault(); setOpen(value => !value); }}>
      <span>{title}
      </span>
      <ChevronRight size={13} aria-hidden="true" />
    </summary>{open && children()}
  </details>;
}
function Fields({ values }: { values: Record<string, ReactNode> }) {
return <dl className="market-math-fields">{Object.entries(values).map(([label, value]) =>
    <div key={label}>
      <dt>{label}
      </dt>
      <dd className={typeof value === 'number' || typeof value === 'string' && /^[−+$]?\d[\d,.% −+$]*$/.test(value) ? 'market-math-number' : undefined}>{value}
      </dd>
    </div>)}
  </dl>;
}
function MathLine({ children }: { children: ReactNode }) {
return <code className="market-math-equation">{children}
  </code>;
}
function IntrinsicTerms({ value }: { value: SigilQuoteCalculation }) {
  const [result, setResult] = useState<ReturnType<typeof inspectMarketSigil> | null>(null), [failed, setFailed] = useState(false);
  useEffect(() => { let active = true; setResult(null); setFailed(false); void readIntrinsic(value).then(next => { if (active) setResult(next); }, () => { if (active) setFailed(true); }); return () => { active = false; }; }, [value]);
  return result ? <>
    <ol className="market-math-steps">{result.calculation.map(term =>
      <li key={term.id}>
        <strong>{term.label}
        </strong>
        <MathLine>{term.formula}
        </MathLine>
        <pre>{json(term.operands)}
        </pre>
        <span>{term.result} {term.unit}
        </span>
      </li>)}
    </ol>
    <Depth title="USD / Φ quote: every multiplier">{() => <>
      <p>The existing Market quote uses a fixed $100 context, no streak, no prior contribution and no planned hold.</p>
      <MathLine>q(x) = Math.round(x × 1,000,000,000) / 1,000,000,000</MathLine>
      <MathLine>M = q(M_adoption × M_premium × M_moment × sizeMultiplier × M_streak × M_tier × M_choir × M_breath × M_festival × M_milestone)</MathLine>
      <MathLine>Φ / USD = q(basePhiPerUsd × M)</MathLine>
      <MathLine>USD / Φ = q(1 / (Φ / USD))</MathLine>
      <Fields values={{ 'Issuance multiplier': String(result.quote.issuanceMultiplier), 'Φ / USD': String(result.quote.phiPerUsd), 'USD / Φ': String(result.quote.usdPerPhi) }} />
      <pre>{json({ multipliers: result.quote.multipliers, inputs: result.quoteInputs, quote: result.quote, policy: result.issuancePolicy })}
      </pre>
      <Depth title="Exact quote implementation, constants and helper formulas">{() => <pre>{result.issuanceSource}
      </pre>}
      </Depth>
    </>}
    </Depth>
    <Depth title="Exact valuation inputs, defaults and policy">{() => <pre>{json({ metadata: result.metadata, pulse: result.pulse, appliedDefaults: result.appliedDefaults, policy: result.valuationPolicy, policyChecksum: result.valuationPolicyChecksum })}
    </pre>}
    </Depth>
  </> : <p role="status">{failed ? 'The explanatory trace does not match this displayed quote. The carried value is unchanged.' : 'Opening the retained calculation…'}
  </p>;
}
function SigilMath({ value }: { value: SigilQuoteCalculation }) {
return <>
    <Fields values={{ 'Evaluation Kai pulse': value.pulse.toLocaleString(), 'Intrinsic Φ · unrounded': String(value.intrinsicPhi), 'Quoted Φ': String(value.roundedPhi), 'USD / Φ': String(value.usdPerPhi), 'Unit value': formatMoney(value.usdCents), ...(value.metadata.frequencyHz !== undefined ? { 'Original frequency': `${value.metadata.frequencyHz} Hz` } : { 'Original frequency': 'Not carried; canonical neutral resonance applies' }) }} />
    <MathLine>Quoted Φ = max(0.000001, Math.round(intrinsic Φ × 1,000,000) / 1,000,000)</MathLine>
    <MathLine>Unit cents = Math.round({String(value.roundedPhi)} × {String(value.usdPerPhi)} × 100) = {integer(value.usdCents)}
    </MathLine>
    <Depth title="All intrinsic terms, inputs and quote policy">{() => <IntrinsicTerms value={value} />}
    </Depth>
  </>;
}
function SportsUnitMath({ value }: { value: SportsUnitCalculation }) {
return <>
    <Fields values={{ 'Kai pulse': value.pulse.toLocaleString(), 'Base USD': String(value.base), 'Birth USD': String(value.birth), 'Market USD': String(value.market), 'Score': String(value.score), 'Quote movement': String(value.quoteMove), 'Signal': String(value.signal), 'Wave': String(value.wave), 'Drift': String(value.drift), 'Trend': String(value.trend), 'Pressure': String(value.pressure), 'Carry': String(value.carry), 'Projected unit USD': String(value.value) }} />
    <MathLine>round4(x) = Number(x.toFixed(4)); clamp(x, a, b) = min(b, max(a, x))</MathLine>
    <MathLine>h = 2166136261; for each character in "card:" + seed: h = Math.imul(h XOR charCode, 16777619); hash = h &gt;&gt;&gt; 0</MathLine>
    <MathLine>signal = (hash % 1,000,000) / 1,000,000</MathLine>
    <MathLine>wave = (sin((pulse + signal × 987) × 0.19) + 1) / 2</MathLine>
    <MathLine>drift = (sin((pulse + signal × 421) × 0.047) + 1) / 2</MathLine>
    <MathLine>trend = (sin((pulse + signal × 193) × 0.083) + 1) / 2</MathLine>
    <MathLine>pressure = round4(base × clamp((market − base) / base, 0, 0.18) × 0.22)</MathLine>
    <MathLine>carry = base × (0.001 + quoteMove × 0.008 + wave × 0.0038 + drift × 0.0014 + trend × 0.0011 + clamp(max(0, score) × 0.0012, 0, 0.018) + clamp(max(0, base − birth) / base, 0, 0.12) × 0.028) + pressure</MathLine>
    <MathLine>unit USD = round4(base + round4(max(0.0001, carry)))</MathLine>
    <Depth title="Exact model inputs">{() => <pre>{json(value)}
    </pre>}
    </Depth>
  </>;
}
function SportsMath({ value }: { value: SportsQuoteCalculation }) {
  const [limit, setLimit] = useState(24);
  return <>
    <Fields values={{ 'Unrounded aggregate USD': String(value.unroundedUsd), 'Rounded aggregate USD': String(value.roundedUsd), 'Quote movement': String(value.quoteMove) }} />{value.copies ? <>
      <MathLine>Aggregate USD = Number((Σ copy values in recorded order).toFixed(4))</MathLine>
      <p>Each sealed copy contributes its own value once.</p>{value.copies.slice(0, limit).map(copy =>
        <Depth key={copy.collectibleId} title={<>{copy.collectibleId}
          <span>{String(copy.valueUsd)} USD</span>
        </>}>{() => <>
          <Fields values={{ 'Claim': copy.claimHash, 'Sealed': copy.sealedAt, 'Birth USD': String(copy.birthUsd), 'Applied branch': copy.branch, 'Copy USD': String(copy.valueUsd) }} />{copy.branch === 'before-seal' ? <p>This copy contributes zero before its seal.</p> : copy.unit ? <>
            <MathLine>Copy USD = Number(max(0, projected unit USD).toFixed(2))</MathLine>
            <SportsUnitMath value={copy.unit} />
          </> : <>
            <p>The last applicable recorded value is retained. If no later record applies, the opening value is used.</p>{copy.observation && <pre>{json(copy.observation)}
            </pre>}
          </>}
        </>}
        </Depth>)}{limit < value.copies.length && <button className="text-button" onClick={() => setLimit(previous => previous + 24)}>Show next {Math.min(24, value.copies.length - limit)} copies</button>}
    </> : <>
      <MathLine>Aggregate USD = Number((proofTotalValueUsd × unit USD / baseUsdValue).toFixed(4))</MathLine>
      <Fields values={{ 'Proof total USD': String(value.proofTotalValueUsd), 'Base USD': String(value.baseUsdValue) }} />{value.unit ? <SportsUnitMath value={value.unit} /> : <p>A zero base or proof total contributes zero.</p>}
    </>}
    <MathLine>Aggregate cents = Math.round({String(value.roundedUsd)} × 100)</MathLine>
  </>;
}
function AssetMath({ value }: { value: GlobalMarketContribution }) {
  const inventory = value.inventory;
  return <Depth title={<>{value.title}
    <strong>{formatMoney(value.usdCents)}
    </strong>
  </>}>{() => <div data-market-contribution-math={value.id}>
    <Fields values={{ 'Asset': value.assetId, 'Unit value': value.unitPriceUsdCents === null ? 'Not carried' : formatMoney(value.unitPriceUsdCents), 'Contribution': formatMoney(value.usdCents), 'Running total': formatMoney(value.runningTotalUsdCents) }} />{inventory && value.quantityMicro !== null && value.unitPriceUsdCents !== null ? <>
      <MathLine>{inventory.family === 'generic' ? `Counted shares = ${formatUnits(inventory.outstandingShareQuantityMicro)} held + ${formatUnits(inventory.availableShareQuantityMicro!)} available = ${formatUnits(value.quantityMicro)}` : `Counted shares = ${formatUnits(value.quantityMicro)} issued`}
      </MathLine>
      <MathLine>Contribution cents = floor(({integer(value.unitPriceUsdCents)} × {integer(value.quantityMicro)} + 500,000) / 1,000,000) = {integer(value.usdCents)}
      </MathLine>
      <p>Share quantities use 1,000,000 microshares per share. Rounding is half up to a USD cent for each asset before summation.</p>
      <Depth title="Share supply and buying capacity">{() => <>
        <Fields values={{ 'Quantity record · Kai µPulse': inventory.observedAtKaiUPulse, 'Outstanding shares': formatUnits(inventory.outstandingShareQuantityMicro), [inventory.family === 'native' ? 'Offered shares · already in supply' : 'Available shares']: inventory.availableShareQuantityMicro === null ? 'Not carried' : formatUnits(inventory.availableShareQuantityMicro) }} />{inventory.family === 'generic' ? <>
          <MathLine>Outstanding = {formatUnits(inventory.positionsMicro!)} in accounts / Vaults + {formatUnits(inventory.certificatesMicro!)} in live certificates</MathLine>
          <p>Reserved purchases ({formatUnits(inventory.reservedBuyMicro!)} shares) are not added to outstanding supply.</p>{inventory.capacity && <>
            <MathLine>Headroom cents = max(0, {integer(inventory.capacity.hardCapUsdCents)} hard cap − {integer(inventory.capacity.openInterestUsdCents)} open interest)</MathLine>
            <MathLine>Available microshares = floor(headroom cents × 1,000,000 / {integer(inventory.capacity.askPriceUsdCents)} ask cents) = {integer(inventory.availableShareQuantityMicro!)}
            </MathLine>
            <MathLine>Per-purchase microshares = floor(min(headroom cents, {integer(inventory.capacity.maxSingleTradeUsdCents)}) × 1,000,000 / ask cents)</MathLine>{inventory.maxPurchaseShareQuantityMicro != null && <p>Carried per-purchase limit: {formatUnits(inventory.maxPurchaseShareQuantityMicro)} shares.</p>}
          </>}
        </> : <p>Open sell offers partition the same issued supply and are already included once.</p>}
        <Depth title="Exact quantity operands and source identifiers">{() => <pre>{json(inventory)}
        </pre>}
        </Depth>
      </>}
      </Depth>
    </> : value.basis === 'unit-times-copies' ? <MathLine>Contribution cents = {integer(value.unitPriceUsdCents!)} × {value.copies} copies = {integer(value.usdCents)}
    </MathLine> : !value.valuation && <p>Recorded aggregate: {formatMoney(value.usdCents)} for {value.copies} copies. Individual copies may have different values, so this aggregate is not multiplied by circulation again.</p>}
    {value.valuation && <Depth title="Unit value and native valuation math">{() => value.valuation!.kind === 'sigil' ? <SigilMath value={value.valuation as SigilQuoteCalculation} /> : <SportsMath value={value.valuation as SportsQuoteCalculation} />}
    </Depth>}
    <a className="market-math-source" href={'/asset/' + encodeURIComponent(value.id) + '/'}>View asset &amp; original source<ArrowUpRight size={12} />
    </a>
  </div>}
  </Depth>;
}
function Assets({ calculation }: { calculation: GlobalMarketCalculation }) {
const [limit, setLimit] = useState(24); return <>
    <p>Each canonical asset contributes once, in the same order used by the chart total.</p>{calculation.assets.slice(0, limit).map(value =>
      <div key={value.id} data-market-contribution={value.id}>
        <AssetMath value={value} />
      </div>)}{limit < calculation.assets.length && <button className="text-button" onClick={() => setLimit(previous => previous + 24)}>Show next {Math.min(24, calculation.assets.length - limit)} assets</button>}
  </>;
}
function ChartPoints({ points }: { points: CapitalizationPoint[] }) {
  const [limit, setLimit] = useState(48);
  return <>
    <ol className="market-math-points">{points.slice(0, limit).map(point =>
      <li key={point.pulse}>
        <span>☤KAI {point.pulse.toLocaleString()}</span>
        <strong>{formatMoney(point.usdCents)}</strong>
        <code>{point.usdCents} cents</code>
      </li>)}
    </ol>
    {limit < points.length && <button className="text-button" onClick={() => setLimit(previous => previous + 48)}>Show next {Math.min(48, points.length - limit)} points</button>}
  </>;
}
type Source = { serverPulse: number; proofObjectHash: string; shareCapitalization?: { usdCents: string; covered: number; listed: number } };
export function MarketCalculationDetails({ source, points, change, calculation, inspect }: { source: Source; points: CapitalizationPoint[]; change: ReturnType<typeof chartChange> | null; calculation?: GlobalMarketCalculation | null; inspect?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false), held = marketCalculationMatches(calculation, source) ? calculation : null;
  useEffect(() => { if (!open) return; inspect?.(true); return () => inspect?.(false); }, [open, inspect]);
  const first = points[0], last = points.at(-1), cap = source.shareCapitalization;
  return <details className="market-cap-math" open={open}>
    <summary onClick={event => { event.preventDefault(); setOpen(value => !value); }}>
      <span>Exact market-cap calculation</span>
      <ChevronRight size={13} aria-hidden="true" />
    </summary>{open && <div>
      <Fields values={{ 'Global Market Cap': cap ? formatMoney(cap.usdCents) : 'Not carried', 'Evaluation Kai pulse': source.serverPulse.toLocaleString(), 'Assets included': cap ? `${cap.covered} of ${cap.listed}` : 'Not carried' }} />
      <MathLine>Global cents = Σ each included asset’s contribution cents</MathLine>{cap && cap.listed > cap.covered && <p>{cap.listed - cap.covered} asset{cap.listed - cap.covered === 1 ? '' : 's'} outside this total until its quantity and value records are available.</p>}
      {held ? <>
        <Depth title="Assets counted once">{() => <Assets calculation={held} />}
        </Depth>{held.quoteMovement && <Depth title="Quote movement used by collectible models">{() => <>
          <Fields values={{ 'Current USD / Φ': String(held.quoteMovement!.currentUsdPerPhi), 'Previous USD / Φ': String(held.quoteMovement!.previousUsdPerPhi), 'Relative movement': String(held.quoteMovement!.movement) }} />
          <MathLine>Quote movement = abs(current USD / Φ − previous USD / Φ) / previous USD / Φ</MathLine>
          <p>The rates use the same public quote protocol at the current pulse and max(0, pulse − 1), with the canonical empty cashflow context.</p>
        </>}
        </Depth>}
      </> : <p>Exact asset operands accompany the completed chart publication. The displayed total is retained.</p>}
      {first && last && <Depth title="Selected-period change">{() => <>
        <Fields values={{ 'Opening · USD cents': integer(first.usdCents), 'Closing · USD cents': integer(last.usdCents), 'Opening Kai pulse': first.pulse.toLocaleString(), 'Closing Kai pulse': last.pulse.toLocaleString() }} />{change && <>
          <MathLine>Δ cents = {integer(last.usdCents)} − {integer(first.usdCents)} = {integer(change.deltaCents)}
          </MathLine>
          <MathLine>Percentage = Number((Δ cents × 1,000,000n) / opening cents) / 10,000</MathLine>
          <p>{change.percent === null ? 'An opening value of zero has no defined percentage.' : `The integer division truncates toward zero. The chart displays ${change.percent.toFixed(2)}%.`}
          </p>
        </>}
        <Depth title="Exact points already displayed by this chart">{() => <ChartPoints points={points} />}
        </Depth>
      </>}
      </Depth>}
      <Depth title="Calculation source and numerical precision">{() => <>
        <Fields values={{ 'Public source SHA-256': source.proofObjectHash, ...(held ? { 'Capture': held.generatedAt } : {}) }} />
        <p>Unit quotes preserve the existing binary64 multiplication and Math.round order. Microshare multiplication and the final sum use integers. Recorded chart amounts and completed transactions are unchanged.</p>
        <p>This panel presents the chart’s public calculation. Inspect the Original separately for its enclosing proof and ownership.</p>
      </>}
      </Depth>
    </div>}
  </details>;
}
