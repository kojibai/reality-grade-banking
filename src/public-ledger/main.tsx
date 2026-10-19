import { StrictMode,useEffect,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicLedgerApp } from './PublicLedgerApp';
import './public-ledger.css';
import {ReceiptView} from '../features/receipts/ReceiptView';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';

function PublicLedgerRoot(){
 const active=usePublicRuntimeActive('ledger');
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/'?location.href:null);
 useEffect(()=>{const changed=()=>setReceipt(location.pathname==='/receipt/'?location.href:null);addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);};},[]);
 return <><div hidden={!!receipt} inert={!!receipt}><PublicLedgerApp active={active&&!receipt}/></div>{active&&receipt&&document.body.dataset.bankSurface!=='receipt'&&<ReceiptView key={receipt} onBack={()=>history.back()}/>}</>;
}
createRoot(publicRuntimeRoot('ledger'),{identifierPrefix:'public-ledger-'}).render(<StrictMode><PublicLedgerRoot/></StrictMode>);
