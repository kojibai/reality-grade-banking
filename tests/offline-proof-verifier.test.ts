import {beforeAll,expect,it,vi} from 'vitest';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import type {OfflineProofVerifier} from '../src/receiz/ledger-offline-proof';
let verifier:OfflineProofVerifier;
beforeAll(async()=>{execFileSync(process.execPath,['scripts/build-proof-verifier.mjs'],{stdio:'pipe'});await import(/* @vite-ignore */ pathToFileURL(resolve('public/proof-verifier/v129/verifier.js')).href);verifier=globalThis.ReceizOfflineVerifier;});
it('ships complete corresponding sources, pinned suite keys, public trust roots and no runtime dependency imports',()=>{
 const module=readFileSync('public/proof-verifier/v129/verifier.js','utf8'),map=JSON.parse(readFileSync('public/proof-verifier/v129/verifier.js.map','utf8'));
 const html=readFileSync('public/proof-verifier/v129/verify.html','utf8');expect(html).not.toContain('<script src="verifier.js">');expect((html.match(/<script>/g)??[]).length).toBe(2);expect(html).toContain("'wasm-unsafe-eval'");
 expect(module).not.toMatch(/\b(?:import|require)\s*\(\s*["'](?!node:)/);
 expect(map.sources.length).toBe(map.sourcesContent.length);expect(map.sourcesContent.every((v:unknown)=>typeof v==='string')).toBe(true);
 // Compare the complete 2.8 MB source map byte-for-byte in native code;
 // generic object equality walks millions of Buffer entries on CI workers.
 expect(readFileSync('public/proof-verifier/v129/verifier.js.map.bin').equals(readFileSync('public/proof-verifier/v129/verifier.js.map'))).toBe(true);
 expect(verifier.materials).toMatchObject({sdk:'129.0.0',documentSealVerificationKey:{protocol:'groth16',nPublic:2},kaiSigilVerificationKey:{protocol:'groth16',nPublic:2},signatureV4Roots:expect.arrayContaining([expect.objectContaining({alg:'Ed25519',publicKeyRawB64u:expect.any(String)})])});
});
it('refuses unsigned or changed bytes without consulting any service',async()=>{
 const fetch=vi.spyOn(globalThis,'fetch').mockRejectedValue(Error('NETWORK_FORBIDDEN'));try{
 await expect(verifier.inspectArtifact(new TextEncoder().encode('{"verified":true,"groth16":"real"}'))).rejects.toThrow(/CANONICAL_VERIFICATION_FAILED/);expect(fetch).not.toHaveBeenCalled();
 await expect(verifier.readArtifact(new TextEncoder().encode('{"verified":true}'))).rejects.toThrow(/CANONICAL_VERIFICATION_FAILED/);expect(fetch).not.toHaveBeenCalled();
 }finally{fetch.mockRestore();}
});
it('keeps the existing non-PNG capacity and requires canonical verification for a larger PNG',async()=>{
 const bytes=new Uint8Array(25*1024*1024);
 await expect(verifier.readArtifact(bytes)).rejects.toThrow('PROOF_INSPECTION_CAPACITY');
 bytes.set([137,80,78,71,13,10,26,10]);
 await expect(verifier.readArtifact(bytes)).rejects.toThrow('ORIGINAL_CANONICAL_VERIFICATION_FAILED');
 const oversized=new Uint8Array(32*1024*1024+1);oversized.set([137,80,78,71,13,10,26,10]);
 await expect(verifier.readArtifact(oversized)).rejects.toThrow('PROOF_INSPECTION_CAPACITY');
});
it('distinguishes JCS/SHA256 hash consistency from signed-original verification and refuses changed evidence',async()=>{
 const capsule={v:'KPV-1',upulse:'120000001',pulse:120,chakraDay:'Solar',kaiKlok:'00:00:01',kaiSignature:'a'.repeat(64),phiKey:'public',verifierSlug:'120-a'};
 const canonical=(v:unknown):string=>v&&typeof v==='object'?Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical((v as Record<string,unknown>)[k])).join(',')+'}':JSON.stringify(v);
 const base={proofCapsule:capsule,capsuleHash:await verifier.sha256Hex(canonical(capsule)),verifierUrl:'https://receiz.com/t/example',verifier:'local',verificationVersion:'wallet-ledger-v1',verifiedAtPulse:120,proofHints:{source:'wallet_ledger_v1',eventId:'transfer:one',eventKind:'chat_transfer',createdAt:'2026-10-17T12:00:00Z'}};
 const bundle={...base,bundleHash:await verifier.sha256Hex(canonical(base))};
 expect(await verifier.inspectWalletCapsule(bundle)).toMatchObject({status:'hash-consistent-projection',authentication:'not-established'});
 await expect(verifier.inspectWalletCapsule({...bundle,verifiedAtPulse:121})).rejects.toThrow(/HASH_MISMATCH/);
 await expect(verifier.inspectWalletCapsule({capsuleHash:bundle.capsuleHash,verified:true})).rejects.toThrow(/INCOMPLETE/);
});
