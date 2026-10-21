import {expect,it} from 'vitest';
import {safeReceizArtworkUrl,safeReceizPublicUrl} from '../src/receiz/public-market';
import {publicMediaPlayback} from '../src/receiz/public-asset-embed';
import {safePublicDocumentUrl} from '../src/receiz/public-document';
import {publicManifestLink} from '../src/receiz/public-asset-manifest';
const reference={schema:'receiz.imported-proof-source.v1',artifactSha256:'a'.repeat(64),byteLength:2,filename:'asset.receizbundle',mimeType:'application/vnd.receiz.bundle+json',bytes:{kind:'bytes',sha256:'b'.repeat(64),byteLength:2,contentByteLength:2,height:0}};
const base='https://receiz.com/api/profile/showcase/imported-source?'+new URLSearchParams({reference:JSON.stringify(reference)});
it('preserves the same closed imported-source coordinate for artwork, documents, playback and proof downloads',()=>{
 expect(safeReceizArtworkUrl(base+'&file=artwork')).toBe(base+'&file=artwork');
 expect(safeReceizPublicUrl(base,'original')).toBe(base);
 expect(safePublicDocumentUrl(base+'&payload=1','imported-work')).toBe(base+'&payload=1');
 expect(publicManifestLink(base+'&file=attachment-9')).toBe(base+'&file=attachment-9');
 expect(publicMediaPlayback({receizId:'imported-work',profileOriginal:{media:{kind:'audio',mime:'audio/wav',gateAudioPlayback:false,playbackSrc:base+'&payload=1'}}})).toEqual({url:base+'&payload=1',mimeType:'audio/wav'});
});
it('rejects ambiguous, arbitrary and malformed resource coordinates in every public URL reader',()=>{
 for(const url of [base+'&file=a&file=b',base+'&file=../bad',base+'&file=a&payload=1',base+'&unknown=1',base.replace('receiz.com','evil.example'),base.replace('%22byteLength%22%3A2','%22byteLength%22%3A-2')]){
  expect(safeReceizArtworkUrl(url),url).toBeNull();expect(safeReceizPublicUrl(url,'original'),url).toBeNull();expect(publicManifestLink(url),url).toBeNull();expect(safePublicDocumentUrl(url,'imported-work'),url).toBeNull();
 }
});

it('opens the committed primary with the existing reader and keeps the authored essay separate',async()=>{
 const {readMediaPayload}=await import('../src/receiz/proof-media');
 const original=new TextEncoder().encode('The source document.'),hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',original))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const manifest={schema:'receiz.bank.asset-content.v2',ownerReceizId:'artist.receiz.id',title:'A real title',description:'A caption',kind:'file',longForm:'An independent essay.',files:[{id:'work',role:'primary',name:'work.txt',mime:'text/plain',size:original.length,sha256:hash,bytes:{...reference.bytes,sha256:hash,byteLength:original.length,contentByteLength:original.length}}]};
 const payload={bytes:new TextEncoder().encode(JSON.stringify(manifest)),sha256:'c'.repeat(64),filename:'asset.json',mimeType:'application/json'};
 let reads=0;
 const media=await readMediaPayload(payload,{ownerReceizId:'artist.receiz.id',resolveFile:async file=>{reads++;expect(file.id).toBe('work');return original;}});
 expect(reads).toBe(1);expect(media.map(file=>file.text)).toEqual(['The source document.','A real title\n\nAn independent essay.']);
 await expect(readMediaPayload(payload,{ownerReceizId:'wrong.receiz.id',resolveFile:async()=>original})).rejects.toThrow();
 await expect(readMediaPayload(payload,{ownerReceizId:'artist.receiz.id',resolveFile:async()=>new Uint8Array(original.length)})).rejects.toThrow();
});
