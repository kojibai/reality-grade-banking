import { StrictMode,useEffect,useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicLedgerApp } from './PublicLedgerApp';
import './public-ledger.css';
import {ReceiptView} from '../features/receipts/ReceiptView';

function PublicLedgerRoot(){
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/'?location.href:null);
 useEffect(()=>{const changed=()=>setReceipt(location.pathname==='/receipt/'?location.href:null);addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);};},[]);
 return <><div hidden={!!receipt} inert={!!receipt}><PublicLedgerApp active={!receipt}/></div>{receipt&&<ReceiptView key={receipt} onBack={()=>history.back()}/>}</>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><PublicLedgerRoot/></StrictMode>);
