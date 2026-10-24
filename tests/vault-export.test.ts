import {expect,it,vi} from 'vitest';
import {insertPngTextChunks} from '../native/receiz/app/utils/pngChunks';
import {createImageVault} from '../src/receiz/vault/carrier';
import {exportVaultPrivateImage,openVaultImage} from '../src/receiz/vault/export';
import {vaultCanonical} from '../src/receiz/vault/encoding';

const png=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF0sAAAAASUVORK5CYII=','base64'));
const vaultId='1e60455a-a57b-43c7-94a4-cff2ef45db4c';
const carrier=createImageVault(new TextEncoder().encode('private complete original'),{id:vaultId,owner:{keyId:'a'.repeat(64),receizId:'owner.receiz.id'}});
it('seals the whole private carrier before reopening exact bytes and labels bearer custody accurately',async()=>{
 let rendered='';const seal=vi.fn(async(input:{bytes:Uint8Array})=>({artifactBytes:input.bytes}));
 const result=await exportVaultPrivateImage(carrier,{name:'Family reserve',kaiUPulse:'14781781000000',holdings:2},{render:async svg=>{rendered=svg;return png;},seal,verify:async()=>true});
 expect(seal).toHaveBeenCalledOnce();expect(rendered).toContain('Keep this original private');
 expect(rendered).not.toContain('Your passkey is required');
 expect(result.filename).toBe(`vault-${vaultId}.private.png`);
 const opened=await openVaultImage(result.bytes,async()=>true);
 expect(opened.kind).toBe('private');expect(vaultCanonical(opened.value)).toBe(vaultCanonical(carrier));
});
it('refuses a failed canonical seal, a replaced carrier and ambiguous public/private images',async()=>{
 const options={name:'Family reserve',kaiUPulse:'14781781000000',holdings:0};
 await expect(exportVaultPrivateImage(carrier,options,{render:async()=>png,seal:async input=>({artifactBytes:input.bytes}),verify:async()=>false})).rejects.toThrow('SEAL_INVALID');
 const replaced=insertPngTextChunks(png,[{keyword:'receiz.bank.vault.private.v1',text:vaultCanonical({...carrier,header:{...carrier.header,id:'2e60455a-a57b-43c7-94a4-cff2ef45db4c'}})}]);
 await expect(exportVaultPrivateImage(carrier,options,{render:async()=>png,seal:async()=>({artifactBytes:replaced}),verify:async()=>true})).rejects.toThrow('SOURCE_CHANGED');
 const ambiguous=insertPngTextChunks(png,[{keyword:'receiz.bank.vault.private.v1',text:vaultCanonical(carrier)},{keyword:'receiz.bank.vault.public.v1',text:'{}'}]);
 await expect(openVaultImage(ambiguous,async()=>true)).rejects.toThrow('FORMAT_INVALID');
 await expect(openVaultImage(png,async()=>true)).rejects.toThrow('FORMAT_INVALID');
});
