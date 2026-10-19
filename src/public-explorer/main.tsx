import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {PublicExplorer} from './PublicExplorer';
import '../styles/tokens.css';
import '../styles/app.css';
import '../styles/features.css';
createRoot(document.getElementById('root')!).render(<StrictMode><PublicExplorer/></StrictMode>);
