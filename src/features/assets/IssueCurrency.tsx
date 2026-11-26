import { useState } from 'react';
import { parseAmount } from '../../core/money';
import { AmountInput } from '../../components/AmountInput';
import type { OpenIdentity } from '../../receiz/native-identity';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { validateAssetDefinition } from '../../receiz/asset-definition';
import type { AssetComposerDraft } from '../../receiz/asset-composer';
import { inspectNativeCurrencyPolicy, nativeCurrencyCost } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { NativeOperation } from '../account/NativeOperation';

export function IssueCurrency({ identity, onRefresh }: { identity: OpenIdentity; onRefresh(): void }) {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [units, setUnits] = useState('');
  const [price, setPrice] = useState('');
  const [issuerControls, setIssuerControls] = useState(false);
  const [description, setDescription] = useState('');
  const [artwork, setArtwork] = useState<File | null>(null);
  const [artworkRevision, setArtworkRevision] = useState(0);

  function definition() {
    if (!/^[1-9]\d{0,17}$/.test(units.trim())) throw Error('Enter a whole number of units.');
    return validateAssetDefinition({ name, symbol, units, description, linkedProofDigest: null });
  }

  return <NativeOperation identity={identity} title="currency issue" confirmLabel="Issue currency" onRefresh={onRefresh}
    inputKey={JSON.stringify([name, symbol, units, price, description, artworkRevision, issuerControls])}
    input={() => {
      const asset = definition();
      const policy = inspectNativeCurrencyPolicy({kind:'fixed-reserve-pool',priceUsdCentsPerUnit:bankOperationDollars(price),...(issuerControls?{issuerControls:true}:{})});
      nativeCurrencyCost(policy, BigInt(parseAmount(asset.units)));
      return {kind:'issue-currency',definition:asset,policy};
    }}
    operations={async () => {
      const asset = definition();
      const draft: AssetComposerDraft = { definition: asset, title: asset.name, description: asset.description,
        kind: artwork ? 'image' : 'moment', longForm: '',
        files: artwork ? [{id:'currency-artwork',role:'primary',file:artwork}] : [] };
      return (await identity.backedAssetPublication()).operations(draft);
    }}>
    <h1 className="sheet-hero">Issue a currency.</h1>
    <p className="body-copy">Choose its name, supply cap and purchase price. Issuing publishes the terms and artwork. Purchases fund the pool, and holders can return units for their share of it.</p>
    <label className="form-field"><span>Name</span><input value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label>
    <label className="form-field"><span>Currency code</span><input value={symbol} maxLength={8} onChange={event => setSymbol(event.target.value.toUpperCase())} /></label>
    <AmountInput label="Supply cap" value={units} onChange={setUnits} suffix="units" />
    <AmountInput label="Purchase price per unit" value={price} onChange={setPrice} dollars />
    <label className="form-field"><span>What people can use it for</span><textarea value={description} maxLength={2000} onChange={event => setDescription(event.target.value)} /></label>
    <label className="form-field"><span>Logo image (optional)</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
      setArtwork(event.target.files?.[0] ?? null);
      setArtworkRevision(revision => revision + 1);
    }} /></label>
    <label className="consent-option"><input type="checkbox" checked={issuerControls} onChange={event=>setIssuerControls(event.target.checked)} />
      <span>Allow the issuer to change the price or pause new sales after issuance.</span>
    </label>
    <p className="body-copy small-copy">Issuance gives you zero units and leaves your balance unchanged.</p>
  </NativeOperation>;
}
