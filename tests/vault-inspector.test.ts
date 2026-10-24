import {expect,it,vi} from 'vitest';
import {inspectVaultOriginal} from '../src/receiz/vault/inspect';
import {createImageVault} from '../src/receiz/vault/carrier';
import {vaultBase64,vaultCanonical,vaultDigest} from '../src/receiz/vault/encoding';
import {emptyVaultJournal} from '../src/receiz/vault/journal';
import {createVaultHeader,encryptVaultBytes} from '../src/receiz/vault/encryption';
import {insertPngTextChunks} from '../native/receiz/app/utils/pngChunks';
const id='10000000-0000-4000-8000-000000000001',ownerKey='a'.repeat(64),png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF0sAAAAASUVORK5CYII=','base64'));
const encode=(v:unknown)=>new TextEncoder().encode(vaultCanonical(v));
const image=(value:unknown)=>insertPngTextChunks(png,[{keyword:'receiz.bank.vault.private.v1',text:vaultCanonical(value)}]);
it('returns admitted public evidence without any access authority or outer-artifact dependency for signed JSON',async()=>{
 const value={schema:'receiz.bank.vault-public-record.v1'},record={record:value,ownerReceizId:'owner.receiz.id',holdings:[]},admit=vi.fn(async()=>record),outer=vi.fn();
 const result=await inspectVaultOriginal(encode(value),{verifyOuter:outer,public:admit as never});
 expect(result).toMatchObject({kind:'public',verified:true,grantsAccess:false,currentUnspentness:false,record});expect(admit).toHaveBeenCalledExactlyOnceWith(value);expect(outer).not.toHaveBeenCalled();
});
it('never prints a private key, phrase or carrier while inspecting admitted private contents',async()=>{
 const original=encode({native:'complete'}),ref=await vaultDigest(original),source={schema:'bank.vault.private-source.v1',vaultId:id,name:'Reserve',owner:{accountId:'20000000-0000-4000-8000-000000000001',keyId:ownerKey,receizId:'owner.receiz.id'},custody:{accountId:'30000000-0000-4000-8000-000000000001',keyId:'b'.repeat(64),keyFileText:'PRIVATE-CHILD-KEY',passphrase:'PRIVATE-PHRASE',submissionRef:ref,sourceRef:ref},journal:emptyVaultJournal(id,ownerKey),workflows:{money:null,assets:null,market:null},blocks:[{sha256:ref,exactBytesB64u:vaultBase64(original)}]};
 const projection={vaultId:id,name:'Reserve',ownerReceizId:'owner.receiz.id',phase:'ready',nativeAccountAdmitted:true,money:[],assets:[],investments:[],pending:false},admit=vi.fn(async()=>projection),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{const result=await inspectVaultOriginal(image(createImageVault(encode(source),{id,owner:{keyId:source.owner.keyId,receizId:source.owner.receizId}})),{verifyOuter:async()=>true,private:admit as never});
 expect(result).toMatchObject({kind:'private',verified:true,privateOriginalGrantsAccess:true,record:projection});expect(JSON.stringify(result)).not.toMatch(/PRIVATE-CHILD-KEY|PRIVATE-PHRASE|sourceB64u|keyFileText/);expect(fetch).not.toHaveBeenCalled();expect(admit).toHaveBeenCalledOnce();
 }finally{vi.unstubAllGlobals();}
});
it('reports protected contents as unopened and rejects an invalid outer seal before reading private sources',async()=>{
 const header=createVaultHeader({purpose:'vault-private',id,owner:{keyId:ownerKey,receizId:'owner.receiz.id'},credential:{id:'Y3JlZGVudGlhbA',publicKeySpki:'cHVibGlj',rpId:'bankeiz.com',origin:'https://bankeiz.com'}}),carrier=await encryptVaultBytes(encode({private:'not-disclosed'}),header,new Uint8Array(32).fill(3)),admit=vi.fn();
 const result=await inspectVaultOriginal(image(carrier),{verifyOuter:async()=>true,private:admit});
 expect(result).toMatchObject({kind:'protected-private',outerVerified:true,contentsVerified:false,verified:false,passkeyRequired:true});expect(admit).not.toHaveBeenCalled();expect(JSON.stringify(result)).not.toContain('ciphertext');
 await expect(inspectVaultOriginal(image(carrier),{verifyOuter:async()=>false,private:admit})).rejects.toThrow('SEAL_INVALID');
 const recovery=await encryptVaultBytes(encode({private:'different-purpose'}),{...header,purpose:'identity-recovery'},new Uint8Array(32).fill(3));
 await expect(inspectVaultOriginal(image(recovery),{verifyOuter:async()=>true,private:admit})).rejects.toThrow('PURPOSE');
});
