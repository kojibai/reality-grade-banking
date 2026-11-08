import {PublicDocumentFormatContext,PublicDocumentPulseContext,readPublicFirstFrame,type PublicFirstFrame} from '../core/public-document-format';
import {initialReceiptSnapshot} from '../receiz/receipt-snapshot';
import {readReceiptLink,type LedgerReceipt} from '../receiz/ledger-receipts';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {StrictMode,useEffect,useState} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {ReceiptView} from '../features/receipts/ReceiptView';
import '../styles/tokens.css';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
function ReceiptRoot({receipt,frame}:{receipt?:LedgerReceipt;frame?:PublicFirstFrame}){
 const [initial,setInitial]=useState(!!receipt);useEffect(()=>setInitial(false),[]);
 const active=usePublicRuntimeActive('receipt'),[selection,setSelection]=useState({url:location.href,revision:0});
 useEffect(()=>{const change=(event:Event)=>{if(location.pathname.startsWith('/receipt/'))setSelection(prior=>prior.url===location.href&&event.type!=='bankeiz:receipt'?prior:{url:location.href,revision:prior.revision+1});};addEventListener('popstate',change);addEventListener('bankeiz:receipt',change);addEventListener('receiz-bank:surface',change);return()=>{removeEventListener('popstate',change);removeEventListener('bankeiz:receipt',change);removeEventListener('receiz-bank:surface',change);};},[]);
 return <PublicDocumentFormatContext.Provider value={initial?frame:undefined}><PublicDocumentPulseContext.Provider value={initial?frame?.pulse:undefined}><ReceiptView initialReceipt={initial?receipt:undefined} key={selection.url+':'+selection.revision} active={active} onBack={()=>{if(history.state?.bankReceipt)history.back();else if(document.getElementById('receiz-navigation')){history.pushState(null,'','/#ledger');dispatchEvent(new PopStateEvent('popstate'));}else location.href='/#ledger';}}/></PublicDocumentPulseContext.Provider></PublicDocumentFormatContext.Provider>;
}
startPublicDocumentRuntime('receipt',()=>{const root=publicRuntimeRoot('receipt'),frame=readPublicFirstFrame(root);let receipt:LedgerReceipt|undefined;
 if(frame&&root.hasAttribute('data-public-receipt-rendered'))try{receipt=initialReceiptSnapshot(location.href)??readReceiptLink(location.href);}catch{/* Existing reader handles genuinely missing input. */}
 const view=<StrictMode><ReceiptRoot receipt={receipt} frame={frame??undefined}/></StrictMode>;if(receipt)hydrateRoot(root,view,{identifierPrefix:'public-receipt-'});else createRoot(root,{identifierPrefix:'public-receipt-'}).render(view);
});
