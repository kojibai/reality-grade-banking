import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {PublicExplorer} from './PublicExplorer';
import '../styles/tokens.css';
import '../styles/app.css';
import '../styles/features.css';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
function PublicExplorerRoot(){return <PublicExplorer active={usePublicRuntimeActive('explore')}/>;}
createRoot(publicRuntimeRoot('explore'),{identifierPrefix:'public-explore-'}).render(<StrictMode><PublicExplorerRoot/></StrictMode>);
