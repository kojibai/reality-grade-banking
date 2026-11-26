import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Coins, Gift, ImagePlus, Tag, Ticket, LockKeyhole, SlidersHorizontal, Vote, X } from 'lucide-react';
import { formatMoney, formatUnits, parseAmount } from '../../core/money';
import { microPulsesSinceGenesis } from '../../../native/receiz/app/utils/kai_pulse';
import { AmountInput } from '../../components/AmountInput';
import { CurrencyMark } from '../../components/CurrencyMark';
import { InlineOpening } from '../../components/InlineOpening';
import { verifyNativeAssetSource, type NativeAssetPacket } from '../../receiz/native-asset';
import { assetHex } from '../../receiz/native-asset-protocol';
import type { OpenIdentity } from '../../receiz/native-identity';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { validateAssetDefinition } from '../../receiz/asset-definition';
import type { AssetComposerDraft } from '../../receiz/asset-composer';
import { inspectNativeCurrencyPolicy, nativeCurrencyLaunch, nativeCurrencyPresets, nativeCurrencyPrice, type NativeCurrencyPreset } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { NativeOperation } from '../account/NativeOperation';
import type { CurrencyVotingContext } from '../voting/VotingBoard';
import { currencyPresets } from '../../receiz/currency-presets';
import './asset-studio.css';
import './issue-currency.css';

const presetIcons = { currency: Coins, 'service-credit': Ticket, coupon: Tag, rewards: Gift };
const VotingBoard = lazy(() => import('../voting/VotingBoard').then(module => ({ default: module.VotingBoard })));

function salesDateToKai(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw Error('Enter a valid sales date and time.');
  const kai = microPulsesSinceGenesis(date);
  if (kai <= 0n || kai > BigInt(Number.MAX_SAFE_INTEGER)) throw Error('Enter a sales date within the supported calendar.');
  return kai.toString();
}

export function IssueCurrency({ identity, onRefresh }: { identity: OpenIdentity; onRefresh(): void }) {
  const [step, setStep] = useState<'details' | 'terms'>('details');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [preset, setPreset] = useState<NativeCurrencyPreset>('currency');
  const [units, setUnits] = useState('');
  const [creatorUnits, setCreatorUnits] = useState('');
  const [seed, setSeed] = useState('');
  const [price, setPrice] = useState('');
  const [issuerControls, setIssuerControls] = useState(false);
  const [fractionalCredits, setFractionalCredits] = useState(false);
  const [salesStart, setSalesStart] = useState('');
  const [salesEnd, setSalesEnd] = useState('');
  const [description, setDescription] = useState('');
  const [artwork, setArtwork] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState<{ file: File; url: string } | null>(null);
  const [issueSource, setIssueSource] = useState<NativeAssetPacket | null>(null);
  const [governance, setGovernance] = useState<{ name: string; code: string; accountUid: string; currency: CurrencyVotingContext } | null>(null);
  const [openingGovernance, setOpeningGovernance] = useState(false);
  const [governanceError, setGovernanceError] = useState('');
  const governanceButton = useRef<HTMLButtonElement>(null);
  const returningFromGovernance = useRef(false);
  const governanceHeading = useRef<HTMLHeadingElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const changedStep = useRef(false);
  const controlGroup = useId();

  useEffect(() => {
    if (!artwork) return;
    const url = URL.createObjectURL(artwork);
    setArtworkPreview({ file: artwork, url });
    return () => URL.revokeObjectURL(url);
  }, [artwork]);

  useEffect(() => {
    if (changedStep.current) stepHeading.current?.focus();
  }, [step]);

  useEffect(() => {
    if (governance) governanceHeading.current?.focus();
    else if (returningFromGovernance.current) { returningFromGovernance.current = false; governanceButton.current?.focus(); }
  }, [governance]);

  const pooled = creatorUnits.trim() !== '' && !/^0+$/u.test(creatorUnits.trim());
  const canIssueFractionalCredits = !pooled && issuerControls && preset === 'service-credit';
  const quantityIncrementMicro = canIssueFractionalCredits && fractionalCredits ? '1000' : undefined;
  const countsEntered = /^\d+$/u.test(units.trim()) && /^\d*$/u.test(creatorUnits.trim());
  const marketUnits = countsEntered ? BigInt(units.trim()) - BigInt(creatorUnits.trim() || '0') : null;
  const marketShort = marketUnits !== null && pooled && marketUnits < 2n;
  let openingPrice: string | null = null;
  if (pooled && marketUnits !== null && !marketShort) {
    try {
      const cents = BigInt(bankOperationDollars(seed)) / marketUnits;
      openingPrice = formatMoney((cents > 0n ? cents : 1n).toString());
    } catch { /* The seed amount is still being entered. */ }
  }

  async function openGovernance() {
    if (!issueSource || openingGovernance) return;
    setOpeningGovernance(true);
    setGovernanceError('');
    try {
      const { receipt } = await verifyNativeAssetSource(issueSource);
      if (receipt.schema !== 'receiz.bank.native-asset-receipt.v1' || receipt.review.request.kind !== 'issue-currency'
        || receipt.review.request.actorReceizId !== identity.binding.artifactOwnerReceizId) throw new Error('CURRENCY_ISSUE_SOURCE_MISMATCH');
      const { id, currency } = receipt.assetAfter;
      if (!assetHex(id) || !currency?.policy.issuerControls || !currency.issuerAccountId) throw new Error('CURRENCY_GOVERNANCE_UNAVAILABLE');
      setGovernance({
        name: receipt.review.request.definition.name, code: receipt.review.request.definition.symbol,
        accountUid: currency.issuerAccountId,
        currency: { assetId: id, priceUsdCentsPerUnit: nativeCurrencyPrice(currency), ...(currency.policy.kind === 'constant-product-pool' ? { poolPricing: true } : {}), salesPaused: currency.salesPaused === true },
      });
    } catch {
      setGovernanceError('Could not open the signed issuance terms. You can open Currency settings from your currency in Market.');
    } finally {
      setOpeningGovernance(false);
    }
  }

  function openStep(value: typeof step) {
    changedStep.current = true;
    setStep(value);
  }

  function definition() {
    if (!/^[1-9]\d{0,17}$/.test(units.trim())) throw Error('Enter a whole number of units.');
    return validateAssetDefinition({ name, symbol, units, description, linkedProofDigest: null });
  }

  const PreviewIcon = presetIcons[preset];
  const previewArtwork = artwork && artworkPreview?.file === artwork ? artworkPreview.url : undefined;
  const currencyPreview = (editable: boolean) => <section className="currency-preview" aria-label="Your currency preview">
    <CurrencyMark preview symbol={symbol} artwork={previewArtwork} placeholder={<PreviewIcon size={28} strokeWidth={1.5} />} />
    <div className="currency-preview-label">
      <small>{currencyPresets[preset].label}{symbol && <> · {symbol}</>}</small>
      <strong>{name.trim() || 'Your currency'}</strong>
      {editable && <div className="currency-creation-artwork">
        <label className="back-link currency-artwork-picker"><ImagePlus size={17} aria-hidden="true" />
          <span>{artwork ? 'Replace artwork' : 'Add artwork'}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
            const file = event.target.files?.[0];
            if (file) setArtwork(file);
            event.target.value = '';
          }} />
        </label>
        {artwork && <button type="button" className="back-link" aria-label="Remove artwork" title="Remove artwork" onClick={() => setArtwork(null)}><X size={17} aria-hidden="true" /></button>}
      </div>}
    </div>
  </section>;

  if (step === 'details') return <div className="currency-creation">
    <form onSubmit={event => {
      event.preventDefault();
      openStep('terms');
    }}>
      <header className="creation-intro">
        <h1 ref={stepHeading} tabIndex={-1} className="sheet-hero">Create a currency.</h1>
      </header>
      {currencyPreview(true)}
      <fieldset className="currency-creation-panel currency-controls">
        <legend>Currency type</legend>
        <div className="currency-control-options">
          {nativeCurrencyPresets.map(value => {
            const Icon = presetIcons[value];
            return <label className="currency-control-option" key={value}>
              <input type="radio" name={controlGroup + '-preset'} value={value} checked={preset === value} onChange={() => setPreset(value)} />
              <Icon size={17} aria-hidden="true" />
              <span><strong>{currencyPresets[value].label}</strong><small>{currencyPresets[value].use}</small></span>
            </label>;
          })}
        </div>
      </fieldset>
      <div className="currency-creation-pair currency-creation-identity">
        <label className="form-field"><span>Name</span>
          <input required pattern={'.*\\S.*'} value={name} maxLength={80} onChange={event => setName(event.target.value)} placeholder="Your currency name" />
        </label>
        <label className="form-field"><span>Currency code</span>
          <input required pattern="[A-Z][A-Z0-9]{1,7}" value={symbol} maxLength={8} onChange={event => setSymbol(event.target.value.toUpperCase())}
            placeholder="CODE" autoCapitalize="characters" aria-describedby={controlGroup + '-code'} />
        </label>
      </div>
      <p className="small-copy currency-creation-hint" id={controlGroup + '-code'}>Use 2–8 letters or numbers, starting with a letter.</p>
      <label className="form-field"><span>What can people use it for?</span>
        <textarea value={description} maxLength={2000} rows={2} onChange={event => setDescription(event.target.value)} placeholder={currencyPresets[preset].placeholder} />
      </label>
      <button className="primary-button">Set currency terms<ArrowRight size={17} /></button>
    </form>
  </div>;

  return <div className="currency-creation">
    <div hidden={!!governance}>
      <NativeOperation identity={identity} title="Currency" confirmLabel="Issue currency" committedTitle="Currency issued." onRefresh={onRefresh}
        inputKey={JSON.stringify([name, symbol, preset, units, creatorUnits, seed, price, description, issuerControls, quantityIncrementMicro, salesStart, salesEnd])}
        reviewDetails={quantityIncrementMicro && <div className="detail-list">
          <div><span>Smallest service-credit amount</span><strong>{formatUnits(quantityIncrementMicro)} {symbol}</strong></div>
        </div>}
        onResult={result => {
          if (result.status === 'committed' && 'nativeAssetSource' in result) setIssueSource(result.nativeAssetSource);
        }}
        input={() => {
          const asset = definition();
          if (!/^\d*$/u.test(creatorUnits.trim())) throw Error('Enter a whole number of units to keep.');
          if (marketShort) throw Error('Leave at least two units in the pool so it can quote a buy.');
          const opensAtKaiUPulse = salesStart ? salesDateToKai(salesStart) : undefined;
          const closesAtKaiUPulse = salesEnd ? salesDateToKai(salesEnd) : undefined;
          if (opensAtKaiUPulse && closesAtKaiUPulse && BigInt(opensAtKaiUPulse) >= BigInt(closesAtKaiUPulse)) {
            throw Error('Enter an end date after the sales start.');
          }
          const salesWindow = opensAtKaiUPulse || closesAtKaiUPulse ? {
            ...(opensAtKaiUPulse ? { opensAtKaiUPulse } : {}), ...(closesAtKaiUPulse ? { closesAtKaiUPulse } : {}),
          } : undefined;
          const common = { preset, ...(issuerControls ? { issuerControls: true } : {}), ...(salesWindow ? { salesWindow } : {}) };
          const policy = inspectNativeCurrencyPolicy(pooled
            ? { ...common, kind: 'constant-product-pool', creatorQuantityMicro: parseAmount(creatorUnits), seedUsdCents: bankOperationDollars(seed) }
            : { ...common, kind: 'fixed-reserve-pool', priceUsdCentsPerUnit: bankOperationDollars(price),
              ...(quantityIncrementMicro ? { quantityIncrementMicro } : {}) });
          nativeCurrencyLaunch(policy, parseAmount(asset.units));
          return { kind: 'issue-currency', definition: asset, policy };
        }}
        operations={async () => {
          const asset = definition();
          const draft: AssetComposerDraft = { definition: asset, title: asset.name, description: asset.description,
            kind: artwork ? 'image' : 'moment', longForm: '',
            files: artwork ? [{ id: 'currency-artwork', role: 'primary', file: artwork }] : [] };
          return (await identity.backedAssetPublication()).operations(draft);
        }}>
        <button type="button" className="back-link" onClick={() => openStep('details')}><ArrowLeft size={16} />Edit currency details</button>
        <header className="creation-intro currency-terms-heading">
          <h1 ref={stepHeading} tabIndex={-1} className="sheet-hero">Set currency terms.</h1>
        </header>
        {currencyPreview(false)}
        <section className="currency-creation-panel" aria-labelledby={controlGroup + '-supply'}>
          <h2 id={controlGroup + '-supply'}>Supply and pricing</h2>
          <div className="currency-creation-pair">
            <label className="form-field"><span>Supply cap</span>
              <div className="amount-input">
                <input value={units} onChange={event => setUnits(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="0" aria-label="Supply cap" />
                <span className="amount-suffix">units</span>
              </div>
            </label>
            <AmountInput label="Units you keep" value={creatorUnits} onChange={setCreatorUnits} suffix="units" />
          </div>
          {marketUnits !== null && marketUnits > 0n && !marketShort && <p className="small-copy">{formatUnits((marketUnits * 1_000_000n).toString())} {marketUnits === 1n ? 'unit goes' : 'units go'} to Market.</p>}
          {marketShort && <p className="small-copy">Leave at least two units in the pool so it can quote a buy.</p>}
          {pooled ? <>
            <AmountInput label="Starting liquidity" value={seed} onChange={setSeed} dollars />
            <p className="small-copy">Your Wallet funds the pool at launch. The ratio of pool funds to units sets the price. Buys raise it and sells lower it.</p>
            {openingPrice && <p className="small-copy">Opening pool quote <strong>{openingPrice}</strong> per unit. Each trade has its own quote.</p>}
          </> : <>
            <AmountInput label="Purchase price per unit" value={price} onChange={setPrice} dollars />
            <p className="small-copy">All units start for sale. Their purchases fund the pool for sell-backs.</p>
          </>}
        </section>
        <details className="currency-creation-panel currency-advanced">
          <summary><SlidersHorizontal size={18} aria-hidden="true" /><span>
            <strong>Advanced terms</strong><small>{issuerControls ? 'Issuer-managed' : 'Fixed terms'}</small>
          </span><ChevronDown size={17} aria-hidden="true" /></summary>
          <fieldset className="currency-controls">
            <legend>{pooled ? 'Sales control' : 'Price and sales control'}</legend>
            <div className="currency-control-options">
              <label className="currency-control-option">
                <input type="radio" name={controlGroup} value="fixed" checked={!issuerControls} onChange={() => setIssuerControls(false)} />
                <LockKeyhole size={17} aria-hidden="true" />
                <span><strong>Fixed terms</strong><small>{pooled ? 'Keep the signed sales terms.' : 'Keep the opening price and sales terms.'}</small></span>
              </label>
              <label className="currency-control-option">
                <input type="radio" name={controlGroup} value="managed" checked={issuerControls} onChange={() => setIssuerControls(true)} />
                <SlidersHorizontal size={17} aria-hidden="true" />
                <span><strong>Issuer-managed</strong><small>{pooled ? 'Pause or resume new sales.' : 'Change the price or pause new sales.'}</small></span>
              </label>
            </div>
          </fieldset>
          {canIssueFractionalCredits && <label className="form-field"><span>Smallest service-credit amount</span>
            <select value={quantityIncrementMicro ?? '1000000'} onChange={event => setFractionalCredits(event.currentTarget.value === '1000')}>
              <option value="1000000">Whole units (1)</option>
              <option value="1000">Thousandths (0.001)</option>
            </select>
          </label>}
          <fieldset className="currency-sales-schedule">
            <legend>Sales schedule</legend>
            <div className="currency-creation-pair">
              <label className="form-field"><span>Sales start</span>
                <input type="datetime-local" value={salesStart} onChange={event => setSalesStart(event.target.value)} />
              </label>
              <label className="form-field"><span>Sales end</span>
                <input type="datetime-local" value={salesEnd} onChange={event => setSalesEnd(event.target.value)} />
              </label>
            </div>
            <p className="small-copy">Set either date in your local time. The schedule applies to new purchases and is fixed at issuance.</p>
          </fieldset>
          <section className="currency-governance-intro" aria-labelledby={controlGroup + '-governance'}>
            <Vote size={20} aria-hidden="true" />
            <div><h2 id={controlGroup + '-governance'}>Community governance</h2>
              <p className="small-copy">{issuerControls ? (pooled ? 'Create a charter after issuance to let members vote on pausing or resuming sales.' : 'Create a charter after issuance to let members vote on price and sales.') : 'Choose Issuer-managed to enable a community charter after issuance.'}</p>
            </div>
          </section>
        </details>
      </NativeOperation>
      {issueSource && issuerControls && <section className="currency-creation-launch" aria-label="Configure currency governance">
        <button ref={governanceButton} type="button" className="primary-button" disabled={openingGovernance} onClick={() => void openGovernance()}>
          <Vote size={17} />{openingGovernance ? 'Opening governance…' : 'Set up voting and governance'}<ArrowRight size={17} />
        </button>
        {governanceError && <p className="error-message" role="status">{governanceError}</p>}
        <p className="small-copy">Open Currency settings in Market to manage sales or link a ratified charter.</p>
      </section>}
    </div>
    {governance && <section className="currency-creation-charter">
      <button type="button" className="back-link" onClick={() => {
        returningFromGovernance.current = true;
        setGovernance(null);
      }}><ArrowLeft size={16} />Back to issuance</button>
      <h1 ref={governanceHeading} tabIndex={-1} className="sheet-hero">{governance.name} · {governance.code}</h1>
      <p className="body-copy">{governance.currency.poolPricing ? 'Define who can vote on pausing and resuming sales. Once founders ratify the charter, link it in Currency settings.' : 'Define who can vote on price and sales. Once founders ratify the charter, link it in Currency settings.'}</p>
      <Suspense fallback={<InlineOpening label="Opening community governance" />}>
        <VotingBoard accountIdentity={identity} accountUid={governance.accountUid} currency={governance.currency} />
      </Suspense>
    </section>}
  </div>;
}
