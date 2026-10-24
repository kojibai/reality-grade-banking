import {readFileSync} from 'node:fs';
import {expect,it,vi} from 'vitest';
import {runInNewContext} from 'node:vm';
it('routes shared Vault originals through the app and retains their standalone native reader for offline use',()=>{
 const deployment=JSON.parse(readFileSync('vercel.json','utf8'));
 for(const source of ['/vault/:vaultId/','/vault/:vaultId'])expect(deployment.rewrites).toContainEqual({source,destination:'/vault/index.html'});
 const shell=readFileSync('scripts/build-offline-shell.mjs','utf8');
 expect(shell).toContain("'/native/vault.v1.mjs'");expect(shell).toContain("'/native/vault.v1.manifest.json'");
 const build=JSON.parse(readFileSync('package.json','utf8')).scripts.build;expect(build).toContain('node scripts/build-vault-runtime.mjs');
 expect(readFileSync('vault/index.html','utf8')).toContain('/src/vault/main.tsx');
 expect(readFileSync('src/vault/main.tsx','utf8')).not.toMatch(/BankApp|useNativeAccount|usePublicMarket|serviceWorker\.register/);
});
it('opens an installed Vault URL offline from the cached app without making a request',async()=>{
 const listeners=new Map<string,(event:any)=>void>(),fetch=vi.fn(()=>{throw Error('Network unavailable');}),match=vi.fn(async()=>new Response('installed Vault shell'));
 const script=readFileSync('src/pwa/sw.template.js','utf8').replaceAll('__CACHE_VERSION__','vault-build').replace('__SHELL_ASSETS__','[]').replace('__RESOURCE_HASHES__','{}').replace('__PAGE_ROUTES__',JSON.stringify({'/':'/index.html'}));
 runInNewContext(script,{URL,Request,Response,fetch,caches:{open:async()=>({match})},self:{location:{origin:'https://bankeiz.com'},addEventListener:(name:string,handler:(event:any)=>void)=>listeners.set(name,handler)}});
 let result:Promise<Response>|undefined;listeners.get('fetch')!({request:{method:'GET',mode:'navigate',url:'https://bankeiz.com/vault/10000000-0000-4000-8000-000000000001/?proof='+('a'.repeat(64))},respondWith:(response:Promise<Response>)=>{result=response;}});
 expect(await(await result)?.text()).toBe('installed Vault shell');expect(fetch).not.toHaveBeenCalled();expect(match).toHaveBeenCalledExactlyOnceWith('/index.html',{ignoreVary:true});
});
