import {build} from 'esbuild';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {unzipSync} from 'fflate';
import {expect,vi} from 'vitest';
import type {HeldLedgerOriginalReader} from '../../src/receiz/held-ledger-original';
import type {PublicRecord} from '../../src/receiz/public-network';
// Real production verifier and kit exporter with explicit ephemeral fixture
// enrollment roots. Production roots and verification guards are unchanged.
export async function qualifyTransferExportKit(roots:unknown[],record:PublicRecord,reader:HeldLedgerOriginalReader,expected:Uint8Array){
 const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex'),NativeURL=globalThis.URL;
 const built=await build({entryPoints:['institution/proof-verifier/verifier.entry.ts'],bundle:true,format:'iife',globalName:'ReceizOfflineVerifier',platform:'browser',target:'es2022',write:false,minify:true,sourcemap:'external',outfile:'/private/tmp/verifier.js',external:['node:*'],footer:{js:'globalThis.ReceizOfflineVerifier = ReceizOfflineVerifier;'},plugins:[{name:'explicit-fixture-enrollment-roots',setup(p){p.onLoad({filter:/receiz-sdk\/src\/verifier\/roots\.ts$/},()=>({loader:'ts',contents:`export const receizCurrentPinnedSignatureV4Roots=()=>new Map(${JSON.stringify(roots)}.map(root=>[root.kid,root]));export const receizV109PinnedSignatureV4Roots=receizCurrentPinnedSignatureV4Roots;`}));}}]});
 const files:Record<string,Uint8Array>={},text=new TextEncoder(),base='public/proof-verifier/v129/';
 const production=JSON.parse(await readFile(base+'build.json','utf8'));
 for(const name of Object.keys(production.files))files[name]=new Uint8Array(await readFile(base+name));
 for(const file of built.outputFiles)files[file.path.endsWith('.map')?'verifier.js.map':'verifier.js']=file.contents;
 const code=new TextDecoder().decode(files['verifier.js']),url='data:text/javascript;base64,'+Buffer.from(code).toString('base64');
 const verifier=await import(/* @vite-ignore */url).then(()=>globalThis.ReceizOfflineVerifier);
 files['verification-material.json']=text.encode(JSON.stringify(verifier.materials));
 files['verify.html']=text.encode((await readFile('institution/proof-verifier/verify.html','utf8')).replace('<!--BANK_MARK-->','').replace('<script src="verifier.js"></script>',()=>'<script>'+code.replaceAll('</script','<\\/script')+'</script>'));
 files['build.json']=text.encode(JSON.stringify({...production,files:Object.fromEntries(Object.entries(files).map(([name,b])=>[name,{bytes:b.length,sha256:sha(b)}]))}));
 vi.resetModules();vi.doMock('../../src/receiz/offline-proof-build',()=>({offlineProofVerifierDigest:sha(files['verifier.js'])}));
 vi.stubGlobal('location',{origin:'https://bankeiz.com'});
 vi.stubGlobal('URL',class extends NativeURL{constructor(input:string|URL,base?:string|URL){super(input,base);if(this.pathname==='/proof-verifier/v129/verifier.js')return new NativeURL(url);}});
 vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{const name=String(input).split('/').at(-1)!.replace(/\.map\.bin$/,'.map');if(!files[name])throw Error('EXTERNAL_READ_FORBIDDEN');return new Response(new Uint8Array(files[name]));});
 const api=await import('../../src/receiz/ledger-offline-proof'),zip=await api.downloadLedgerEvidence(record,null,reader),entries=unzipSync(zip);
 expect(entries['original.receiz']).toEqual(expected);for(const [name,b]of Object.entries(files))if(name==='build.json')expect(JSON.parse(new TextDecoder().decode(entries[name]))).toEqual(JSON.parse(new TextDecoder().decode(b)));else expect(entries[name]).toEqual(b);
 const directory=await mkdtemp(join(tmpdir(),'bank-transfer-original-kit-'));
 try{
  for(const [name,b]of Object.entries(entries))await writeFile(join(directory,name),b);
  const result=JSON.parse(execFileSync(process.execPath,['verify.mjs','original.receiz'],{cwd:directory,encoding:'utf8'}));
  expect(result.exportedRecord).toBe('transfer-original');expect(result.transferOriginal.transferId).toBe(record.sourceId);expect(result.transferOriginal.checks.receiptDigest).toBe(true);
  const changed=JSON.parse(new TextDecoder().decode(expected));changed.source.message.sealed_original.body='Changed';await writeFile(join(directory,'changed.receiz'),JSON.stringify(changed));
  expect(()=>execFileSync(process.execPath,['verify.mjs','changed.receiz'],{cwd:directory,stdio:'pipe'})).toThrow();
  if(process.env.BANK_TRANSFER_KIT_QUALIFICATION)await writeFile(resolve(process.env.BANK_TRANSFER_KIT_QUALIFICATION),zip);
 }finally{await rm(directory,{recursive:true,force:true});vi.doUnmock('../../src/receiz/offline-proof-build');}
}
