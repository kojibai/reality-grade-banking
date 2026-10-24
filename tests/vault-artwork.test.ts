import {expect,it} from 'vitest';
import {Resvg} from '@resvg/resvg-js';
import sharp from 'sharp';
import jsQR from '../src/vendor/jsqr';
import {drawVaultArtwork,vaultPublicUrl} from '../src/receiz/vault/artwork';

const id='1e60455a-a57b-43c7-94a4-cff2ef45db4c',digest='a'.repeat(64);
const details={vaultId:id,name:'Family reserve',ownerReceizId:'owner.receiz.id',sourceDigest:digest,kaiUPulse:'14781781000000',kind:'public' as const,publicUrl:`https://bankeiz.com/vault/${id}/?proof=${digest}`,holdings:3};

it('renders a public Vault QR that a real image decoder opens without any access authority',async()=>{
 const svg=drawVaultArtwork(details),png=new Resvg(svg).render().asPng();
 const {data,info}=await sharp(png).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const decoded=jsQR(new Uint8ClampedArray(data),info.width,info.height);
 expect(decoded?.data).toBe(details.publicUrl);
 expect(svg).toContain('Proof of holdings');expect(svg).toContain('View only');
 expect(svg).not.toMatch(/access_token|privateKey|passphrase|Bankeiz/);
},15000);

it('draws the private original distinctly and escapes all supplied labels',()=>{
 const svg=drawVaultArtwork({...details,kind:'private',publicUrl:vaultPublicUrl(id),name:'Family <script> & reserve'});
 expect(svg).toContain('Private vault');expect(svg).toContain('Keep this original private');
 expect(svg).not.toContain('Your passkey is required');
 expect(svg).toContain('Family &lt;script&gt; &amp; reserve');
 expect(svg).not.toContain('<script>');
});

it('states the extra passkey requirement only on a passkey-protected private original',()=>{
 const svg=drawVaultArtwork({...details,kind:'private',publicUrl:vaultPublicUrl(id),protection:'passkey'});
 expect(svg).toContain('Your passkey is required');
 expect(svg).toContain('Private vault');
});

it('builds only an exact public record locator and refuses credentials or mismatched routes',()=>{
 expect(vaultPublicUrl(id,digest)).toBe(details.publicUrl);
 for(const publicUrl of [`https://bankeiz.com/vault/${id}/?access_token=secret`,`https://bankeiz.com/vault/${id}/?proof=${'b'.repeat(64)}`,`https://elsewhere.example/vault/${id}/?proof=${digest}`,`https://owner:secret@bankeiz.com/vault/${id}/?proof=${digest}`])expect(()=>drawVaultArtwork({...details,publicUrl})).toThrow();
 expect(()=>drawVaultArtwork({...details,sourceDigest:'fake'})).toThrow();
});
