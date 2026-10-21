import {expect,it} from 'vitest';
import {publicAssetManifest,publicManifestLink} from '../src/receiz/public-asset-manifest';
import {parsePublicMarket} from '../src/receiz/public-market';
const hash='ab'.repeat(32),verifyPath='/v/20261020_1200/ABCD1234/12345678';
const profile={code:'ABCD1234',pulse:'12345678',verifyPath,proof:{circuit:'Groth16',groth16Id:'ABCDEF0123456789',poseidon:'12345678901234567890'},claimHashHex:hash,pbiReceiptHash:hash,media:{sha256Hex:hash},attachments:[{id:'appendix',name:'Complete appendix.pdf',sha256Hex:hash,src:'/api/storage/object?bucket=receiz-profile-originals&path=creator/appendix.pdf',downloadName:'appendix.pdf'}]};
it('preserves every live-player manifest row, full commitments and attachment references',()=>{
 const rows=publicAssetManifest(profile);
 expect(rows.map(row=>row.label)).toEqual(['Coordinate','Pulse','Verify Path','Circuit','Groth16','Poseidon','Claim SHA-256','Media SHA-256','Attachment 1','Attachment 1 SHA-256','PBI Signature','Offline Verifier','Verification Key']);
 expect(rows.find(row=>row.label==='Coordinate')?.value).toBe('ABCD1234/12345678');expect(rows.find(row=>row.label==='Poseidon')?.value).toBe(profile.proof.poseidon);expect(rows.find(row=>row.label==='Claim SHA-256')?.value).toBe(hash.toUpperCase());
 expect(rows.find(row=>row.label==='Attachment 1')).toMatchObject({value:'Complete appendix.pdf',href:'https://receiz.com/api/storage/object?bucket=receiz-profile-originals&path=creator/appendix.pdf',downloadName:'appendix.pdf'});
 expect(rows.at(-1)?.href).toBe('https://receiz.com/zk/verification_key.json');
});
it('carries the manifest in the existing catalogue parse without source requests',()=>{
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:original',receizId:'original',title:'Original',pulse:'12345678',verifyHref:verifyPath,profileOriginal:profile}]}}).items[0];
 expect(item.proofManifest).toBeUndefined();expect(publicAssetManifest(item.proofManifestSource)).toEqual(publicAssetManifest(profile));expect(item.authority).toBe('projection-only');expect(item.canTrade).toBe(false);
});
it('keeps absent evidence explicit and does not invent hashes or attachments',()=>{
 const rows=publicAssetManifest({}, {verifyUrl:'https://receiz.com'+verifyPath,pulse:'12345678'});
 expect(rows.find(row=>row.label==='Coordinate')?.value).toBe('ABCD1234/12345678');expect(rows.find(row=>row.label==='Claim SHA-256')?.value).toBe('Unavailable');expect(rows.find(row=>row.label==='PBI Signature')?.value).toBe('Not attached');expect(rows.some(row=>row.label.startsWith('Attachment'))).toBe(false);
});
it('keeps arbitrary URLs inert and accepts only scoped public Receiz proof links',()=>{
 for(const value of ['javascript:alert(1)','https://other.example/a','https://receiz.com/api/account','https://name:secret@receiz.com/offline-verifier.html','https://receiz.com/offline-verifier.html?token=secret','/api/storage/object?bucket=private&path=secret.pdf','/api/storage/object?bucket=receiz-profile-originals&path=creator/../secret.pdf'])expect(publicManifestLink(value)).toBeNull();
 expect(publicManifestLink('/offline-verifier.html')).toBe('https://receiz.com/offline-verifier.html');expect(publicManifestLink('/api/proof-material/packages/'+hash+'/artifact?attachment=appendix')).not.toBeNull();
 const rows=publicAssetManifest({...profile,attachments:[{name:'Unsafe link',src:'javascript:alert(1)'}]});expect(rows.find(row=>row.label==='Attachment 1')?.href).toBeUndefined();
});

it('uses the carried receipt-card digest for Moments represented by a compact media projection',()=>{
 const source={mediaKind:'moment',media:{material:null},recordCardMediaSha256Hex:'cd'.repeat(32),recordMediaSha256Hex:'ef'.repeat(32)};
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:writer:moment',receizId:'moment',title:'A moment.',profileOriginal:source}]}}).items[0];
 expect(publicAssetManifest(item.proofManifestSource).find(row=>row.label==='Media SHA-256')?.value).toBe('CD'.repeat(32));
});
