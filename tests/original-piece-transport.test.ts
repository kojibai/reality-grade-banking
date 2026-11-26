import {expect,it,vi} from 'vitest';
import {createReceizIdentityKeyFile,signReceizIdentityLoginProof} from '@receiz/sdk';
import {createOriginalPieces} from '../src/receiz/original-pieces';
import {ORIGINAL_PIECE_SCHEMA,type OriginalPieceDelivery,type OriginalPieceHead} from '../src/receiz/original-piece-runtime.js';
import {digestOriginalPieceBytes} from '../native/receiz/app/lib/profile/showcase/originalPieceRanges';

const canonical=vi.hoisted(()=>vi.fn());
const archiveProof=vi.hoisted(()=>vi.fn());
vi.mock('../src/receiz/original-piece-proof',async original=>({
  ...await original<typeof import('../src/receiz/original-piece-proof')>(),verifyOriginalPieceArchive:archiveProof,
}));
vi.mock('../src/receiz/proof-capture',()=>({openCanonicalProofFile:canonical}));

it('binds the reviewed Original and recipient, saves real consent before execution, and replays the same command',async()=>{
  const owner='fixture.receiz.id',recipient='receiz_abcdefghijklmnopqr.receiz.id';
  const key=(await createReceizIdentityKeyFile({owner:{uid:owner},pbkdf2Iterations:1000})).keyFile;
  const recipientKey=(await createReceizIdentityKeyFile({owner:{uid:recipient},pbkdf2Iterations:1000})).keyFile;
  const file=new File(['held Original bytes'],'original.receiz');
  const originalSha256=await digestOriginalPieceBytes(file),sourceIdentity='b'.repeat(64);
  canonical.mockResolvedValue({sealedArtifact:{kind:'receiz.native-record-seal',artifactSha256:originalSha256,mimeType:'text/plain',
    continuity:{ownerReceizId:owner},verification:{assetContinuity:{state:'verified',artifactId:sourceIdentity}}}});
  const ranges=[{offset:2,byteLength:5}],command={schema:ORIGINAL_PIECE_SCHEMA,operationId:'a'.repeat(64),sourceIdentity,
    originalSha256,predecessorSha256:originalSha256,byteLength:file.size,senderReceizId:owner,senderKeyId:key.keyId,
    recipientReceizId:recipient,recipientKeyId:recipientKey.keyId,ranges};
  const events:string[]=[],execution:unknown[]=[];
  let checkpoint:unknown=null,wrongRecipient=true;
  const sign=vi.fn((challengeB64Url:string)=>signReceizIdentityLoginProof({keyFile:key,challengeB64Url}));
  const dependencies:Parameters<typeof createOriginalPieces>[0]={
    binding:{artifactOwnerReceizId:owner,keyId:key.keyId,alg:key.alg,publicKeyRawB64u:key.crypto.publicKeyRawB64u},
    assertOpen(){},sign,archive:async()=>[],proofLibrary:async()=>{throw Error('Unexpected Proof Library write.');},
    checkpoint:{read:async()=>checkpoint,async write(next,expected){expect(checkpoint).toEqual(expected);checkpoint=structuredClone(next);events.push('held');}},
    async request(body,path){
      expect(path).toContain('/api/connect/bank/original-pieces?applicationId=');
      if(body.operation==='stage')return {digest:body.digest};
      if(body.operation==='prepare')return {command:wrongRecipient?{...command,recipientKeyId:'c'.repeat(64)}:command};
      expect(body.operation).toBe('execute');expect(events[0]).toBe('held');expect(body.delivery).toBe('bounded');
      execution.push(structuredClone(body));events.push('execute');throw Error('offline');
    },
  };
  const api=createOriginalPieces(dependencies),selection={original:file,recipient:`${recipient}#${recipientKey.keyId}`,ranges};
  await expect(api.prepare(selection)).rejects.toThrow('BANK_ORIGINAL_PIECE_REVIEW_MISMATCH');
  expect(sign).not.toHaveBeenCalled();expect(checkpoint).toBeNull();
  wrongRecipient=false;
  const review=await api.prepare(selection);
  await expect(api.send({...review},review.confirmationDigest)).rejects.toThrow('BANK_ORIGINAL_PIECE_EXACT_CONFIRMATION_REQUIRED');
  await expect(api.send(review,review.confirmationDigest)).rejects.toThrow('offline');
  expect(await api.pending()).toEqual({operationId:command.operationId,command});
  await expect(createOriginalPieces(dependencies).resumePending()).rejects.toThrow('offline');
  expect(sign).toHaveBeenCalledOnce();expect(execution[1]).toEqual(execution[0]);
});

it('permits the exact Bankeiz POST at the native proxy and rejects extra query fields or application IDs',async()=>{
  const {BANK_APPLICATION_ID}=await import('../src/receiz/config');
  const {nativeFetch,permittedNativePath}=await import('../src/receiz/native-transport');
  const path=`/api/connect/bank/original-pieces?applicationId=${BANK_APPLICATION_ID}`;
  expect(permittedNativePath(path,'POST')).toBe(true);
  expect(permittedNativePath(path,'GET')).toBe(false);
  expect(permittedNativePath(`${path}&applicationId=${BANK_APPLICATION_ID}`,'POST')).toBe(false);
  expect(permittedNativePath(`${path}&scope=write`,'POST')).toBe(false);
  expect(permittedNativePath('/api/connect/bank/original-pieces?applicationId=rc_other','POST')).toBe(false);
  expect(permittedNativePath('/api/connect/bank/original-pieces','POST')).toBe(false);
  const fetcher=vi.fn(async()=>Response.json({digest:'a'.repeat(64)}));
  vi.stubGlobal('fetch',fetcher);
  try{
    await nativeFetch(`https://receiz.com${path}`,{method:'POST'});
    expect(fetcher).toHaveBeenCalledWith(`/api/bank/native${path}`,expect.objectContaining({method:'POST',credentials:'omit',redirect:'error'}));
    expect(()=>nativeFetch(`https://foreign.example${path}`,{method:'POST'})).toThrow('Unsupported Receiz bank transport.');
    expect(fetcher).toHaveBeenCalledOnce();
  }finally{vi.unstubAllGlobals();}
});


it('projects earlier held bytes through a uniquely witnessed successor without retaining transferred ranges',async()=>{
  const alice='alice.receiz.id',bob='bob.receiz.id',keyId='a'.repeat(64),otherKey='b'.repeat(64);
  const digest='c'.repeat(64),sourceIdentity='d'.repeat(64),byteLength=10;
  const row=(offset:number,byteLength:number,ownerReceizId:string)=>({offset,byteLength,ownerReceizId,sha256:digest});
  const make=(revision:number,previous:string,senderReceizId:string,recipientReceizId:string,ranges:{offset:number;byteLength:number}[],
    pieces:ReturnType<typeof row>[])=>({
      head:{schema:'receiz.original-piece.head.v1',issuerKid:'test-issuer',kaiUPulse:String(revision),revision,filename:'held.receiz',mimeType:'application/octet-stream',
        sender:{keyId:senderReceizId===alice?keyId:otherKey,alg:'Ed25519',publicKeyRawB64u:'test-projection'},
        consent:{schema:'receiz.identity.login_proof.v1',keyId:senderReceizId===alice?keyId:otherKey,alg:'Ed25519',challengeB64Url:'test-projection',signatureB64Url:'test-projection'},
        command:{schema:ORIGINAL_PIECE_SCHEMA,originalSha256:digest,sourceIdentity,byteLength,
        predecessorSha256:previous,operationId:String(revision).repeat(64),senderReceizId,recipientReceizId,
        senderKeyId:senderReceizId===alice?keyId:otherKey,recipientKeyId:recipientReceizId===alice?keyId:otherKey,ranges},
        layout:{originalSha256:digest,byteLength,pieces}} satisfies OriginalPieceHead,
      headDigest:String(revision).repeat(64),exactArtifact:new Blob([]),
    });
  const firstPiece=row(0,4,alice),secondPiece=row(7,2,alice),sentPiece=row(0,2,bob);
  const first=make(1,digest,bob,alice,[firstPiece],[firstPiece,row(4,6,bob)]);
  const second=make(2,first.headDigest,bob,alice,[secondPiece],[firstPiece,row(4,3,bob),secondPiece,row(9,1,bob)]);
  const third=make(3,second.headDigest,alice,bob,[sentPiece],[sentPiece,row(2,2,alice),row(4,3,bob),secondPiece,row(9,1,bob)]);
  const evidence=(latest:typeof first,ownerReceizId:string,piece:ReturnType<typeof row>,ancestry:(typeof first)[]):OriginalPieceDelivery=>({
    kind:'sealed-range-delivery',originalProof:'requires-exact-original',head:latest.head,headDigest:latest.headDigest,ownerReceizId,ancestry,
    pieces:[{...piece,bytes:new Blob([new Uint8Array(piece.byteLength)])}],
  });
  const deliveries=new Map([['first.receizpieces',evidence(first,alice,firstPiece,[first])],
    ['second.receizpieces',evidence(second,alice,secondPiece,[first,second])],['sent.receizpieces',evidence(third,bob,sentPiece,[first,second,third])]]);
  archiveProof.mockImplementation(async(file:File)=>({delivery:deliveries.get(file.name)}));
  const api=createOriginalPieces({binding:{artifactOwnerReceizId:alice,keyId,alg:'Ed25519',publicKeyRawB64u:'unused'},assertOpen(){},
    request:async()=>{throw Error('network refused');},sign:async()=>{throw Error('signing refused');},
    checkpoint:{read:async()=>null,write:async()=>{throw Error('checkpoint write refused');}},
    proofLibrary:async()=>{throw Error('retention refused');},
    archive:async()=>[...deliveries.keys()].map(filename=>({kind:'original-piece',filename,bytes:new TextEncoder().encode(filename)})),
  });
  const summaries=await api.list();
  expect(summaries.map(({headDigest,ownedBytes,percentage,ranges})=>({headDigest,ownedBytes,percentage,ranges}))).toEqual([
    {headDigest:third.headDigest,ownedBytes:2,percentage:'20%',ranges:[{offset:7,byteLength:2}]},
    {headDigest:third.headDigest,ownedBytes:2,percentage:'20%',ranges:[{offset:2,byteLength:2}]},
  ]);
});
