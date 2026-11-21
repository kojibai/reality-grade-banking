import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {assertFrozenAssetPublicationSource,checkFrozenAssetPublication} from '../scripts/check-asset-publication.mjs';
it('ships the exact reproducible native Showcase composition separately from first paint',()=>{
 const manifest=JSON.parse(readFileSync('native/manifest.json','utf8'));
 expect(manifest.assetPublicationInputs?.length).toBeGreaterThan(0);
 const artifact=JSON.parse(readFileSync('public/native/asset-publication.v129.manifest.json','utf8')),bytes=readFileSync('public/native/asset-publication.v129.mjs');
 expect(createHash('sha256').update(bytes).digest('hex')).toBe(artifact.moduleSha256);
 expect(readFileSync('scripts/rebuild-native.mjs','utf8')).toContain('app/lib/profile/showcase/connectedAssetPublication.client.ts');
 expect(manifest.applicationPatches.some((patch:{id:string})=>patch.id==='bankeiz-connected-showcase-publication-v129')).toBe(true);
});
it('opens the shipped publication runtime without a Node process global',()=>{
 const url=pathToFileURL(resolve('public/native/asset-publication.v129.mjs')).href;
 const result=spawnSync(process.execPath,['--input-type=module','-e',`delete globalThis.process; await import(${JSON.stringify(url)});`],{encoding:'utf8',timeout:10000});
 expect(result.status,result.stderr.split('\n').filter(line=>line.length<500).slice(-12).join('\n')).toBe(0);
});

it('keeps the working Original creation and publication choreography frozen at the production build gate',async()=>{
 await expect(checkFrozenAssetPublication()).resolves.toBeUndefined();
 const path='src/features/assets/CreateAsset.tsx';
 const baseline=JSON.parse(readFileSync('tests/fixtures/asset-publication-freeze.json','utf8'));
 const source=readFileSync(path,'utf8');
 const delayedSeal=source.replace('async function create(){','async function create(){await waitForPublicDelivery();');
 expect(delayedSeal).not.toBe(source);
 expect(()=>assertFrozenAssetPublicationSource(path,delayedSeal,baseline.files[path])).toThrow(/BANK_ASSET_PUBLICATION_FROZEN.*#create/);
});
