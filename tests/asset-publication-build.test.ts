import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
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
