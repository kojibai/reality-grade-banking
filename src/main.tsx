import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/tokens.css';
import './styles/app.css';
import './styles/features.css';

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);
if (import.meta.env.PROD && 'serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Offline shell registration unavailable:', error));
