import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, LockKeyhole, SlidersHorizontal, Vote, X } from 'lucide-react';
import { parseAmount } from '../../core/money';
import { AmountInput } from '../../components/AmountInput';
import { InlineOpening } from '../../components/InlineOpening';
import { verifyNativeAssetSource, type NativeAssetPacket } from '../../receiz/native-asset';
import { assetHex } from '../../receiz/native-asset-protocol';
import type { OpenIdentity } from '../../receiz/native-identity';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { validateAssetDefinition } from '../../receiz/asset-definition';
import type { AssetComposerDraft } from '../../receiz/asset-composer';
import { inspectNativeCurrencyPolicy, nativeCurrencyCost } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { NativeOperation } from '../account/NativeOperation';
import type { CurrencyVotingContext } from '../voting/VotingBoard';
import { AssetStudioPreview } from './AssetStudioPreview';
import './asset-studio.css';
import './issue-currency.css';

const VotingBoard = lazy(() => import('../voting/VotingBoard').then(module => ({ default: module.VotingBoard })));

export function IssueCurrency({ identity, onRefresh }: { identity: OpenIdentity; onRefresh(): void }) {
  const [step, setStep] = useState<'details' | 'terms'>('details');
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [units, setUnits] = useState('');
  const [price, setPrice] = useState('');
  const [issuerControls, setIssuerControls] = useState(false);
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
        currency: { assetId: id, priceUsdCentsPerUnit: currency.policy.priceUsdCentsPerUnit, salesPaused: currency.salesPaused === true },
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

  if (step === 'details') return <div className="currency-creation">
    <form onSubmit={event => {
      event.preventDefault();
      openStep('terms');
    }}>
      <header className="creation-intro">
        <h1 ref={stepHeading} tabIndex={-1} className="sheet-hero">Create a currency.</h1>
      </header>
      <AssetStudioPreview title={name} kind={artwork ? 'image' : 'moment'} currencyCode={symbol}
        artwork={artwork && artworkPreview?.file === artwork ? artworkPreview.url : undefined}
        artworkLabel="Selected currency artwork" filename={artwork?.name} />
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
        <textarea value={description} maxLength={2000} rows={2} onChange={event => setDescription(event.target.value)} placeholder="Optional" />
      </label>
      <div className="currency-creation-artwork">
        <label className="back-link currency-artwork-picker"><ImagePlus size={17} aria-hidden="true" />
          <span>{artwork ? 'Replace artwork' : 'Add artwork'}</span>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
            setArtwork(event.target.files?.[0] ?? null);
            event.target.value = '';
          }} />
        </label>
        {artwork && <button type="button" className="back-link" onClick={() => setArtwork(null)}><X size={16} aria-hidden="true" />Remove artwork</button>}
      </div>
      <button className="primary-button">Set currency terms<ArrowRight size={17} /></button>
    </form>
  </div>;

  return <div className="currency-creation">
    <div hidden={!!governance}>
      <NativeOperation identity={identity} title="Currency" confirmLabel="Issue currency" committedTitle="Currency issued." onRefresh={onRefresh}
        inputKey={JSON.stringify([name, symbol, units, price, description, issuerControls])}
        onResult={result => {
          if (result.status === 'committed' && 'nativeAssetSource' in result) setIssueSource(result.nativeAssetSource);
        }}
        input={() => {
          const asset = definition();
          const policy = inspectNativeCurrencyPolicy({ kind: 'fixed-reserve-pool', priceUsdCentsPerUnit: bankOperationDollars(price), ...(issuerControls ? { issuerControls: true } : {}) });
          nativeCurrencyCost(policy, BigInt(parseAmount(asset.units)));
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
          <p className="body-copy">{name.trim()} · {symbol}</p>
        </header>
        <section className="currency-creation-panel" aria-labelledby={controlGroup + '-supply'}>
          <h2 id={controlGroup + '-supply'}>Supply and pricing</h2>
          <div className="currency-creation-pair">
            <label className="form-field"><span>Supply cap</span>
              <div className="amount-input">
                <input value={units} onChange={event => setUnits(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="0" aria-label="Supply cap" />
                <span className="amount-suffix">units</span>
              </div>
            </label>
            <AmountInput label="Purchase price per unit" value={price} onChange={setPrice} dollars />
          </div>
          <p className="small-copy">All units start for sale. You receive 0 units. Purchases fund the pool for redemptions.</p>
        </section>
        <fieldset className="currency-creation-panel currency-controls">
          <legend>Price and sales control</legend>
          <div className="currency-control-options">
            <label className="currency-control-option">
              <input type="radio" name={controlGroup} value="fixed" checked={!issuerControls} onChange={() => setIssuerControls(false)} />
              <LockKeyhole size={17} aria-hidden="true" />
              <span><strong>Fixed terms</strong><small>Keep the opening price and sales terms.</small></span>
            </label>
            <label className="currency-control-option">
              <input type="radio" name={controlGroup} value="managed" checked={issuerControls} onChange={() => setIssuerControls(true)} />
              <SlidersHorizontal size={17} aria-hidden="true" />
              <span><strong>Issuer-managed</strong><small>Change the price or pause new sales.</small></span>
            </label>
          </div>
        </fieldset>
        <section className="currency-creation-panel currency-governance-intro" aria-labelledby={controlGroup + '-governance'}>
          <Vote size={20} aria-hidden="true" />
          <div><h2 id={controlGroup + '-governance'}>Community governance</h2>
            <p className="small-copy">{issuerControls ? 'After issuance, set voting membership and thresholds in a charter. Once founders ratify it, link it to let members vote on price and sales.' : 'Choose Issuer-managed to enable a community charter after issuance.'}</p>
          </div>
        </section>
      </NativeOperation>
      {issueSource && issuerControls && <section className="currency-creation-launch" aria-label="Configure currency governance">
        <button ref={governanceButton} type="button" className="primary-button" disabled={openingGovernance} onClick={() => void openGovernance()}>
          <Vote size={17} />{openingGovernance ? 'Opening governance…' : 'Set up voting and governance'}<ArrowRight size={17} />
        </button>
        {governanceError && <p className="error-message" role="status">{governanceError}</p>}
        <p className="small-copy">Use Currency settings in Market to change the price, pause sales or link a charter after its founders ratify it.</p>
      </section>}
    </div>
    {governance && <section className="currency-creation-charter">
      <button type="button" className="back-link" onClick={() => {
        returningFromGovernance.current = true;
        setGovernance(null);
      }}><ArrowLeft size={16} />Back to issuance</button>
      <h1 ref={governanceHeading} tabIndex={-1} className="sheet-hero">{governance.name} · {governance.code}</h1>
      <p className="body-copy">Create a charter to define who can vote and how votes can change this currency’s price and sales. Once founders ratify it, link it in Currency settings in Market.</p>
      <Suspense fallback={<InlineOpening label="Opening community governance" />}>
        <VotingBoard accountIdentity={identity} accountUid={governance.accountUid} currency={governance.currency} />
      </Suspense>
    </section>}
  </div>;
}
