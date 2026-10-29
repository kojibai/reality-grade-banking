import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {PublicExplorer} from './PublicExplorer';
import {profilePageUsername} from '../receiz/public-profile';
import {startProfileDocumentRuntime} from './profile-document-entry';
import '../styles/tokens.css';
import '../styles/app.css';
import '../styles/features.css';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';
function PublicExplorerRoot(){return <PublicExplorer active={usePublicRuntimeActive('explore')}/>;}
const start=()=>createRoot(publicRuntimeRoot('explore'),{identifierPrefix:'public-explore-'}).render(<StrictMode><PublicExplorerRoot/></StrictMode>);
if(profilePageUsername(location.pathname))startProfileDocumentRuntime(start);else startPublicDocumentRuntime('explore',start);
