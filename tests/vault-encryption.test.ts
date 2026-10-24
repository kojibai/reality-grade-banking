import {describe,expect,it} from 'vitest';
import {createVaultHeader,encryptVaultBytes,decryptVaultBytes,readEncryptedVault} from '../src/receiz/vault/encryption';

const secret=Uint8Array.from({length:32},(_,i)=>i+1);
const owner={keyId:'fixture-owner-key',receizId:'owner.receiz.id'};
const credential={id:'Zml4dHVyZS1jcmVkZW50aWFs',publicKeySpki:'Zml4dHVyZS1wdWJsaWMta2V5',rpId:'bankeiz.com',origin:'https://bankeiz.com'};
const bytes=new TextEncoder().encode('fixture-only private custody, exact original and recovery journal');
const header=()=>createVaultHeader({purpose:'vault-private',owner,credential,id:'f3ba25bc-3b06-4c9b-b978-a7b805c4e7eb'});

describe('private Vault encryption boundary',()=>{
 it('recovers exact original bytes with the same passkey secret without storing that secret in the export',async()=>{
  const sealed=await encryptVaultBytes(bytes,header(),secret);
  const copy=readEncryptedVault(JSON.parse(JSON.stringify(sealed)));
  expect(await decryptVaultBytes(copy,secret)).toEqual(bytes);
  expect(JSON.stringify(sealed)).not.toContain('private custody');
  expect(Object.keys(sealed).sort()).toEqual(['ciphertext','header','iv','schema']);
 });
 it('refuses a copied original without the correct passkey secret',async()=>{
  const sealed=await encryptVaultBytes(bytes,header(),secret);
  await expect(decryptVaultBytes(sealed,new Uint8Array(32))).rejects.toThrow();
  await expect(decryptVaultBytes(sealed,new Uint8Array())).rejects.toThrow();
 });
 it.each(['owner','credential','id','purpose','prfSalt'] as const)('authenticates %s instead of trusting edited carrier metadata',async field=>{
  const sealed=await encryptVaultBytes(bytes,header(),secret),edited=structuredClone(sealed);
  if(field==='owner')edited.header.owner={...owner,keyId:'another-owner-key'};
  else if(field==='credential')edited.header.credential={...credential,id:'YW5vdGhlci1jcmVkZW50aWFs'};
  else if(field==='id')edited.header.id='1699cdf3-dced-48dc-bcde-8d6c8447ff9d';
  else if(field==='purpose')edited.header.purpose='identity-recovery';
  else edited.header.prfSalt='AgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgI';
  await expect(decryptVaultBytes(edited,secret)).rejects.toThrow();
 });
 it('refuses changed ciphertext and nonce',async()=>{
  const sealed=await encryptVaultBytes(bytes,header(),secret);
  await expect(decryptVaultBytes({...sealed,ciphertext:(sealed.ciphertext[0]==='A'?'B':'A')+sealed.ciphertext.slice(1)},secret)).rejects.toThrow();
  await expect(decryptVaultBytes({...sealed,iv:'AAAAAAAAAAAAAAAA'},secret)).rejects.toThrow();
 });
 it('does not reuse an encryption nonce for successive private journal saves',async()=>{
  const h=header(),a=await encryptVaultBytes(bytes,h,secret),b=await encryptVaultBytes(bytes,h,secret);
  expect(a.iv).not.toEqual(b.iv);expect(a.ciphertext).not.toEqual(b.ciphertext);
  expect(await decryptVaultBytes(a,secret)).toEqual(await decryptVaultBytes(b,secret));
 });
 it('does not accept a public proof, unknown fields or malformed binary encodings as private recovery input',async()=>{
  const sealed=await encryptVaultBytes(bytes,header(),secret);
  for(const candidate of [{schema:'bank.vault.public.v1',holdings:[]},{...sealed,privateKey:'forbidden'},{...sealed,header:{...sealed.header,token:'forbidden'}},{...sealed,iv:'AAAA='},{...sealed,ciphertext:'*'},{...sealed,header:{...sealed.header,credential:{...credential,origin:'https://evil.example'}}}])expect(()=>readEncryptedVault(candidate)).toThrow();
 });
 it('refuses empty originals and out-of-scope identity recovery purposes',async()=>{
  await expect(encryptVaultBytes(new Uint8Array(),header(),secret)).rejects.toThrow();
  expect(()=>createVaultHeader({purpose:'public-proof' as never,owner,credential,id:'f3ba25bc-3b06-4c9b-b978-a7b805c4e7eb'})).toThrow();
 });
});
