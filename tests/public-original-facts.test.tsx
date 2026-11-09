// @vitest-environment happy-dom
import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {IncomingMessage,ServerResponse} from 'node:http';
import captured from './fixtures/created-original-public.json';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parsePublicOriginal} from '../src/receiz/public-profile';
import {publicMarketMiddleware} from '../server/public-market';
import {PublicAssetDetail} from '../src/features/market/PublicAssetDetail';
vi.mock('../src/receiz/market-projection/usePublicAssetPeriods',()=>({usePublicAssetPeriods:()=>null}));
afterEach(()=>vi.unstubAllGlobals());
const original=captured.original,marketId='profile:bjklock:'+original.id;
function thin(hasLongForm=true){return{...structuredClone(original),hasLongForm,longForm:undefined};}
function raw(profileOriginal:unknown){return{id:marketId,receizId:original.id,title:original.assetTitle,summary:original.claim,ownerUsername:'bjklock',ownerDisplayName:captured.profile.displayName,ownerUserId:captured.profile.userId,ownerCreatedAt:captured.profile.createdAt,canonicalHref:'https://receiz.com/bjklock/verified/'+original.id,verifyHref:original.verifyUrl,pulse:original.pulse,createdAt:original.createdAt,valueUsd:original.marketPreview.priceUsd,livePulseSeed:original.marketPreview.livePulseSeed,profileOriginal};}
async function proxy(profileOriginal:unknown){
 const fetcher=vi.fn(async()=>Response.json({ok:true,transport:{generatedAt:'2026-11-04T19:00:00Z',publicMembership:{complete:true,revision:'d'.repeat(64)},wallet:{private:'never-forward'},publicOriginals:[raw(profileOriginal)]}},{headers:{'x-receiz-public-material-revision':'d'.repeat(64)}}));vi.stubGlobal('fetch',fetcher);let status=0,body='';
 await publicMarketMiddleware({method:'GET',url:'/api/bank/public-market/membership?afterPublication='+original.importedSource.reference.artifactSha256,headers:{cookie:'never-forward',authorization:'Bearer never-forward'}}as IncomingMessage,{setHeader:vi.fn(),writeHead:(value:number)=>{status=value;},end:(bytes:Uint8Array)=>{body=new TextDecoder().decode(bytes);}}as unknown as ServerResponse,vi.fn());
 expect(status).toBe(200);return{body,input:JSON.parse(body),fetcher};
}
it('carries the exact target creator and Source provenance through thin public proxy and parsing without copying private custody',async()=>{
 const value=thin(),input={...value,originalCreator:{...value.originalCreator,email:'never-forward',privateKey:'never-forward'},importedSource:{...value.importedSource,privateLocator:'never-forward'},pbiAuthorshipProof:{privateSession:'never-forward'}};
 const result=await proxy(input),item=parsePublicMarket(result.input).items[0];
 expect(item).toMatchObject({id:marketId,assetId:original.id,title:original.assetTitle,ownerUsername:'bjklock',originalDigest:original.importedSource.reference.artifactSha256,originalCreator:{userId:'bjklock.receiz.id',username:'bjklock',displayName:'bjklock'},sourceProvenance:{sourceArtifactSha256:original.importedSource.sourceArtifactSha256,payloadSha256:original.importedSource.payloadSha256,...original.importedSource.sourceIdentity,sourceProofHead:original.importedSource.sourceProofHead},hasLongForm:true,hasPbiSignature:false,authority:'projection-only',canTrade:false});
 expect(item.verifyUrl).toBe(original.verifyUrl);expect(new URL(item.verifyUrl!).searchParams.get('c')).toBe(new URL(original.verifyUrl).searchParams.get('c'));expect(result.body).not.toContain('never-forward');expect(result.body).not.toContain('"text":');expect(result.body).not.toContain('pbiAuthorshipProof');
 expect(result.fetcher).toHaveBeenCalledOnce();const options=result.fetcher.mock.calls[0] as unknown as [URL,RequestInit];expect(options[1]).toMatchObject({credentials:'omit',redirect:'error',cache:'no-store'});expect(JSON.stringify(options[1])).not.toContain('never-forward');
});
it.each([true,false])('preserves explicit reader presence %s without transporting full text',async flag=>{
 const result=await proxy(thin(flag)),item=parsePublicMarket(result.input).items[0];expect(item.hasLongForm).toBe(flag);expect(result.input.transport.publicOriginals[0].profileOriginal.hasLongForm).toBe(flag);expect(result.body).not.toContain('"text":');
 const selected=parsePublicOriginal({ok:true,viewer:{profile:captured.profile,originals:[thin(flag)]}},'bjklock',original.id);expect(selected.hasLongForm).toBe(flag);
});
it('omits a private creator and rejects a different Source association rather than joining facts by display ID alone',async()=>{
 const value=thin(),result=await proxy({...value,originalCreator:{...value.originalCreator,isPrivate:true,email:'never-forward'},importedSource:{...value.importedSource,sourceArtifactSha256:'a'.repeat(64)}}),item=parsePublicMarket(result.input).items[0];
 expect(item.originalCreator).toBeUndefined();expect(item.sourceProvenance).toBeUndefined();expect(item.ownerUsername).toBe('bjklock');expect(item.originalDigest).toBe(original.importedSource.reference.artifactSha256);expect(item.verifyUrl).toBe(original.verifyUrl);expect(result.body).not.toContain('never-forward');
});
it('displays the carried creator separately from owner and retains the full existing proof link',()=>{
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[raw(thin())]}}).items[0],host=document.createElement('div');host.innerHTML=renderToStaticMarkup(<PublicAssetDetail item={item}/>);
 const creator=[...host.querySelectorAll('.detail-list>div')].find(row=>row.querySelector('span')?.textContent==='Creator'),owner=[...host.querySelectorAll('.detail-list>div')].find(row=>row.querySelector('span')?.textContent==='Owner');
 expect(creator?.textContent).toContain('@bjklock');expect(owner?.textContent).toContain('@bjklock');const inspect=[...host.querySelectorAll('a')].find(link=>link.textContent?.includes('Inspect proof'));expect(inspect?.href).toBe(original.verifyUrl);
});
