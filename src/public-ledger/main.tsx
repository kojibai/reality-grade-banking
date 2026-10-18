import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicLedgerApp } from './PublicLedgerApp';
import './public-ledger.css';

createRoot(document.getElementById('root')!).render(<StrictMode><PublicLedgerApp/></StrictMode>);
