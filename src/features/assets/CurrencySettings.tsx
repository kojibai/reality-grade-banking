import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from 'react';
import { AmountInput } from '../../components/AmountInput';
import { InlineOpening } from '../../components/InlineOpening';
import { formatMoney } from '../../core/money';
import { bankOperationDollars } from '../../receiz/bank-operations';
import { verifyNativeAssetSource } from '../../receiz/native-asset';
import type { OpenIdentity } from '../../receiz/native-identity';
import type { NativeCurrencyState } from '../../../native/receiz/app/lib/wallet/bankNotes/nativeAssetCurrency';
import { NativeOperation } from '../account/NativeOperation';
import { governanceRows, heldGovernanceOriginal, subscribeGovernance, type GovernanceRow } from '../../receiz/governance-directory';
import { retainRatifiedCurrencyCharter } from '../../receiz/currency-governance';
import { charterRatification, ofKind } from '../../receiz/governance-view';

const emptyRows: readonly GovernanceRow[] = [];
const VotingBoard = lazy(() => import('../voting/VotingBoard').then(module => ({ default: module.VotingBoard })));


export function CurrencySettings({ identity, accountUid, assetId, onRefresh, communityInitiallyOpen = false }: {
  identity: OpenIdentity; accountUid: string; assetId: string; onRefresh(): void; communityInitiallyOpen?: boolean;
}) {
  const [head, setHead] = useState<{ digest: string; currency: NativeCurrencyState } | null>(null);
  const [price, setPrice] = useState('');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(communityInitiallyOpen);
  const [selectedCharter, setSelectedCharter] = useState('');
  const [link, setLink] = useState<{governanceCharterSha256: string; governanceEvidenceSha256: string} | null>(null);
  const [linkMessage, setLinkMessage] = useState('');
  const rows = useSyncExternalStore(subscribeGovernance, governanceRows, () => emptyRows);
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
  const charter = head.currency.governanceCharterSha256;
  const choices = ofKind(rows, 'charter').filter(row => row.document.terms.rules.execution?.currency?.assetId === assetId && charterRatification(row, rows).complete);
  async function selectCharter(digest: string) {
    setSelectedCharter(digest); setLink(null); setLinkMessage('');
    const choice = choices.find(row => row.digest === digest);
    if (!choice) return;
    try {setLink(await retainRatifiedCurrencyCharter(identity, choice, rows, heldGovernanceOriginal));}
    catch (error) {setLinkMessage(error instanceof Error ? error.message : 'The charter could not be opened.');}
  }
  return <>
  {saved&&<p role="status">Currency settings saved.</p>}
  {issuer&&!charter&&<NativeOperation identity={identity} title="Currency settings" confirmLabel="Save currency settings"
    inputKey={JSON.stringify([head.digest, price, paused])} onRefresh={onRefresh}
    input={() => {
      const newPrice = price.trim() ? bankOperationDollars(price) : undefined;
      const changes = {
        ...(newPrice && newPrice !== head.currency.policy.priceUsdCentsPerUnit ? { priceUsdCentsPerUnit: newPrice } : {}),
        ...(paused !== head.currency.salesPaused ? { salesPaused: paused } : {}),
      };
      if (!Object.keys(changes).length) throw Error('Change the price or sales setting before reviewing.');
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
    <p className="body-copy">Current purchase price {formatMoney(head.currency.policy.priceUsdCentsPerUnit)} per unit.</p>
    <AmountInput label="New purchase price per unit" value={price} onChange={value=>{setPrice(value);setSaved(false);}} dollars />
    <label className="consent-option"><input type="checkbox" checked={paused} onChange={event => {setPaused(event.target.checked);setSaved(false);}} />
      <span>Pause new sales</span>
    </label>
  </NativeOperation>}
  {(issuer||charter)&&<details className="transaction-proof-details" open={communityOpen} onToggle={event=>setCommunityOpen(event.currentTarget.open)}>
    <summary>Community governance</summary>
    {communityOpen&&<>
      {charter?<p className="body-copy">Voting members can change the price and sales settings within the signed charter’s rules.</p>
        :<p className="body-copy">Create a charter for this currency. Once the founders ratify it, you can give its members control of the terms it covers.</p>}
      {issuer&&!charter&&choices.length>0&&<>
        <label>Ratified charter<select value={selectedCharter} onChange={event=>void selectCharter(event.target.value)}>
          <option value="">Choose a charter</option>{choices.map(row=><option key={row.digest} value={row.digest}>{row.document.terms.rules.name}</option>)}
        </select></label>
        {linkMessage&&<p role="status">{linkMessage}</p>}
        {link&&link.governanceCharterSha256===selectedCharter&&<NativeOperation identity={identity} title="Link community charter" confirmLabel="Link charter"
          inputKey={JSON.stringify([head.digest,link])} input={()=>({kind:'manage-currency',assetDigest:head.digest,changes:link})}
          onRefresh={onRefresh} onResult={async result=>{
            if(result.status!=='committed'||!('nativeAssetSource'in result))return;
            const {receipt}=await verifyNativeAssetSource(result.nativeAssetSource);
            if(receipt.schema==='receiz.bank.native-asset-receipt.v1'&&receipt.assetAfter.id===assetId&&receipt.assetAfter.currency?.governanceCharterSha256===selectedCharter){
              const currency={...receipt.assetAfter.currency,governanceSettingsHead:receipt.assetAfter.sourceSha256};
              setHead({digest:receipt.assetAfter.sourceSha256,currency});
            }
          }}>
          <p className="body-copy">Once linked, the community controls these settings through signed votes. This choice is permanent.</p>
        </NativeOperation>}
      </>}
      <Suspense fallback={<InlineOpening label="Opening community governance" />}>
        <VotingBoard accountIdentity={identity} accountUid={accountUid} currency={{
          assetId, charterDigest:charter, settingsHead:head.currency.governanceSettingsHead,
          priceUsdCentsPerUnit:head.currency.policy.priceUsdCentsPerUnit, salesPaused:head.currency.salesPaused===true,
          onApplied:asset=>{
            if(asset.currency?.governanceCharterSha256===charter&&asset.currency){
              setHead({digest:asset.headSourceSha256,currency:asset.currency});onRefresh();
            }
          },
        }}/>
      </Suspense>
    </>}
  </details>}
  {!issuer&&!charter&&<p className="body-copy">The issuer sets this currency’s price and sales terms.</p>}
  </>;
}
