import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ConformanceApp from './ConformanceApp';
import './conformance.css';
createRoot(document.getElementById('root')!).render(<StrictMode><ConformanceApp /></StrictMode>);
