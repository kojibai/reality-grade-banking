import {execFileSync} from 'node:child_process';
import {copyFileSync,mkdirSync,mkdtempSync,readFileSync,realpathSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {expect,it} from 'vitest';

it('prepares early profile covers only from object-level PBI metadata while retaining every standalone title',()=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'bank-profile-pbi-index-')));
 try{
  for(const path of ['scripts','public','src/content'])mkdirSync(join(root,path),{recursive:true});
  copyFileSync('scripts/build-asset-title-index.mjs',join(root,'scripts/build-asset-title-index.mjs'));
  const row=(id:string,pbi:Record<string,unknown>)=>({id,receizId:id,ownerUsername:'alexmorgan',profileOriginal:{assetTitle:id,artworkUrl:`/artwork/${id}.png`,media:{originalDownloadSha256Hex:'b'.repeat(64)},...pbi}});
  writeFileSync(join(root,'public/receiz-public-market.json'),JSON.stringify({transport:{publicOriginals:[row('unsigned',{}),row('signed',{hasPbiSignature:true}),row('receipt',{pbiReceiptHash:'a'.repeat(64)}),row('invalid',{pbiReceiptHash:'invalid'})]}}));
  execFileSync(process.execPath,[join(root,'scripts/build-asset-title-index.mjs')],{cwd:root,stdio:'pipe'});
  const output=readFileSync(join(root,'src/content/public-asset-titles.ts'),'utf8');
  const covers=JSON.parse(output.split('export const publicProfileArtwork:Readonly<Record<string,readonly string[]>>=')[1].trim().slice(0,-1));
  expect(covers).toEqual({alexmorgan:['https://receiz.com/artwork/signed.png','https://receiz.com/artwork/receipt.png']});
  const titles=JSON.parse(output.split('export const publicAssetTitles:Readonly<Record<string,readonly [string,string,string]>>=')[1].split(';\n')[0]);
  expect(Object.keys(titles)).toEqual(['unsigned','signed','receipt','invalid']);
 }finally{rmSync(root,{recursive:true,force:true});}
});
