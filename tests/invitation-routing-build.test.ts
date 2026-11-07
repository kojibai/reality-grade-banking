import {afterEach,expect,it,vi} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {mkdtemp,mkdir,cp,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import type {Connect,ViteDevServer,PreviewServer} from 'vite';
import {invitationPreviewPlugin} from '../server/invitation-preview-plugin';
// @ts-expect-error The existing static public template is plain ESM.
import {invitationContent} from '../scripts/receiving-page.mjs';
// @ts-expect-error Build scripts are plain ESM.
import {buildInvitationPreview} from '../scripts/build-invitation-preview.mjs';

afterEach(()=>vi.unstubAllGlobals());
const fixture={schema:'bankeiz.receiving-invitation.v1',message:'Review this receiving invitation.',senderName:'Alex Morgan',recipientName:'Jordan Lee'};

it('routes exact invitation captures and their images before generic public page or profile handling',()=>{
 const config=JSON.parse(readFileSync('vercel.json','utf8')) as {rewrites:{source:string;destination:string}[];functions:Record<string,{includeFiles:string}>};
 const routes=[
  ['/invitation/:digest([a-f0-9]{64})/og.png','/api/invitation?digest=:digest&image=1'],
  ['/invitation/:digest([a-f0-9]{64})/','/api/invitation?digest=:digest'],
  ['/invitation/:digest([a-f0-9]{64})','/api/invitation?digest=:digest'],
 ];
 const staticIndex=config.rewrites.findIndex(row=>row.source==='/invitation'),profileIndex=config.rewrites.findIndex(row=>row.source==='/:username([a-z0-9_]{3,24})/');
 for(const [source,destination]of routes){const index=config.rewrites.findIndex(row=>row.source===source);expect(index,source).toBeGreaterThanOrEqual(0);expect(config.rewrites[index]?.destination).toBe(destination);expect(index).toBeLessThan(staticIndex);expect(index).toBeLessThan(profileIndex);}
 for(const path of ['/invitation','/invitation/'])expect(config.rewrites.find(row=>row.source===path)?.destination).toBe('/invitation/index.html');
 expect(config.functions['api/invitation.ts']?.includeFiles).toBe('{dist/invitation/index.html,scripts/social/fonts/*.ttf}');
 for(const entry of Object.values(config.functions))expect(entry.includeFiles?.length??0).toBeLessThanOrEqual(256);
});

it('builds the invitation server before type checking and qualifies its plain Node API graph',()=>{
 const pkg=JSON.parse(readFileSync('package.json','utf8')) as {scripts:{build:string}},build=pkg.scripts.build;
 expect(build).toContain('node scripts/build-invitation-preview.mjs');expect(build.indexOf('node scripts/build-invitation-preview.mjs')).toBeLessThan(build.indexOf('npm run typecheck'));
 expect(readFileSync('api/invitation.ts','utf8')).toContain("import {handleInvitationPreview} from '../server/invitation-runtime/invitation-preview.mjs'");
 expect(readFileSync('server/invitation-runtime/invitation-preview.d.mts','utf8')).toContain('handleInvitationPreview(request:Request):Promise<Response>');
 expect(readFileSync('.gitignore','utf8')).toContain('/server/invitation-runtime/*.mjs');
 const entrypoints=readFileSync('scripts/check-server-entrypoints.mjs','utf8');expect(entrypoints.match(/'invitation'/g)).toHaveLength(2);
 expect(existsSync('scripts/build-invitation-preview.mjs')).toBe(true);
});

it('registers a separate exact invitation preview middleware ahead of generic metadata handling',()=>{
 const vite=readFileSync('vite.config.ts','utf8');expect(vite).toContain("import {invitationPreviewPlugin} from './server/invitation-preview-plugin'");expect(vite.indexOf('invitationPreviewPlugin()')).toBeLessThan(vite.indexOf('publicMetadataPlugin()'));
 expect(existsSync('server/invitation-preview-plugin.ts')).toBe(true);
});

it('leaves generic invitations untouched while serving exact dynamic HTML in dev and preview with no HEAD read',async()=>{
 const body=JSON.stringify(fixture),digest=createHash('sha256').update(body).digest('hex'),fetch=vi.fn(async()=>new Response(body));vi.stubGlobal('fetch',fetch);
 for(const mode of ['dev','preview']as const){
  let middleware!:Connect.NextHandleFunction;const transformIndexHtml=vi.fn(async(_path:string,html:string)=>html),server={transformIndexHtml,middlewares:{use(fn:Connect.NextHandleFunction){middleware=fn;}}},plugin=invitationPreviewPlugin();
  if(mode==='dev'){const configure=plugin.configureServer;if(typeof configure!=='function')throw Error('INVITATION_DEV_REQUIRED');configure.call(undefined as never,server as unknown as ViteDevServer);}
  else{const configure=plugin.configurePreviewServer;if(typeof configure!=='function')throw Error('INVITATION_PREVIEW_REQUIRED');configure.call(undefined as never,server as unknown as PreviewServer);}
  const next=vi.fn(),res={statusCode:0,setHeader:vi.fn(),end:vi.fn()};
  for(const path of ['/invitation/','/invitation','/invitation/bad/','/receiving/','/alex/'])await middleware({url:path,method:'GET'}as Parameters<typeof middleware>[0],res as unknown as Parameters<typeof middleware>[1],next);
  expect(next).toHaveBeenCalledTimes(5);expect(fetch).not.toHaveBeenCalled();expect(res.end).not.toHaveBeenCalled();
  await middleware({url:'/invitation/'+digest+'/og.png',method:'HEAD'}as Parameters<typeof middleware>[0],res as unknown as Parameters<typeof middleware>[1],next);expect(res.statusCode).toBe(200);expect(fetch).not.toHaveBeenCalled();
  if(mode==='dev'){await middleware({url:'/invitation/'+digest+'/',method:'GET'}as Parameters<typeof middleware>[0],res as unknown as Parameters<typeof middleware>[1],next);expect(res.statusCode).toBe(200);expect(String(res.end.mock.calls.at(-1)?.[0])).toContain('Prepared for Jordan Lee');expect(transformIndexHtml).toHaveBeenCalledOnce();expect(fetch).toHaveBeenCalledExactlyOnceWith('https://receiz.com/api/public/display-snapshots/'+digest,expect.objectContaining({credentials:'omit'}));fetch.mockClear();}
 }
});

it('boots its emitted Node graph and renders personalized HTML and a real PNG with one public capture read',async()=>{
 const root=process.cwd(),stage=await mkdtemp(join(tmpdir(),'bank-invitation-preview-'));
 try{
  await buildInvitationPreview(join(stage,'runtime'));await writeFile(join(stage,'package.json'),'{"type":"module"}');await symlink(resolve(root,'node_modules'),join(stage,'node_modules'),'dir');
  await mkdir(join(stage,'dist/invitation'),{recursive:true});await writeFile(join(stage,'dist/invitation/index.html'),`<!doctype html><html><head><title>Invitation</title></head><body>${invitationContent()}<script id="receiz-navigation" type="application/json">{"held":"unchanged"}</script></body></html>`);
  await mkdir(join(stage,'scripts/social'),{recursive:true});await cp(resolve(root,'scripts/social/fonts'),join(stage,'scripts/social/fonts'),{recursive:true});
  const program=`import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const payload=${JSON.stringify(JSON.stringify(fixture))},digest=createHash('sha256').update(payload).digest('hex');let reads=0;
globalThis.fetch=async(url,init)=>{assert.equal(String(url),'https://receiz.com/api/public/display-snapshots/'+digest);assert.equal(init.credentials,'omit');reads++;return new Response(payload);};
const {handleInvitationPreview}=await import('./runtime/invitation-preview.mjs');assert.equal(reads,0);
assert.equal((await handleInvitationPreview(new Request('https://bankeiz.com/api/invitation?digest='+digest,{method:'HEAD'}))).status,200);assert.equal(reads,0);
const response=await handleInvitationPreview(new Request('https://bankeiz.com/invitation/'+digest+'/'));assert.equal(response.status,200);const html=await response.text();assert.ok(html.includes('Prepared for Jordan Lee'));assert.ok(html.includes('From Alex Morgan'));assert.ok(html.includes('id="receiving-invitation-snapshot"'));assert.ok(html.includes('https://bankeiz.com/invitation/'+digest+'/og.png'));assert.equal(reads,1);
const image=await handleInvitationPreview(new Request('https://bankeiz.com/api/invitation?digest='+digest+'&image=1'));assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');const bytes=new Uint8Array(await image.arrayBuffer());assert.deepEqual([...bytes.slice(0,8)],[137,80,78,71,13,10,26,10]);const view=new DataView(bytes.buffer);assert.equal(view.getUint32(16),1730);assert.equal(view.getUint32(20),909);assert.equal(reads,1);console.log('PASS emitted invitation HTML and PNG; one immutable public capture read; no identity, profile or financial calls.');`;
  await writeFile(join(stage,'run.mjs'),program);const result=spawnSync(process.execPath,[join(stage,'run.mjs')],{cwd:stage,encoding:'utf8',timeout:15000});expect(result.error).toBeUndefined();expect(result.status,result.stdout+result.stderr).toBe(0);expect(result.stdout).toContain('PASS emitted invitation HTML and PNG');
 }finally{await rm(stage,{recursive:true,force:true});}
},15000);
