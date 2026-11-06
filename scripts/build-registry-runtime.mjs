import {build} from 'esbuild';
import {mkdir,writeFile,readFile,readdir,unlink} from 'node:fs/promises';
import {basename} from 'node:path';
import {learnAssets} from './learn-assets.mjs';
import {institutionScorecardPage} from '../src/content/institution-scorecard-page.mjs';
import socialImages from '../public/social/manifest.json' with {type:'json'};
const outdir='server/registry-runtime';await mkdir(outdir,{recursive:true});
const assets=await learnAssets(),css=await readFile('public/learn/institution-scorecard.css','utf8');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const head=`<!doctype html><html lang="en" class="learn-surface"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(institutionScorecardPage.title)} | Bankeiz</title><meta name="description" content="${escape(institutionScorecardPage.description)}"><meta name="robots" content="index,follow,max-image-preview:large"><link rel="canonical" href="https://bankeiz.com/registry/"><link rel="icon" href="/icon.svg"><link rel="alternate" type="application/json" title="Accepted conformance records" href="/api/bank/registry"><meta property="og:type" content="website"><meta property="og:title" content="${escape(institutionScorecardPage.title)}"><meta property="og:description" content="${escape(institutionScorecardPage.description)}"><meta property="og:url" content="https://bankeiz.com/registry/"><meta property="og:image" content="https://bankeiz.com${socialImages.images['/registry/'].url}"><style>${assets.css}</style><style data-public-page-style="institution-scorecard">${css}</style><script src="${assets.jsUrl}" defer></script></head><body data-bank-surface="learn"><div id="public-learn-root">`;
await writeFile(outdir+'/document-head.html',head);
const result=await build({entryPoints:['server/registry.ts'],outdir,entryNames:'registry',chunkNames:'[name]-[hash]',outExtension:{'.js':'.mjs'},bundle:true,splitting:true,packages:'external',format:'esm',platform:'node',target:'node24',logLevel:'warning',write:false});
const outputs=result.outputFiles.sort((a,b)=>Number(basename(a.path)==='registry.mjs')-Number(basename(b.path)==='registry.mjs'));
for(const file of outputs){const held=await readFile(file.path).catch(error=>{if(error.code!=='ENOENT')throw error;return null;});const bytes=Buffer.from(file.contents);if(!held?.equals(bytes))await writeFile(file.path,bytes);}
const wanted=new Set(outputs.map(file=>basename(file.path)));
for(const name of await readdir(outdir))if(name.endsWith('.mjs')&&!wanted.has(name))await unlink(`${outdir}/${name}`);
console.log('Built Registry proof admission and durable publication runtime.');
