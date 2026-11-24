import './receiz/android-wallet-hardware';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {registerBankWorker} from './pwa/updates';
import './styles/tokens.css';
import './styles/app.css';
import './styles/features.css';

// The Android launcher fetches the same static Bank entry at a separate URL.
if (location.pathname === '/app/android-launch') {
  history.replaceState(history.state, '', '/' + location.search + location.hash);
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) registerBankWorker(navigator.serviceWorker);
