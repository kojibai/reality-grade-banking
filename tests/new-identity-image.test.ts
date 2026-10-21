import {afterEach,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import * as segments from '@receiz/sdk';
import {createReceizIdIdentity,readReceizIdentityArtifact} from '@receiz/sdk';
import {Resvg} from '@resvg/resvg-js';
import {createNewIdentityImageSource} from '../src/receiz/identity-image';
import {initializeFreshBankAccount} from '../src/receiz/new-account-genesis';
import {unprotectIdentityKeyFile} from '../src/receiz/identity-protection';
import {readCarriedWalletObservation} from '../src/receiz/wallet-observation';
import ts from 'typescript';
afterEach(()=>vi.restoreAllMocks());
it('renders Receiz artwork and embeds the same complete key in its native PNG carrier for a new account',async()=>{
 const phrase='synthetic-local-only-test-phrase',creationKey=(await createReceizIdIdentity({passphrase:phrase,createdAt:'2026-10-15T22:00:00.000Z'})).keyFile,keyFile=await unprotectIdentityKeyFile(await initializeFreshBankAccount(creationKey,phrase),phrase),module=await import(pathToFileURL(process.cwd()+'/public/native/identity-artwork.v129.mjs').href),rasterize=vi.fn(async(svg:string,_stamp:unknown)=>new Uint8Array(new Resvg(svg).render().asPng()));
 const before=JSON.stringify(keyFile),source=await createNewIdentityImageSource(keyFile,creationKey,{runtime:module,rasterize,kai:()=>({pulse:15000000,uPulse:15000000000000}),now:()=>new Date('2026-10-21T12:00:00Z')});
 expect(source.filename).toMatch(/^identity_record_.*\.png$/);expect(source.mimeType).toBe('image/png');expect([...source.bytes.slice(0,8)]).toEqual([137,80,78,71,13,10,26,10]);expect(JSON.stringify(keyFile)).toBe(before);
 const recovered=await readReceizIdentityArtifact(source.bytes);expect(recovered.keyId).toBe(keyFile.keyId);expect(recovered.owner).toEqual(keyFile.owner);expect(recovered.portableState).toEqual(keyFile.portableState);expect(recovered.crypto).toEqual(keyFile.crypto);
 expect(recovered.crypto.privateKeyPkcs8B64u).toBeTruthy();expect(readCarriedWalletObservation(await segments.projectReceizIdentityAccount(recovered))?.source).toBe('account-genesis');
 const head=module.head(keyFile.portableState?.snapshot);expect(rasterize.mock.calls[0][1]).toMatchObject({accountHeadKaiPulse:head.kaiPulse});expect((rasterize.mock.calls[0][1] as {creationKaiPulse:string}).creationKaiPulse).not.toBe(head.kaiPulse);
 // Receiz's actual upload reader, with unrelated module dependencies isolated.
 const original=readFileSync('native/receiz/app/utils/receizIdentityKey.ts','utf8'),png=readFileSync('native/receiz/app/utils/pngChunks.ts','utf8'),compile=(text:string,dependencies:Record<string,unknown>)=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)((name:string)=>dependencies[name]??{},m,m.exports);return m.exports as {readReceizKeyFileFromBlob:(blob:Blob)=>Promise<typeof keyFile>};};
 const reader=compile(original,{'@/app/utils/pngChunks':compile(png,{}),'../../packages/receiz-sdk/src/portableStateSegments':segments}),uploaded=await reader.readReceizKeyFileFromBlob(new Blob([new Uint8Array(source.bytes)],{type:'image/png'}));expect(uploaded.keyId).toBe(keyFile.keyId);expect(uploaded.portableState).toEqual(recovered.portableState);expect(uploaded.crypto).toEqual(recovered.crypto);expect(rasterize.mock.calls[0][0]).toContain('<svg');expect(rasterize.mock.calls[0][0]).not.toContain('Bankeiz');
});
it('rejects artwork from a different identity before embedding any private key',async()=>{
 const a=(await createReceizIdIdentity({passphrase:'synthetic-only-one-phrase'})).keyFile,b=(await createReceizIdIdentity({passphrase:'synthetic-only-two-phrase'})).keyFile;const rasterize=vi.fn();await expect(createNewIdentityImageSource(a,b,{runtime:{} as never,rasterize,kai:()=>({pulse:1,uPulse:1000000}),now:()=>new Date()})).rejects.toThrow('IDENTITY_IMAGE_OWNER_MISMATCH');expect(rasterize).not.toHaveBeenCalled();
});
