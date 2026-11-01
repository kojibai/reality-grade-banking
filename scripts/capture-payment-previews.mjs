// Dedicated build process: DOM globals never touch the app or another renderer.
import {Window} from 'happy-dom';
import {createServer} from 'vite';
import {writeFile} from 'node:fs/promises';
const window=new Window({url:'https://example.invalid/',settings:{disableJavaScriptEvaluation:true,disableCSSFileLoading:true,disableJavaScriptFileLoading:true,disableIframePageLoading:true}});
for(const name of ['window','document','navigator','sessionStorage','localStorage','Event','CustomEvent','HTMLElement','HTMLInputElement','Node','MutationObserver'])Object.defineProperty(globalThis,name,{configurable:true,value:name==='window'?window:window[name]});
for(const name of ['addEventListener','removeEventListener','dispatchEvent'])globalThis[name]=window[name].bind(window);
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.fetch=()=>{throw Error('PAYMENT_PREVIEW_NETWORK_FORBIDDEN');};
const server=await createServer({configFile:false,server:{middlewareMode:true,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]},appType:'custom'});
try{const {capturePaymentExamples}=await server.ssrLoadModule('/src/presentation/PaymentPreview.tsx');await writeFile(process.argv[2],JSON.stringify(await capturePaymentExamples()));}
finally{await server.close();await window.happyDOM.close();}
