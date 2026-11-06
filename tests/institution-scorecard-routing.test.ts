// @vitest-environment happy-dom
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
import {publicPage} from '../scripts/public-page-metadata.mjs';
// @ts-expect-error Existing public template is authored as JavaScript without declarations.
import {learningDirectoryPage} from '../scripts/learn-template.mjs';
import {siteFooterHtml} from '../scripts/site-footer.mjs';
import {profilePageUsername,profilePagePath} from '../src/receiz/public-profile';

it('exposes the receiving register from guides, institution guidance and shared footer with canonical metadata',()=>{
 const path='/registry/';
 expect(publicPage(path)?.id).toBe('institution-scorecard');
 expect(publicPage(path+'index.html')?.path).toBe(path);
 const directory=new DOMParser().parseFromString(learningDirectoryPage(),'text/html');
 expect(directory.querySelector('a[href="'+path+'"]')).not.toBeNull();
 const footer=new DOMParser().parseFromString(siteFooterHtml('/institutions/'),'text/html');
 expect(footer.querySelector('a[href="'+path+'"]')?.textContent).toBe('Conformance register');
 expect(publicPage('/institutions/scorecard/')?.path).toBe(path);
 expect(profilePageUsername(path)).toBeNull();
 expect(profilePagePath('registry')).toBe('/u/registry/');
});
it('serves both scorecard entrances as the static document without altering the static account entrance',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8'));
 const destination=(path:string)=>config.rewrites.find((entry:{source:string})=>entry.source===path)?.destination;
 for(const path of ['/registry','/registry/','/institutions/scorecard','/institutions/scorecard/'])expect(destination(path)).toBe('/api/registry?document=1');
 expect(destination('/')).toBe('/__bank_static_entry/bank/index.html');
});
