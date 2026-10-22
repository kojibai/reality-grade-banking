import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import suiteBuild from 'virtual:receiz-conformance-suite-build';
import {browserSourceIdentity} from '../src/conformance/provenance';
import {sha256} from '../src/conformance/assessment';
it('binds the lightweight entrance stamp to the full exact source corpus without importing it at runtime',async()=>{
 const browser=await browserSourceIdentity();
 // Vite excludes a glob's own importer. Include that helper too. Read exact
 // disk bytes here because Vitest deliberately stubs CSS module contents.
 const paths=[...browser.inputs.map(input=>input.path),'src/conformance/provenance.ts'].sort();
 const inputs=await Promise.all(paths.map(async path=>({path,sha256:await sha256(new Uint8Array(readFileSync(new URL(`../${path}`,import.meta.url))))})));
 expect(suiteBuild.sourceTreeSha256).toBe(await sha256(new TextEncoder().encode(JSON.stringify(inputs))));
 expect(suiteBuild.inputCount).toBe(inputs.length);
});
