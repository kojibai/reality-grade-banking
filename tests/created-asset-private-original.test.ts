import {afterEach,expect,it,vi} from 'vitest';
import {prepareCreatedAssetPrimary} from '../src/receiz/created-asset-file';
const runtime=vi.hoisted(()=>({readComposerPrimaryFile:vi.fn()}));
vi.mock('../src/receiz/asset-publication-runtime',()=>({loadAssetPublicationRuntime:async()=>runtime}));
afterEach(()=>vi.resetAllMocks());
const policy={allowOriginalDownload:true,allowDerivativeDownload:true,allowMomentRecordDownload:true,gateAudioPlayback:false,originalDownloadLimit:3,derivativeDownloadLimit:null,originalDownloadPriceCents:250,derivativeDownloadPriceCents:null};
it('separates the already sealed private file from public composer files only for protected collection',async()=>{
 const raw=new File(['%PDF raw content'],'work.pdf',{type:'application/pdf'}),sealedBytes=new TextEncoder().encode('existing sealed PDF'),cover=new File(['public cover'],'cover.png',{type:'image/png'});
 runtime.readComposerPrimaryFile.mockResolvedValue({verification:{ok:false,errors:['Missing embedded PDF proof bundle.']}});
 const seal=vi.fn(async()=>({artifactBytes:sealedBytes,filename:'work.pdf',mimeType:'application/pdf',verification:{ok:true}}));
 const result=await prepareCreatedAssetPrimary({draft:{title:'Work',description:'',kind:'pdf',longForm:'',collection:policy,files:[{id:'primary',role:'primary',file:raw},{id:'cover',role:'cover',file:cover}]},profileIdentity:'13c41d48-d844-414f-9f72-efae2db63325',seal,assertCurrent(){}});
 expect(seal).toHaveBeenCalledOnce();expect(runtime.readComposerPrimaryFile).toHaveBeenCalledOnce();
 expect(result.files).toEqual([{id:'cover',role:'cover',file:cover}]);expect(result.protectedOriginal?.profileIdentity).toBe('13c41d48-d844-414f-9f72-efae2db63325');
 expect(new Uint8Array(await result.protectedOriginal!.file.arrayBuffer())).toEqual(sealedBytes);
});
it('keeps an existing sealed private audio file exact and uses only its verified raw payload for public playback',async()=>{
 const sealed=new File(['sealed audio'],'work.wav',{type:'audio/wav'}),raw=new File(['raw audio'],'work.wav',{type:'audio/wav'}),seal=vi.fn();
 runtime.readComposerPrimaryFile.mockResolvedValue({verification:{ok:true,errors:[]},payload:raw});
 const result=await prepareCreatedAssetPrimary({draft:{title:'Work',description:'',kind:'audio',longForm:'',collection:policy,files:[{id:'primary',role:'primary',file:sealed}]},profileIdentity:'13c41d48-d844-414f-9f72-efae2db63325',seal,assertCurrent(){}});
 expect(seal).not.toHaveBeenCalled();expect(result.protectedOriginal?.file).toBe(sealed);expect(result.files[0]?.file).toBe(raw);
 const gated=await prepareCreatedAssetPrimary({draft:{title:'Work',description:'',kind:'audio',longForm:'',collection:{...policy,gateAudioPlayback:true},files:[{id:'primary',role:'primary',file:sealed}]},profileIdentity:'13c41d48-d844-414f-9f72-efae2db63325',seal,assertCurrent(){}});
 expect(gated.files).toEqual([]);expect(gated.protectedOriginal?.file).toBe(sealed);
});
