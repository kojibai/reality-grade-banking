import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {createNoteImageExporter} from '../src/receiz/note-image-seal';
import {createLocalNoteDepositQueue} from '../src/receiz/note-received-deposits';
import {encodeNotePng} from '../src/receiz/note-png';
import {canonicalizeReceizConstitution as canonical} from '../node_modules/@receiz/sdk/dist/constitution.js';
import {verifyReceizDocumentBytesCanonical} from '../node_modules/@receiz/sdk/dist/verifier/canonical.js';
import type {ReceizSignatureV4RootPublicKey} from '../node_modules/@receiz/sdk/dist/verifier/signatureV4.js';
const nativeUrl=new URL('../public/native/offline-notes.v129.mjs',import.meta.url).href;
const native=await import(/* @vite-ignore */ nativeUrl);
const fixture=(name:string)=>new Uint8Array(gunzipSync(readFileSync(new URL(`./fixtures/connected-note/${name}.gz`,import.meta.url))));
const metadata=JSON.parse(readFileSync(new URL('./fixtures/connected-note/metadata.json',import.meta.url),'utf8'));
const baseRoots=new Map<string,ReceizSignatureV4RootPublicKey>(metadata.issuerRootPublicKeys.map((root:ReceizSignatureV4RootPublicKey)=>[root.kid,root]));
const hash=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
const encode=(value:unknown)=>new TextEncoder().encode(canonical(value));

// Ephemeral test-only issuer. No production pins, verifier or saved Note state
// changes. Real native proof generation, signatures and verification run.
async function signer(){
 const root=await crypto.subtle.generateKey('Ed25519',true,['sign','verify']) as CryptoKeyPair;
 const device=await crypto.subtle.generateKey('Ed25519',false,['sign','verify']) as CryptoKeyPair;
 const kid='receiz.v4.test.note-png';
 const identity={version:1,certType:'receiz.device.v1',issuerKid:kid,alg:'Ed25519',subjectPublicKeyRawB64u:Buffer.from(await crypto.subtle.exportKey('raw',device.publicKey)).toString('base64url'),issuedAtMs:Date.now()-60_000,expiresAtMs:Date.now()+3_600_000};
 const basis={...identity,certId:hash(canonical(identity)).slice(0,32)};
 const sign=async(bytes:Uint8Array)=>Buffer.from(await crypto.subtle.sign('Ed25519',root.privateKey,new Uint8Array(bytes))).toString('base64url');
 const cert={...basis,sig:await sign(encode(basis))};
 const roots=new Map(baseRoots);roots.set(kid,{kid,alg:'Ed25519',publicKeyRawB64u:Buffer.from(await crypto.subtle.exportKey('raw',root.publicKey)).toString('base64url'),status:'active'});
 const seal=await native.createBankNativeNoteSealer({enrollment:{privateKey:device.privateKey,cert},resources:{wasm:new Uint8Array(readFileSync(new URL('../public/zk/document-seal.wasm',import.meta.url))),zkey:new Uint8Array(readFileSync(new URL('../public/zk/document-seal.zkey',import.meta.url)))}});
 return {roots,seal,financialSignature:async(value:unknown)=>({kid,alg:'Ed25519',sig:await sign(native.bankConnectedNoteFinancialSigningBytes(value)),signedAtMs:Date.now()})};
}

it('exports all three Note rails and signed handovers as canonical PNG proofs, preserving exact native sources with no network',async()=>{
 const signing=await signer(),raw=fixture('note.png'),original=await native.readBankConnectedNoteImage(raw,{roots:baseRoots});
 const bare=await verifyReceizDocumentBytesCanonical({fileBytes:raw,filename:'note.png',signatureV4RootPublicKeys:signing.roots});
 expect(bare.ok).toBe(false);expect(bare.errors.join(' ')).toContain('Missing proof bundle');
 const originalFetch=globalThis.fetch;let requests=0,seals=0;
 globalThis.fetch=async()=>{requests++;throw Error('network forbidden');};
 try{
  const inspect=(bytes:Uint8Array)=>native.readBankConnectedNoteImage(bytes,{roots:signing.roots});
  const verify=(bytes:Uint8Array)=>verifyReceizDocumentBytesCanonical({fileBytes:bytes,filename:'note.png',mime:'image/png',signatureV4RootPublicKeys:signing.roots});
  const exporter=createNoteImageExporter({assertOpen(){},inspect,verify:async bytes=>(await verify(bytes)).ok,
   seal:async input=>{seals++;const result=await signing.seal({fileBytes:input.bytes,filename:input.filename,mime:input.mimeType});return{artifactBytes:result.artifactBytes,mimeType:'image/png',verification:await verify(result.artifactBytes)};},
  });
  const artwork=await encodeNotePng(new Uint8ClampedArray([164,31,90,255,15,131,182,255,237,212,154,255,45,82,41,255]),2,2);
  const customImage=await native.exportBankConnectedNoteImage(original.terminalSourceBytes,artwork,{roots:signing.roots});
  const originals=[{name:'handover',image:customImage,source:original.terminalSourceBytes}];
  for(const rail of ['reserve','settlement','composite']){
   const funding={...original.funding,rail,amountUsdCents:'200',amountPhiMicro:'1000000',usdPerPhiMicrocents:'200000000',...(rail==='composite'?{fundingParts:{reserve:{amountUsdCents:'100',amountPhiMicro:'500000'},settlement:{amountUsdCents:'100',amountPhiMicro:'500000'}}}:{})};
   const body={schema:'receiz.bank.connected-note.funding-source.v1',funding,fundingSignature:await signing.financialSignature(funding)};
   const sealed=await signing.seal({fileBytes:encode(body),filename:'funding.json',mime:'application/json',options:{forceBundleEnvelope:true}});
   const source=sealed.artifactBytes,image=await native.exportBankConnectedNoteImage(source,raw,{roots:signing.roots});
   originals.push({name:rail,image,source});
  }
  for(const {name,image,source}of originals){
   const result=await exporter.exportImage(image,original.noteId),verified=await verify(result);
   expect(verified.ok,name+': '+verified.errors.join(' ')).toBe(true);
   const reopened=await inspect(result);expect([...reopened.terminalSourceBytes],name).toEqual([...source]);
   expect(reopened.noteId).toBe(original.noteId);expect(reopened.amountUsdCents).toBe('200');
   const count=seals;expect(await exporter.exportImage(image,original.noteId)).toEqual(result);expect(await exporter.exportImage(result,original.noteId)).toEqual(result);expect(seals).toBe(count);
   const damaged=result.slice();damaged[damaged.length-20]^=1;
   expect((await verify(damaged)).ok).toBe(false);
   await expect(exporter.exportImage(damaged,original.noteId)).rejects.toThrow();expect(seals).toBe(count);
   const denied=createNoteImageExporter({assertOpen(){},inspect,verify:async bytes=>(await verifyReceizDocumentBytesCanonical({fileBytes:bytes,filename:'note.png',signatureV4RootPublicKeys:new Map()})).ok,seal:async()=>{throw Error('must not replace an untrusted existing seal');}});
   await expect(denied.exportImage(result,original.noteId)).rejects.toThrow('SEAL_INVALID');
   await expect(exporter.exportImage(result,'another-note')).rejects.toThrow('SOURCE_CHANGED');
   if(name==='handover'){
    expect(verified.bundle?.artifactSha256Basis).toBe(hash(customImage));
    const credit=await native.verifyBankConnectedNoteReceipt(fixture('credit.receipt'),{roots:signing.roots});
    expect(credit.noteId).toBe(reopened.noteId);expect(credit.credit.terminalSourceSha256).toBe(reopened.terminalArtifactSha256);expect(credit.handover.handoverDigest).toBe(reopened.redemptionDigest);
    let checkpoint:unknown=null,submissions=0;
    const blobs=new Map<string,Uint8Array>();
    const ports={
     uid:credit.receiverUserId,keyId:credit.receiverKeyId,assertOpen(){},
     read:async()=>structuredClone(checkpoint),
     write:async(next:unknown)=>{checkpoint=structuredClone(next);},
     retain:async(value:Uint8Array)=>{const ref=hash(value);blobs.set(ref,value.slice());return ref;},
     restore:async(ref:string)=>blobs.get(ref)!.slice(),
     verify:(value:Uint8Array)=>native.readBankConnectedNoteSource(value,{roots:signing.roots}),
     submit:async(value:Uint8Array)=>{
      const admitted=await native.verifyBankConnectedNoteReceipt(fixture('credit.receipt'),{roots:signing.roots});
      expect(admitted.terminalSourceBytes).toEqual(value);
      submissions++;
      return {noteId:admitted.noteId,rail:admitted.rail,amountPhiMicro:admitted.amountPhiMicro,amountUsdCents:admitted.amountUsdCents,reserveAfterUsdCents:admitted.accountAfter.reserveUsdCents,proofBytes:admitted.proofBytes};
     },
    };
    const queue=createLocalNoteDepositQueue(ports);
    expect((await queue.receive(reopened.terminalSourceBytes,result)).hasOriginalImage).toBe(true);
    await queue.reconcile();
    const cold=createLocalNoteDepositQueue(ports);
    await cold.reconcile();
    expect((await cold.confirmed(reopened.noteId))?.status).toBe('confirmed');
    expect(hash(await cold.exportOriginalImage(reopened.noteId))).toBe(hash(result));
    expect(submissions).toBe(1);
   }
  }
  expect(seals).toBe(4);expect(requests).toBe(0);
 }finally{globalThis.fetch=originalFetch;}
},120_000);
