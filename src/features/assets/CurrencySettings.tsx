import { lazy, Suspense, useEffect, useState } from 'react';
import { AmountInput } from '../../components/AmountInput';
import { InlineOpening } from '../../components/InlineOpening';
import { formatMoney } from '../../core/money';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { verifyNativeAssetSource } from '../../receiz/native-asset';
import type { OpenIdentity } from '../../receiz/native-identity';
import { nativeCurrencyPrice } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { NativeOperation } from '../account/NativeOperation';
import { CurrencyCharterLink, type CurrencySettingsHead } from './CurrencyCharterLink';

const VotingBoard = lazy(() => import('../voting/VotingBoard').then(module => ({ default: module.VotingBoard })));


export function CurrencySettings({ identity, accountUid, assetId, onRefresh, communityInitiallyOpen = false }: {
  identity: OpenIdentity; accountUid: string; assetId: string; onRefresh(): void; communityInitiallyOpen?: boolean;
}) {
  const [head, setHead] = useState<CurrencySettingsHead | null>(null);
  const [price, setPrice] = useState('');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(communityInitiallyOpen);
  useEffect(() => {
    let active = true;
    void (async () => {
      const publication = await identity.backedAssetPublication();
      const { asset } = await publication.readPublicAsset(assetId);
      if (!active) return;
      if (!asset.currency?.policy.issuerControls) {
        setError('This currency has fixed terms.');
        return;
      }
      setHead({ digest: asset.headSourceSha256, currency: asset.currency });
      setPaused(asset.currency.salesPaused === true);
    })().catch(() => { if (active) setError('Could not open the current signed currency terms.'); });
    return () => { active = false; };
  }, [identity, accountUid, assetId]);
  if (error) return <p role="status">{error}</p>;
  if (!head) return <InlineOpening label="Opening currency settings" />;
  const issuer = head.currency.issuerAccountId === accountUid;
  const pooled = head.currency.policy.kind === 'constant-product-pool';
  const currentPrice = nativeCurrencyPrice(head.currency);
  const charter = head.currency.governanceCharterSha256;
  return <>
  {saved&&<p role="status">Currency settings saved.</p>}
  {issuer&&!charter&&<NativeOperation identity={identity} title="Currency settings" confirmLabel="Save currency settings"
    inputKey={JSON.stringify([head.digest, price, paused])} onRefresh={onRefresh}
    input={() => {
      const newPrice = !pooled && price.trim() ? bankOperationDollars(price) : undefined;
      const changes = {
        ...(newPrice && newPrice !== currentPrice ? { priceUsdCentsPerUnit: newPrice } : {}),
        ...(paused !== head.currency.salesPaused ? { salesPaused: paused } : {}),
      };
      if (!Object.keys(changes).length) throw Error(pooled ? 'Change the sales setting before reviewing.' : 'Change the price or sales setting before reviewing.');
      return { kind: 'manage-currency', assetDigest: head.digest, changes };
    }}
    onResult={async result => {
      if (result.status !== 'committed' || !('nativeAssetSource' in result)) return;
      const { receipt } = await verifyNativeAssetSource(result.nativeAssetSource);
      if (receipt.schema === 'receiz.bank.native-asset-receipt.v1' && receipt.assetAfter.id === assetId && receipt.assetAfter.currency) {
        setPrice(''); setSaved(true);
        setHead({ digest: receipt.assetAfter.sourceSha256, currency: receipt.assetAfter.currency });
      }
    }}>
    <p className="body-copy">{pooled ? 'Current pool quote' : 'Current purchase price'} {formatMoney(currentPrice)} per unit.</p>
    {pooled ? <p className="small-copy">Buys and sells set the price through the pool.</p>
      : <AmountInput label="New purchase price per unit" value={price} onChange={value=>{setPrice(value);setSaved(false);}} dollars />}
    <label className="consent-option"><input type="checkbox" checked={paused} onChange={event => {setPaused(event.target.checked);setSaved(false);}} />
      <span>Pause new sales</span>
    </label>
  </NativeOperation>}
  {(issuer||charter)&&<details className="transaction-proof-details" open={communityOpen} onToggle={event=>setCommunityOpen(event.currentTarget.open)}>
    <summary>Community governance</summary>
    {communityOpen&&<>
      {charter?<p className="body-copy">{pooled ? 'Voting members can pause or resume sales under the charter.' : 'Voting members can change price and sales under the charter.'}</p>
        :<p className="body-copy">Create a charter for this currency. Once the founders ratify it, you can give its members control of the terms it covers.</p>}
      {issuer&&!charter&&<CurrencyCharterLink identity={identity} assetId={assetId} digest={head.digest}
        onRefresh={onRefresh} onLinked={setHead} />}
      <Suspense fallback={<InlineOpening label="Opening community governance" />}>
        <VotingBoard accountIdentity={identity} accountUid={accountUid} currency={{
          assetId, charterDigest:charter, settingsHead:head.currency.governanceSettingsHead,
          priceUsdCentsPerUnit:currentPrice, ...(pooled?{poolPricing:true}:{}), salesPaused:head.currency.salesPaused===true,
          onApplied:asset=>{
            if(asset.currency?.governanceCharterSha256===charter&&asset.currency){
              setHead({digest:asset.headSourceSha256,currency:asset.currency});onRefresh();
            }
          },
        }}/>
      </Suspense>
    </>}
  </details>}
  {!issuer&&!charter&&<p className="body-copy">{pooled ? 'The pool sets prices and the issuer controls new sales.' : 'The issuer sets this currency’s price and sales terms.'}</p>}
  </>;
}
