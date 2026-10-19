// Boundary composition with synthetic canonical reads. These bytes and test
// roots do not qualify as real Receiz proofs; canonical fixture checks are separate.
import {beforeEach,expect,it,vi} from 'vitest';
import {Resvg} from '@resvg/resvg-js';
import {receizBase64UrlEncode,sha256ReceizBytes} from '@receiz/sdk';
const native=vi.hoisted(()=>({read:vi.fn()}));
const offline=vi.hoisted(()=>({create:vi.fn(),store:vi.fn(),resources:vi.fn()}));
vi.mock('../src/receiz/public-ledger-native.mjs',()=>({readPublicOriginal:native.read}));
vi.mock('@receiz/sdk/offline',()=>({createReceizOfflineSealer:offline.create,createReceizIndexedDbSealStore:offline.store}));
vi.mock('../src/receiz/proof-resource-continuity',()=>({loadBankProofResources:offline.resources}));
vi.mock('../src/receiz/public-ledger-statement',async original=>{
 const actual=await original<typeof import('../src/receiz/public-ledger-statement')>();
 return {...actual,verifyPublicLedgerStatement:async(value:unknown)=>actual.inspectPublicLedgerStatement(value)};
});
import {inspectPublicLedgerFile,heldPublicLedgerFile} from '../src/receiz/public-ledger-proof';
import {createPublicLedgerCrystal} from '../src/receiz/public-ledger-crystal-image';
import {embedPublicLedgerPng,readPublicLedgerPng} from '../src/receiz/public-ledger-png';
const encode=(value:unknown)=>new TextEncoder().encode(JSON.stringify(value)),hex=(value:string)=>value.repeat(64);
const statement={schema:'receiz.public-action-ledger.v1',domain:'receiz.public-action-ledger.root-signature.v1',issuerRootKid:'test-only',ledgerId:hex('a'),scope:'public-action-history',baseline:'native',financialAdmission:false,sourceBaseline:hex('b'),sourceHead:hex('c'),sourceHistory:[hex('b'),hex('c')],kaiUpulse:'123000000',recordsRoot:hex('d'),records:Array.from({length:3},(_,i)=>({id:`event-${i}`,sequence:i+1,kind:'auth.logout',kaiUpulse:String(100000000+i),entryHash:hex(String(i+1)),previousHash:hex('f'),amountUsdCents:null})),rootSignature:{kid:'test-only',alg:'Ed25519',sig:'a'.repeat(86)}};
const inner=encode({synthetic:'exact inner original'}),otherInner=encode({synthetic:'another exact original'});
const png=(color='#123456')=>new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="${color}"/></svg>`).render().asPng();
const accepted=new Map<string,Uint8Array>();
function withProofMarker(png:Uint8Array){
 const data=new TextEncoder().encode('receiz.proof_bundle\0synthetic-test-marker'),chunk=new Uint8Array(data.length+12),view=new DataView(chunk.buffer);view.setUint32(0,data.length);chunk.set(new TextEncoder().encode('tEXt'),4);chunk.set(data,8);
 let crc=0xffffffff;for(const byte of chunk.subarray(4,-4)){crc^=byte;for(let n=0;n<8;n++)crc=crc&1?0xedb88320^(crc>>>1):crc>>>1;}view.setUint32(chunk.length-4,(crc^0xffffffff)>>>0);
 const out=new Uint8Array(png.length+chunk.length);out.set(png.subarray(0,-12));out.set(chunk,png.length-12);out.set(png.subarray(-12),png.length-12+chunk.length);return out;
}
async function syntheticSeal(bytes:Uint8Array){accepted.set(await sha256ReceizBytes(bytes),bytes.slice());return {artifactBytes:bytes.slice(),filename:'sealed.png',mimeType:'image/png'};}
beforeEach(()=>{
 accepted.clear();native.read.mockReset().mockImplementation(async(bytes:Uint8Array)=>{
  if(bytes.length===inner.length&&bytes.every((v,i)=>v===inner[i]))return {ok:true,verification:{integrity:{ok:true},bundle:{kaiPulseEternal:'123'}},payloadBytes:encode(statement),payloadMimeType:'application/json'};
  if(bytes.length===otherInner.length&&bytes.every((v,i)=>v===otherInner[i]))return {ok:true,verification:{integrity:{ok:true},bundle:{kaiPulseEternal:'123'}},payloadBytes:encode({...statement,sourceHead:hex('9'),sourceHistory:[hex('b'),hex('9')],records:[]}),payloadMimeType:'application/json'};
  const payload=accepted.get(await sha256ReceizBytes(bytes));
  return payload?{ok:true,verification:{integrity:{ok:true},bundle:{kaiPulseEternal:'999'}},payloadBytes:payload.slice(),payloadMimeType:'image/png'}:{ok:false,verification:{integrity:{ok:false}}};
 });
});
async function original(){return inspectPublicLedgerFile({bytes:inner,filename:'public-ledger.receizbundle'});}
it('seals the complete carried source and cold reopens outer image before every inner record, preserving the inner authority digest',async()=>{
 const review=await original(),source=heldPublicLedgerFile(review).source!;let sealedSource:unknown;
 const result=await createPublicLedgerCrystal(review,{render:async()=>png(),seal:async input=>{sealedSource=JSON.parse(new TextDecoder().decode(readPublicLedgerPng(input.bytes)!));return syntheticSeal(input.bytes);}});
 expect(sealedSource).toEqual({kind:'receiz.ledger_proof_bundle',version:'v3',source});
 native.read.mockClear();const reopened=await inspectPublicLedgerFile({bytes:result.bytes.slice(),filename:result.filename});
 expect(reopened.imageSeal).toEqual({status:'verified',version:'v3',artifactSha256:await sha256ReceizBytes(result.bytes)});
 expect(reopened.artifactSha256).toBe(review.artifactSha256);expect(reopened.imageSeal?.artifactSha256).not.toBe(review.artifactSha256);
 expect(reopened.snapshot?.records).toEqual(statement.records);expect(reopened.snapshot?.sourceHead).toBe(statement.sourceHead);
 expect(heldPublicLedgerFile(reopened).source).toEqual(source);expect(heldPublicLedgerFile(reopened).bytes).toEqual(inner);expect(reopened.financialAdmission).toBe(false);
 expect(native.read.mock.calls.map(([bytes])=>bytes)).toEqual([result.bytes,inner]);
});
it('reads v2 only as a legacy unsealed carrier while still independently verifying its inner source',async()=>{
 const source=heldPublicLedgerFile(await original()).source!,bytes=embedPublicLedgerPng(png(),encode({kind:'receiz.ledger_proof_bundle',version:'v2',source}));native.read.mockClear();
 const opened=await inspectPublicLedgerFile({bytes,filename:'legacy.png'});
 expect(opened.imageSeal).toEqual({status:'legacy-unsealed-carrier',version:'v2',artifactSha256:await sha256ReceizBytes(bytes)});
 expect(opened.snapshot?.records).toEqual(statement.records);expect(native.read.mock.calls.map(([value])=>value)).toEqual([inner]);
});
it.each(['artwork','source'] as const)('rejects %s tampering before attempting inner verification',async kind=>{
 const source=heldPublicLedgerFile(await original()).source!,wire={kind:'receiz.ledger_proof_bundle',version:'v3',source};
 await syntheticSeal(embedPublicLedgerPng(png(),encode(wire)));
 const bytes=embedPublicLedgerPng(png(kind==='artwork'?'#abcdef':'#123456'),encode(kind==='source'?{...wire,source:{...source,artifactSha256:hex('9')}}:wire));native.read.mockClear();
 await expect(inspectPublicLedgerFile({bytes,filename:'tampered.png'})).rejects.toThrow(/UNVERIFIED/);
 expect(native.read).toHaveBeenCalledOnce();expect(native.read.mock.calls[0][0]).toEqual(bytes);
});
it('requires the independently verified inner artifact and payload digests after the outer seal succeeds',async()=>{
 const source=heldPublicLedgerFile(await original()).source!,bytes=embedPublicLedgerPng(png(),encode({kind:'receiz.ledger_proof_bundle',version:'v3',source:{...source,payloadSha256:hex('9')}}));await syntheticSeal(bytes);
 await expect(inspectPublicLedgerFile({bytes,filename:'wrong-binding.png'})).rejects.toThrow(/UNVERIFIED/);
});
it('does not let a changed v3 carrier version bypass a still-carried enclosing proof as legacy v2',async()=>{
 const source=heldPublicLedgerFile(await original()).source!,bytes=withProofMarker(embedPublicLedgerPng(png(),encode({kind:'receiz.ledger_proof_bundle',version:'v2',source})));native.read.mockClear();
 await expect(inspectPublicLedgerFile({bytes,filename:'downgraded.png'})).rejects.toThrow(/UNVERIFIED/);
 expect(native.read).toHaveBeenCalledOnce();expect(native.read.mock.calls[0][0]).toEqual(bytes);
});
it('refuses a successful outer seal of a different valid inner Ledger rather than returning a shortened Crystal',async()=>{
 const review=await original(),payload=encode({...statement,sourceHead:hex('9'),sourceHistory:[hex('b'),hex('9')],records:[]});
 const otherSource={...heldPublicLedgerFile(review).source!,exactBytesB64u:receizBase64UrlEncode(otherInner),artifactSha256:await sha256ReceizBytes(otherInner),payloadSha256:await sha256ReceizBytes(payload)};
 await expect(createPublicLedgerCrystal(review,{render:async()=>png(),seal:async()=>syntheticSeal(embedPublicLedgerPng(png(),encode({kind:'receiz.ledger_proof_bundle',version:'v3',source:otherSource})))})).rejects.toThrow(/SOURCE_CHANGED/);
});
it('bounds final sealed bytes and source expansion before a Crystal can be returned',async()=>{
 const review=await original();
 await expect(createPublicLedgerCrystal(review,{render:async()=>png(),seal:async()=>({artifactBytes:new Uint8Array(24*1024*1024+1),filename:'too-large.png',mimeType:'image/png'})})).rejects.toThrow(/CAPACITY/);
 expect(()=>embedPublicLedgerPng(png(),new Uint8Array(20*1024*1024+1))).toThrow(/CAPACITY/);
});
it('uses only canonical public-device document sealing, reusing enrollment and resources without account identity custody',async()=>{
 const review=await original(),store={load:vi.fn(async()=>null),save:vi.fn(async()=>{})},resources={wasm:new Uint8Array([1]),zkey:new Uint8Array([2])};
 const ready=vi.fn(async()=>false),enroll=vi.fn(async()=>{}),seal=vi.fn(async(input:{bytes:Uint8Array})=>syntheticSeal(input.bytes));
 offline.store.mockReturnValue(store);offline.resources.mockResolvedValue(resources);offline.create.mockReturnValue({ready,enroll,seal});
 await createPublicLedgerCrystal(review,{render:async()=>png()});await createPublicLedgerCrystal(review,{render:async()=>png()});
 expect(offline.store).toHaveBeenCalledWith('bankeiz-public-ledger-device-signer');expect(offline.create).toHaveBeenCalledOnce();
 const config=offline.create.mock.calls[0][0];expect(config).toEqual({store:{load:expect.any(Function),save:expect.any(Function)},resources,fetch:expect.any(Function)});
 expect(await config.store.load()).toBeNull();expect(store.load).toHaveBeenCalledOnce();
 const publicCustody={sentinel:'unchanged public signer custody'};await config.store.save(publicCustody);expect(store.save).toHaveBeenCalledExactlyOnceWith(publicCustody);
 expect(enroll).toHaveBeenCalledOnce();expect(seal).toHaveBeenCalledTimes(2);
 expect(Object.keys(seal.mock.calls[0][0]).sort()).toEqual(['bytes','filename','mimeType']);
});
