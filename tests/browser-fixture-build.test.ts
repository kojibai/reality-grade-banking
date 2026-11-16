import {expect,it} from 'vitest';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {buildBrowserFixture} from '../scripts/browser-fixture-build.mjs';

it('bundles both actual document font URL imports as byte-exact usable data URLs',async()=>{
 const result=await buildBrowserFixture({entryPoints:['src/receiz/business-document-fonts.ts'],bundle:true,write:false,format:'esm',platform:'browser',logLevel:'silent'});
 const {businessDocumentFontUrls}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].contents).toString('base64'));
 const fonts=['Inter-Regular.ttf','Inter-SemiBold.ttf'];
 expect(businessDocumentFontUrls).toHaveLength(2);
 for(let index=0;index<fonts.length;index++){
  const url=businessDocumentFontUrls[index];expect(url).toMatch(/^data:font\/ttf;base64,/);
  const response=await fetch(url);expect(response.status).toBe(200);
  expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array(await readFile(resolve('scripts/social/fonts',fonts[index]))));
 }
});
it('compiles the actual fresh-owner browser fixture with its existing worker fixture and real inline fonts',async()=>{
 const result=await buildBrowserFixture({entryPoints:['tests/browser/fresh-owner-profile.tsx'],bundle:true,write:false,metafile:true,format:'esm',splitting:true,jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},outdir:resolve('test-results/fresh-owner-profile/fixture'),external:['/notes/*'],plugins:[{name:'fixture-public-url',setup(builder){builder.onResolve({filter:/\?url$/},args=>({path:args.path,namespace:'fixture-url'}));builder.onLoad({filter:/.*/,namespace:'fixture-url'},()=>({contents:'export default "/unused-pdf-worker.mjs";',loader:'js'}));}}],logLevel:'silent'});
 expect(result.outputFiles.some(file=>file.path.endsWith('fresh-owner-profile.js'))).toBe(true);
 const sources=Object.keys(result.metafile!.inputs);
 expect(sources).toContain('src/receiz/business-document-fonts.ts');
 expect(sources).toContain('scripts/social/fonts/Inter-Regular.ttf?url&inline');
 expect(sources).toContain('scripts/social/fonts/Inter-SemiBold.ttf?url&inline');
 expect(result.outputFiles.filter(file=>file.path.endsWith('.js')).some(file=>file.text.includes('data:font/ttf;base64,'))).toBe(true);
});
it('refuses an absent inline font instead of supplying substitute bytes',async()=>{
 await expect(buildBrowserFixture({stdin:{contents:'import font from "./scripts/social/fonts/absent-font.ttf?url&inline";export default font;',resolveDir:process.cwd()},bundle:true,write:false,format:'esm',logLevel:'silent'})).rejects.toThrow(/Could not resolve/);
});
