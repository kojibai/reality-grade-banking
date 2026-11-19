import {useMemo, useState} from 'react';
import {ArrowUpRight, ChevronRight} from 'lucide-react';
import {formatMoney} from '../core/money';
import {ShareInventory} from '../features/market/ShareInventory';
import {profileUsernameLabel} from '../receiz/account-name';
import {AssetProofBack} from '../features/media/AssetProofBack';
import {assetPagePath, retainPublicAsset} from '../receiz/public-asset-page';
import {indexLedgerRelations} from '../receiz/ledger-economy';
import {ledgerRecordTitle} from '../receiz/ledger-payment-records';
import {formatPublicPrice,type PublicMarketItem} from '../receiz/public-market';
import type {PublicRecord} from '../receiz/public-network';
import {ledgerLink} from './activity';

const relations = new WeakMap<readonly PublicRecord[], ReturnType<typeof indexLedgerRelations>>();
const date = new Intl.DateTimeFormat('en-US', {dateStyle:'medium', timeStyle:'short', timeZone:'UTC'});

function assetHistory(item:PublicMarketItem, records:readonly PublicRecord[]) {
  let index = relations.get(records);
  if (!index) {
    index = indexLedgerRelations(records.filter(row => row.authority === 'public-source-projection' && !row.origin));
    relations.set(records, index);
  }
  const linked = new Map<string, PublicRecord>();
  const ids = new Set([item.id, item.assetId, ...(item.sealedCopies ?? []).map(copy => copy.collectibleId)]);
  for (const id of ids) {
    for (const row of index.get('object:'+id) ?? []) linked.set(row.id, row);
  }
  return [...linked.values()].sort((a,b) => (Date.parse(b.time ?? '') || 0) - (Date.parse(a.time ?? '') || 0));
}

export function AssetInspection({item,records}:{item:PublicMarketItem;records:readonly PublicRecord[]}) {
  const linked = useMemo(() => assetHistory(item, records), [item, records]);
  const [limit, setLimit] = useState(8);
  const [showInputs,setShowInputs] = useState(false);
  const multipleOwners = item.category==='sports' && (item.circulationCount??0)>1;
  const owner = profileUsernameLabel(item.ownerUsername,item.ownerReceivingUsername);
  const provenance = item.sourceProvenance;
  const facts = [
    ['Public price', formatPublicPrice(item.priceUsd)],
    ['Price change', item.changePct == null ? null : item.changePct+'%'],
    ['Collectible capitalization', item.capitalizationUsdCents!=null ? formatMoney(item.capitalizationUsdCents) : null],
    ['Circulating collectibles', item.circulationCount?.toLocaleString('en-US')],
    ['Priced collectibles', item.pricedCount?.toLocaleString('en-US')],
    ['Public owner', multipleOwners ? 'See individual issuance records' : owner ? '@'+owner : item.ownerDisplayName],
    ['Original creator', item.originalCreator?.username ? '@'+item.originalCreator.username : item.originalCreator?.displayName],
    ['Sealed (UTC)', multipleOwners ? null : item.sealedAt],
    ['Asset ID', item.assetId],
    ['Original SHA-256', item.originalDigest],
    ['Source proof head', provenance?.sourceProofHead],
    ['Genesis owner', provenance?.genesisOwnerReceizId],
    ['Payload SHA-256', provenance?.payloadSha256],
  ];
  return <section className="obs-asset-inspection" aria-label={'Details for '+item.title}>
    <header className="obs-section-head"><h3>{item.title}</h3><a href={assetPagePath(item.id)} onClick={()=>retainPublicAsset(item)}>Open asset <ArrowUpRight size={15}/></a></header>
    {item.summary && <p>{item.summary}</p>}
    <dl>{facts.map(([label,value]) => value ? <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div> : null)}</dl>
    <ShareInventory item={item}/>
    {(item.livePulseSeed||item.sportsValuation||item.shareInventory||item.chart.length>0)&&<details onToggle={event=>setShowInputs(event.currentTarget.open)}>
      <summary>Valuation inputs and history</summary>
      {showInputs&&<pre>{JSON.stringify({quoteUsd:item.priceUsd,valuationPulse:item.localValuationPulse,proofValuation:item.livePulseSeed,collectibleValuation:item.sportsValuation,shareInventory:item.shareInventory,priceHistory:item.chart,issuances:item.sealedBirths,collectibles:item.sealedCopies},null,2)}</pre>}
    </details>}
    <AssetProofBack item={item}/>
    <h4>Linked ledger records ({linked.length.toLocaleString('en-US')})</h4>
    {!linked.length && <p>No public ledger records in this view reference this asset.</p>}
    {linked.slice(0,limit).map(row=><a className="obs-row" key={row.id} href={ledgerLink(row)}>
      <time>{row.time ? date.format(Date.parse(row.time))+' UTC' : 'Undated'}</time>
      <strong>{ledgerRecordTitle(row)}</strong><span>{row.amountUsdCents == null ? row.source : formatMoney(row.amountUsdCents)}</span><ChevronRight size={15}/>
    </a>)}
    {linked.length > limit && <button type="button" className="obs-more" onClick={()=>setLimit(n=>n+24)}>More records</button>}
  </section>;
}
