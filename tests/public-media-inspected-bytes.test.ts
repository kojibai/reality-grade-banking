import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {afterEach,expect,it,vi} from 'vitest';
import {openProofMedia} from '../src/receiz/proof-media';
import {retainProofInspection,retainedProofInspection} from '../src/receiz/proof-inspection';
import type {OfflineProofVerifier} from '../src/receiz/ledger-offline-proof';

// Adapt only the browser runtime loader to its same installed local module.
// Both canonical inspection and media extraction below execute the real guard.
vi.mock('../src/receiz/ledger-offline-proof',()=>({loadOfflineProofVerifier:async()=>{
 const {pathToFileURL}=await import('node:url'),{resolve}=await import('node:path');
 await import(/* @vite-ignore */ pathToFileURL(resolve('public/proof-verifier/v129/verifier.js')).href);
 return globalThis.ReceizOfflineVerifier;
}}));
afterEach(()=>vi.restoreAllMocks());
it('reuses genuinely inspected public bytes, retains their media, and refuses changed bytes under a new read context',async()=>{
 await import(/* @vite-ignore */ pathToFileURL(resolve('public/proof-verifier/v129/verifier.js')).href);
 const verifier:OfflineProofVerifier=globalThis.ReceizOfflineVerifier,bytes=new Uint8Array(await readFile('public/proofs/sealed-essay.png')),digest=createHash('sha256').update(bytes).digest('hex');
 const report=await verifier.inspectArtifact(bytes,'sealed-essay.png');expect(report.artifactSha256).toBe(digest);
 retainProofInspection(report,bytes,'sealed-essay.png',false,true);const fetcher=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('Already held Original must not be downloaded'));
 const source={kind:'public' as const,url:`https://receiz.com/api/proof-material/packages/${digest}/artifact`,digest};
 const media=await openProofMedia(source);expect(media.artifactDigest).toBe(digest);expect(media.files.length).toBeGreaterThan(0);expect(media.files[0].bytes.length).toBeGreaterThan(0);expect(await openProofMedia(source)).toBe(media);expect(fetcher).not.toHaveBeenCalled();
 const entry=retainedProofInspection(digest)!;entry.bytes[entry.bytes.length-1]^=1;
 await expect(openProofMedia({...source,postUrl:'https://receiz.com/v/20261105_1234/ABCDEFGH/123?a=changed&ms=1'})).rejects.toThrow(/verified media|selected proof/);expect(fetcher).not.toHaveBeenCalled();
});
