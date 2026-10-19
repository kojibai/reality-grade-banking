import {createRoot} from 'react-dom/client';
import {LedgerInspector} from '../../src/features/ledger/LedgerInspector';
import {LiveReceive} from '../../src/features/account/LivePayments';
import {parsePublicNetworkPage} from '../../src/receiz/public-network';
import {ledgerValueForRecord} from '../../src/receiz/ledger-value';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/features.css';
const seed=await(await fetch('/receiz-public-market.json')).json(),record=parsePublicNetworkPage('proofs',seed).records.find(row=>row.details?.originalUrl&&row.evidence.artifactDigest)!;
createRoot(document.getElementById('root')!).render(<main style={{maxWidth:640,margin:'30px auto',padding:20,fontFamily:'system-ui'}}><p>Local verification: existing public proof; synthetic Receive identity. No payments.</p><details><summary>Receive · synthetic public ID</summary><LiveReceive identity={{accountUsername:()=> 'klok',username:'default_username',walletReceivingAddress:()=> '10000000-0000-4000-8000-000000000002'} as OpenIdentity}/></details><LedgerInspector record={record} value={ledgerValueForRecord(record)}/></main>);
