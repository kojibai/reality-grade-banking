import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ReceiptView} from '../features/receipts/ReceiptView';
import '../styles/tokens.css';
createRoot(document.getElementById('root')!).render(<StrictMode><ReceiptView onBack={()=>{location.href='/#ledger';}}/></StrictMode>);
