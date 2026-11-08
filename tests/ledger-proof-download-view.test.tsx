// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {afterEach,expect,it,vi} from 'vitest';
import {verifyReceizArtifact} from '@receiz/sdk';
import {LedgerInspector} from '../src/features/ledger/LedgerInspector';
import {ledgerValueForRecord} from '../src/receiz/ledger-value';
import {parsePublicNetworkPage} from '../src/receiz/public-network';
import {retainProofInspection,type ProofInspection} from '../src/receiz/proof-inspection';
Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
const NativeURL=URL;
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();Reflect.deleteProperty(window,'snarkjs');document.body.replaceChildren();});
it('the main download saves the exact held canonical Original instead of a new display JSON',async()=>{
 Object.assign(window,{snarkjs:await import('snarkjs')});
 const bytes=new Uint8Array(readFileSync('public/proofs/sealed-essay.png')),sha=createHash('sha256').update(bytes).digest('hex'),verified=await verifyReceizArtifact(bytes);
 if(verified.status!=='verified-artifact')throw Error('Genuine canonical verification required');
 retainProofInspection({artifactSha256:sha,artifactBytes:bytes.length,verification:verified.verification} as unknown as ProofInspection,bytes,'existing-proof.png');
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'selected-with-held-source',kind:'chat_transfer',proofBundle:{artifactDigest:sha}}]}).records[0];
 const blobs:Blob[]=[],downloads:string[]=[],fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 vi.stubGlobal('URL',class extends NativeURL{static createObjectURL(blob:Blob|MediaSource){blobs.push(blob as Blob);return 'blob:exact-held-proof';}static revokeObjectURL(){}});
 vi.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(function(this:HTMLAnchorElement){downloads.push(this.download);});
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{act(()=>root.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
  await act(async()=>{(host.querySelector('.ledger-inspector-links button[title="Download original proof"]') as HTMLButtonElement).click();});
  await act(async()=>{await vi.waitFor(()=>expect(downloads).toHaveLength(1));});
  expect(downloads).toEqual(['existing-proof.png']);expect(blobs).toHaveLength(1);expect(new Uint8Array(await blobs[0].arrayBuffer())).toEqual(bytes);expect(fetcher).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());}
});
it('does not download a display record when the exact transaction source is missing',async()=>{
 const record=parsePublicNetworkPage('wallet',{ok:true,events:[{id:'hash-capsule-only',kind:'chat_transfer',proofBundle:{bundleHash:'b'.repeat(64),capsuleHash:'c'.repeat(64)}}]}).records[0],fetcher=vi.fn(),download=vi.spyOn(HTMLAnchorElement.prototype,'click');vi.stubGlobal('fetch',fetcher);
 const host=document.createElement('div'),root=createRoot(host);document.body.append(host);
 try{act(()=>root.render(<LedgerInspector record={record} value={ledgerValueForRecord(record)}/>));
  await act(async()=>{(host.querySelector('.ledger-inspector-links button[title="Download original proof"]') as HTMLButtonElement).click();});
  expect(download).not.toHaveBeenCalled();expect(fetcher).not.toHaveBeenCalled();expect(host.querySelector('.ledger-inspector-status')?.textContent).toContain('exact transaction proof is not attached');
 }finally{act(()=>root.unmount());}
});
