import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import ConformanceApp from './ConformanceApp';
import './conformance.css';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
function ConformanceRoot(){return <ConformanceApp activeSurface={usePublicRuntimeActive('conformance')}/>;}
createRoot(publicRuntimeRoot('conformance'),{identifierPrefix:'public-conformance-'}).render(<StrictMode><ConformanceRoot /></StrictMode>);
