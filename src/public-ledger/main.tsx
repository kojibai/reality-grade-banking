import {readPublicLedgerDocumentSeed,type PublicLedgerDocumentSeed} from '../receiz/public-ledger-document-seed';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import { StrictMode,useEffect,useState } from 'react';
import { createRoot,hydrateRoot } from 'react-dom/client';
import { PublicLedgerApp } from './PublicLedgerApp';
import './public-ledger.css';
import {ReceiptView} from '../features/receipts/ReceiptView';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';

function PublicLedgerRoot({prepared}:{prepared?:PublicLedgerDocumentSeed|null}){
 const [opened,setOpened]=useState(!prepared);useEffect(()=>{setOpened(true);},[]);
 const active=usePublicRuntimeActive('ledger');
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/'?location.href:null);
 useEffect(()=>{const changed=()=>setReceipt(location.pathname==='/receipt/'?location.href:null);addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);addEventListener('receiz-bank:surface',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);removeEventListener('receiz-bank:surface',changed);};},[]);
 const showingReceipt=location.pathname==='/receipt/'&&receipt===location.href;
 return <><div hidden={showingReceipt} inert={showingReceipt}><PublicLedgerApp active={opened&&active&&!showingReceipt} initialSnapshot={prepared?.snapshot} initialHref={prepared?'https://bankeiz.com/'+prepared.path+'/':undefined} initialFilter={prepared?.path==='ledger/proofs'?'proofs':'all'} initialFormat={prepared?{locale:prepared.locale,timeZone:prepared.timeZone}:undefined}/></div>{active&&showingReceipt&&receipt&&document.body.dataset.bankSurface!=='receipt'&&<ReceiptView key={receipt} onBack={()=>history.back()}/>}</>;
}
startPublicDocumentRuntime('ledger',()=>{void(async()=>{const prepared=await readPublicLedgerDocumentSeed(),root=publicRuntimeRoot('ledger');if(!prepared&&document.getElementById('public-ledger-document-seed'))return;const view=<StrictMode><PublicLedgerRoot prepared={prepared}/></StrictMode>;if(prepared)hydrateRoot(root,view,{identifierPrefix:'public-ledger-'});else createRoot(root,{identifierPrefix:'public-ledger-'}).render(view);})();});
