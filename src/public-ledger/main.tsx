import {documentCatalog} from '../observatory/catalog';
import {heldProofCatalog} from '../receiz/usePublicNetwork';
import {publishDiscoveredPublicCatalog} from '../receiz/asset-publication-adoption';
import {openAnalyticsNavigationSeed,type AnalyticsNavigationSeed} from '../observatory/navigation-seed';
import {readPublicLedgerDocumentSeed,type PublicLedgerDocumentSeed} from '../receiz/public-ledger-document-seed';
import {startPublicDocumentRuntime} from '../core/public-document-entry';
import { StrictMode,useEffect,useState } from 'react';
import { createRoot,hydrateRoot,type Root } from 'react-dom/client';
import {flushSync} from 'react-dom';
import type {PublicMarketDocumentSeed} from '../receiz/public-market-document-seed';
import { PublicLedgerApp } from './PublicLedgerApp';
import './public-ledger.css';
import {ReceiptView} from '../features/receipts/ReceiptView';
import {publicRuntimeRoot,usePublicRuntimeActive} from '../core/public-runtime';

function PublicLedgerRoot({prepared,path}:{prepared?:PublicLedgerDocumentSeed|null;path?:string}){
 const [opened,setOpened]=useState(!prepared);useEffect(()=>{setOpened(true);},[]);
 const active=usePublicRuntimeActive('ledger');
 const [receipt,setReceipt]=useState(location.pathname==='/receipt/'?location.href:null);
 useEffect(()=>{const changed=()=>setReceipt(location.pathname==='/receipt/'?location.href:null);addEventListener('popstate',changed);addEventListener('bankeiz:receipt',changed);addEventListener('receiz-bank:surface',changed);return()=>{removeEventListener('popstate',changed);removeEventListener('bankeiz:receipt',changed);removeEventListener('receiz-bank:surface',changed);};},[]);
 const showingReceipt=location.pathname==='/receipt/'&&receipt===location.href;
 return <><div hidden={showingReceipt} inert={showingReceipt}><PublicLedgerApp active={opened&&active&&!showingReceipt} initialDirectory={prepared?.directory} initialSnapshot={prepared?.snapshot} initialHref={prepared?'https://bankeiz.com/'+prepared.path+'/':path?new URL(path,location.origin).href:undefined} initialFilter={prepared?.path==='ledger/proofs'||path==='/ledger/proofs/'?'proofs':'all'} initialFormat={prepared?{locale:prepared.locale,timeZone:prepared.timeZone}:undefined}/></div>{active&&showingReceipt&&receipt&&document.body.dataset.bankSurface!=='receipt'&&<ReceiptView key={receipt} onBack={()=>history.back()}/>}</>;
}
const roots=new WeakMap<HTMLElement,Root>(),preparing=new WeakMap<HTMLElement,Promise<Root|undefined>>();
/** The existing Ledger reader projects the selected public catalog directly.
 * Reuse that reader and its retained history without a second page request. */
export function mountHeldPublicDocument(root:HTMLElement,held:Pick<PublicMarketDocumentSeed,'catalog'|'generation'>,path='/ledger/'){
 if(!roots.has(root)){
  // A cold Ledger can receive the selected catalog before a shared reader
  // exposes it. Preserve an already available successor, including an empty one.
  if(held.catalog.complete&&!heldProofCatalog())publishDiscoveredPublicCatalog(held.catalog);
  flushSync(()=>{const renderer=createRoot(root,{identifierPrefix:'public-ledger-'});roots.set(root,renderer);renderer.render(<StrictMode><PublicLedgerRoot path={path}/></StrictMode>);});
 }
 return roots.get(root)!;
}
export function mountPublicDocument(root=publicRuntimeRoot('ledger')):Root|Promise<Root|undefined>{
 const mounted=roots.get(root);if(mounted)return mounted;
 const pending=preparing.get(root);if(pending)return pending;
 const job=(async()=>{
  const carried=(root as HTMLElement&{analyticsSeed?:AnalyticsNavigationSeed}).analyticsSeed;
  const prepared=await readPublicLedgerDocumentSeed()??(carried?await openAnalyticsNavigationSeed(carried):null);
  if(roots.has(root))return roots.get(root);
  if(!prepared&&document.getElementById('public-ledger-document-seed'))return;
  if(prepared&&!heldProofCatalog()){
   const catalog=documentCatalog(prepared.snapshot,prepared.directory);
   if(catalog?.complete)publishDiscoveredPublicCatalog(catalog);
  }
  const view=<StrictMode><PublicLedgerRoot prepared={prepared}/></StrictMode>,renderer=prepared?hydrateRoot(root,view,{identifierPrefix:'public-ledger-'}):createRoot(root,{identifierPrefix:'public-ledger-'});roots.set(root,renderer);if(!prepared)flushSync(()=>renderer.render(view));return renderer;
 })();preparing.set(root,job);void job.finally(()=>{if(preparing.get(root)===job)preparing.delete(root);}).catch(()=>{});return job;
}
if(document.querySelector('[data-public-runtime="ledger"],#public-ledger-root')||/^\/(?:ledger(?:\/proofs)?|receipt)(?:\/(?:index\.html)?)?$/.test(location.pathname))startPublicDocumentRuntime('ledger',()=>{void Promise.resolve(mountPublicDocument()).catch(()=>{});});
