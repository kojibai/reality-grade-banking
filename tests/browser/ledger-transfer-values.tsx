import {createRoot} from 'react-dom/client';
import {gunzipSync,strFromU8} from 'fflate';
import {LedgerValue} from '../../src/features/ledger/LedgerValue';
import {LedgerInspector} from '../../src/features/ledger/LedgerInspector';
import {indexLedgerValues,ledgerValueForRecord} from '../../src/receiz/ledger-value';
import {ledgerValuationContext,ledgerCurrentAssetValue} from '../../src/receiz/ledger-economy';
import {receizKaiNow} from '@receiz/sdk';
import {parsePublicNetworkCache} from '../../src/receiz/public-network-cache';
import {parseMarketCapSource} from '../../src/receiz/market-projection/source';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
const [source,cache]=await Promise.all([
 fetch('/receiz-public-capitalization.json').then(r=>r.json()).then(parseMarketCapSource),
 fetch('/receiz-public-ledger.json.gz.bin').then(r=>r.arrayBuffer()).then(bytes=>parsePublicNetworkCache(JSON.parse(strFromU8(gunzipSync(new Uint8Array(bytes)))))),
]);
const index=indexLedgerValues(source);
index.evaluationPulse=receizKaiNow().pulse;
const rows=['1a4bae9c-53a4-4bd4-ae30-4b80f2999931','9efdfaf3-b2c4-4189-9ecc-9a809cbb9861','df4c1177-2d04-4834-98e4-b592e758c3b5','452e8619200b37492c65460e60d65818c0a7d39795e3681448aa30fc860dc66b'].map(id=>cache.records.find(row=>row.sourceId===id||row.evidence.entryHash===id)).filter(row=>!!row);
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:640,margin:'30px auto',padding:20}}><h1>Transfer values</h1><p className="body-copy">Existing public records · local inspection</p><div className="rows-surface">{rows.map(record=>{const value=ledgerValueForRecord(record,index);return <details key={record.id} style={{padding:18,borderBottom:'1px solid var(--line)'}}><summary style={{display:'flex',alignItems:'center',gap:12}}><span className="row-copy"><strong>Card transfer</strong><span>{record.time?new Date(record.time).toLocaleString():'Date not supplied'}</span></span><LedgerValue value={value}/></summary><LedgerInspector record={record} value={value} currentValue={ledgerCurrentAssetValue(record,index)} valuation={ledgerValuationContext(record,index)}/></details>;})}</div></main>);
