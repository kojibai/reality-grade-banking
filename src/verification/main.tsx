import {startPublicDocumentRuntime} from '../core/public-document-entry';
import {StrictMode} from 'react';
import {createRoot,hydrateRoot} from 'react-dom/client';
import {publicRuntimeRoot} from '../core/public-runtime';
import {VerifyApp} from './VerifyApp';
export {VerifyApp} from './VerifyApp';
startPublicDocumentRuntime('verify',()=>{const root=publicRuntimeRoot('verify'),rendered=root.hasAttribute('data-public-verify-rendered'),view=<StrictMode><VerifyApp initialDigest={rendered?null:undefined}/></StrictMode>;if(rendered)hydrateRoot(root,view,{identifierPrefix:'public-verify-'});else createRoot(root,{identifierPrefix:'public-verify-'}).render(view);});
