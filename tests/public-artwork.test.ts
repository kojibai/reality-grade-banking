import {expect,it} from 'vitest';
import {parsePublicMarket,publicMediaArtworkUrl,safeReceizArtworkUrl} from '../src/receiz/public-market';

const cover='/api/profile/originals/media?receizId=song-1&slot=audioCover';
it('selects album, poster and book artwork before receipt fallbacks without changing the original locator',()=>{
 for(const [kind,field] of [['audio','audioCoverSrc'],['video','videoPosterSrc'],['epub','epubCoverSrc']]){
  const media={kind,[field]:cover,derivativeDownloadSrc:'/api/profile/originals/download?receizId=song-1&kind=original'};
  expect(publicMediaArtworkUrl(media)).toBe('https://receiz.com'+cover);
 }
 const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'song',receizId:'song-1',title:'Song',profileOriginal:{media:{kind:'audio',audioCoverSrc:cover,originalDownloadSrc:'/api/profile/originals/download?receizId=song-1&kind=original',originalDownloadSha256Hex:'a'.repeat(64)}}}]}}).items[0];
 expect(item.artworkUrl).toBe('https://receiz.com'+cover);
 expect(item.originalUrl).toBe('https://receiz.com/api/profile/originals/download?receizId=song-1&kind=original');
 expect(item.originalDigest).toBe('a'.repeat(64));expect(item.canTrade).toBe(false);
});
it('permits bounded public Receiz image resources and material previews, rejecting paid downloads, private, credentialed or external URLs',()=>{
 const storage='/api/storage/object?bucket=receiz-profile-originals&path=originals%2Falice%2Fcover.webp';
 expect(safeReceizArtworkUrl(storage)).toBe('https://receiz.com'+storage);
 expect(safeReceizArtworkUrl('/artwork/album-cover.jpg')).toBe('https://receiz.com/artwork/album-cover.jpg');
 const material='/api/proof-material/packages/'+'a'.repeat(64)+'/artifact';expect(safeReceizArtworkUrl(material)).toBe('https://receiz.com'+material);
 const receipt='/api/receiz/download?a=abcd1234&ms=1791828092396&name=receiz_20261012_1401_AB12CD34_derivative.png&p=14611069&c=AB12CD34';
 expect(publicMediaArtworkUrl({kind:'audio',receiptDownloadSrc:receipt})).toBe('https://receiz.com'+receipt);
 for(const value of ['https://other.example/cover.jpg','https://receiz.com.evil.test/cover.jpg','http://receiz.com/cover.jpg','https://user:secret@receiz.com/cover.jpg','data:image/png;base64,AAAA','blob:cover',cover+'&paymentSessionId=secret',cover+'&slot=preview',cover.replace('audioCover','playback'),storage.replace('receiz-profile-originals','receiz-profile-originals-private'),storage.replace('cover.webp','source.receiz'),'/api/profile/originals/download?receizId=song-1&kind=original',material+'?token=secret',material+'/attachment','/api/connect/wallet/me','/api/storage/object?bucket=receiz-profile-originals&path=..%2Fprivate.png','/artwork/cover.jpg?token=secret','/artwork/cover.jpg#secret'])expect(safeReceizArtworkUrl(value),value).toBeNull();
 expect(publicMediaArtworkUrl({kind:'audio',audioCoverSrc:'https://evil.example/cover.jpg',derivativeDownloadSrc:storage})).toBe('https://receiz.com'+storage);
});
