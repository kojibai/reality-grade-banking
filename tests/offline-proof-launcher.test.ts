// @vitest-environment happy-dom
import {readFileSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {afterEach,expect,it,vi} from 'vitest';
import {originalReadLimit,ORIGINAL_PNG_MAX_BYTES} from '../src/receiz/original-capacity';

afterEach(()=>{vi.unstubAllGlobals();document.body.replaceChildren();});
it('lets the Node launcher reach canonical verification for a PNG above24MiB, while retaining the old non-PNG boundary',()=>{
 const directory=mkdtempSync(join(tmpdir(),'bank-png-launcher-'));
 try{writeFileSync(join(directory,'verify.mjs'),readFileSync('institution/proof-verifier/verify.mjs'));
  // Only the local entrypoint policy is under test here. Canonical refusal
  // and valid signed-original reads have separate verifier integration checks.
  writeFileSync(join(directory,'verifier.js'),`globalThis.ReceizOfflineVerifier={pngOriginalMaxBytes:33554432,originalReadCapacity:bytes=>[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b)?33554432:25165824,inspectArtifact:async()=>({artifactSha256:'fixture',canonicalReaderReached:true})};`);
  const bytes=new Uint8Array(25*1024*1024),path=join(directory,'Original.png');bytes.set([137,80,78,71,13,10,26,10]);writeFileSync(path,bytes);
  const png=spawnSync(process.execPath,[join(directory,'verify.mjs'),path,'fixture'],{encoding:'utf8'});expect(png.status).toBe(0);expect(JSON.parse(png.stdout)).toMatchObject({canonicalReaderReached:true});
  bytes[0]=0;writeFileSync(path,bytes);const other=spawnSync(process.execPath,[join(directory,'verify.mjs'),path,'fixture'],{encoding:'utf8'});expect(other.status).toBe(1);expect(other.stderr).toContain('PROOF_INSPECTION_CAPACITY');
 }finally{rmSync(directory,{recursive:true,force:true});}
});
it('uses the same PNG preflight in the standalone HTML launcher before invoking canonical inspection',async()=>{
 const html=readFileSync(resolve('institution/proof-verifier/verify.html'),'utf8');document.body.innerHTML=html.replace(/<script[\s\S]*?<\/script>/g,'');
 const inspect=vi.fn(async()=>({artifactSha256:'fixture',canonicalReaderReached:true}));vi.stubGlobal('ReceizOfflineVerifier',{pngOriginalMaxBytes:ORIGINAL_PNG_MAX_BYTES,originalReadCapacity:(bytes:Uint8Array)=>originalReadLimit(bytes,24*1024*1024),inspectArtifact:inspect});
 const script=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].at(-1)![1];new Function(script)();
 const bytes=new Uint8Array(25*1024*1024);bytes.set([137,80,78,71,13,10,26,10]);const chooser=document.getElementById('file')!;
 Object.defineProperty(chooser,'files',{configurable:true,value:[new File([bytes],'Original.png')]});const button=document.getElementById('inspect')!;
 await button.onclick!.call(button,new PointerEvent('click'));expect(inspect).toHaveBeenCalledOnce();expect(document.getElementById('result')?.textContent).toContain('canonicalReaderReached');
 bytes[0]=0;Object.defineProperty(chooser,'files',{configurable:true,value:[new File([bytes],'Original.png')]});await button.onclick!.call(button,new PointerEvent('click'));expect(inspect).toHaveBeenCalledOnce();expect(document.getElementById('result')?.textContent).toBe('PROOF_INSPECTION_CAPACITY');
});
