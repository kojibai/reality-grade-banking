import { StrictMode,useEffect,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicLedgerApp } from './PublicLedgerApp';
import './public-ledger.css';
import {ReceiptView} from '../features/receipts/ReceiptView';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';

function PublicLedgerRoot(){
 const active=usePublicRuntimeActive('ledger');
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/'?location.href:null);
 useEffect(()=>{const changed=()=>setReceipt(location.pathname==='/receipt/'?location.href:null);addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);addEventListener('receiz-bank:surface',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);removeEventListener('receiz-bank:surface',changed);};},[]);
 const showingReceipt=location.pathname==='/receipt/'&&receipt===location.href;
 return <><div hidden={showingReceipt} inert={showingReceipt}><PublicLedgerApp active={active&&!showingReceipt}/></div>{active&&showingReceipt&&receipt&&document.body.dataset.bankSurface!=='receipt'&&<ReceiptView key={receipt} onBack={()=>history.back()}/>}</>;
}
createRoot(publicRuntimeRoot('ledger'),{identifierPrefix:'public-ledger-'}).render(<StrictMode><PublicLedgerRoot/></StrictMode>);
