import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import {registerBankWorker} from './pwa/updates';
import './styles/tokens.css';
import './styles/app.css';
import './styles/features.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) registerBankWorker(navigator.serviceWorker);
