import {StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ReceiptView} from '../features/receipts/ReceiptView';
import '../styles/tokens.css';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
function ReceiptRoot(){
 const active=usePublicRuntimeActive('receipt'),[selection,setSelection]=useState({url:location.href,revision:0});
 useEffect(()=>{const change=(event:Event)=>{if(location.pathname==='/receipt/')setSelection(prior=>prior.url===location.href&&event.type!=='bankeiz:receipt'?prior:{url:location.href,revision:prior.revision+1});};addEventListener('popstate',change);addEventListener('bankeiz:receipt',change);addEventListener('receiz-bank:surface',change);return()=>{removeEventListener('popstate',change);removeEventListener('bankeiz:receipt',change);removeEventListener('receiz-bank:surface',change);};},[]);
 return <ReceiptView key={selection.url+':'+selection.revision} active={active} onBack={()=>{if(history.state?.bankReceipt)history.back();else if(document.getElementById('receiz-navigation')){history.pushState(null,'','/#ledger');dispatchEvent(new PopStateEvent('popstate'));}else location.href='/#ledger';}}/>;
}
createRoot(publicRuntimeRoot('receipt'),{identifierPrefix:'public-receipt-'}).render(<StrictMode><ReceiptRoot/></StrictMode>);
