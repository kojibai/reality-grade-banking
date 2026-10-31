import {expect,it} from 'vitest';
import {Window} from 'happy-dom';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parsePublicProfile} from '../src/receiz/public-profile';
import {profileFixture} from './fixtures/public-profile';
import {publicAssetReading,publicProfileReading,renderReadingDocument} from '../server/public-reading-document';

const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:source',receizId:'source',title:'An Original <script>hostile()</script>',summary:'The public summary.',ownerUsername:'artist',valueUsd:123.45,pulse:'14800000',profileOriginal:{pulse:'14800000',code:'AB12CD34',claimHashHex:'a'.repeat(64),pbiReceiptHash:'b'.repeat(64),longForm:{title:'Complete essay',text:'First paragraph.\n\nThe entire body, including <img onerror="hostile()"> and the last line.',sha256Hex:'c'.repeat(64)},proof:{circuit:'Groth16',groth16Id:'known-proof',poseidon:'known-poseidon'},media:{kind:'image',src:'/artwork/work.png'}}}]}}).items[0];

it('exposes the complete carried essay and observed price without executing markup or changing the public source',()=>{
 const before=JSON.stringify(item),document=publicAssetReading(item),html=renderReadingDocument(document,'html'),text=renderReadingDocument(document,'text'),window=new Window();window.document.body.innerHTML=html;
 expect(window.document.querySelector('script,iframe,form,input')).toBeNull();expect(window.document.querySelector('[onerror]')).toBeNull();
 expect(window.document.body.textContent).toContain(item.carriedText!.text);expect(text).toContain(item.carriedText!.text);
 expect(text).toContain('123.45');expect(text).toContain('Observed USD value');expect(text).toContain('14800000');
 expect(window.document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://bankeiz.com/asset/profile%3Aartist%3Asource/');
 expect(JSON.stringify(item)).toBe(before);
});

it('carries known proof, valuation and chart operands without inventing missing evidence or fetching material',()=>{
 const source={...item,chart:[12,34,123.45],livePulseSeed:{kind:'sigil',claimPulse:14800000,beat:1,stepIndex:2,frequencyHz:432,creatorVerified:true} as const},text=renderReadingDocument(publicAssetReading(source),'text');
 expect(text).toContain('known-poseidon');expect(text).toContain('known-proof');expect(text).toContain('"frequencyHz": 432');expect(text).toContain('123.45');
 expect(text).toContain('https://bankeiz.com/artist/');expect(text).not.toContain('Unavailable');expect(text).not.toContain('spendable');
});

it('shows the same signed public Original cohort as the profile and excludes unselected private fields',()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.items=[{...item,hasPbiSignature:true},{...item,id:'profile:artist:unsigned',title:'Unsigned work',hasPbiSignature:false}];
 const text=renderReadingDocument(publicProfileReading(profile),'text');expect(text).toContain(item.title);expect(text).not.toContain('Unsigned work');expect(text).not.toContain('private@example.com');expect(text).not.toContain('secret');
});

it('windows large profiles without dropping links to later signed Originals',()=>{
 const profile=parsePublicProfile(profileFixture(),'alexmorgan');profile.items=Array.from({length:101},(_,i)=>({...item,id:'profile:artist:work-'+i,title:'Work '+i,hasPbiSignature:true}));
 const text=renderReadingDocument(publicProfileReading(profile,1),'text');expect(text).toContain('Work 0');expect(text).not.toContain('Work 50\n');expect(text).toContain('/read/profiles/alexmorgan/?page=2');
 expect(()=>publicProfileReading(profile,4)).toThrow('READING_PAGE_NOT_FOUND');
});

it('preserves public per-copy owners and their links for collectibles with no aggregate owner',async()=>{
 const {publicCatalogReading}=await import('../server/public-reading-document');
 const card={...item,id:'sports:card1',ownerUsername:null,sealedCopies:[{collectibleId:'copy1',claimHash:'a'.repeat(64),sealedAt:'2026-10-30T10:00:00Z',ownerUsername:'raven',ownerDisplayName:'Raven',ownerProfileUrl:'https://bankeiz.com/raven/'}]};
 const asset=renderReadingDocument(publicAssetReading(card),'text'),catalog=renderReadingDocument(publicCatalogReading([card],null),'text');
 expect(asset).toContain('raven');expect(asset).toContain('2026-10-30T10:00:00Z');expect(asset).toContain('/read/profiles/raven/');expect(catalog).toContain('/read/profiles/raven/');
});

it('includes the admitted public EPUB preview and digest independently of its download endpoint',()=>{
 const book={...item,book:{assetId:'book1',url:'https://receiz.com/api/profile/originals/media?receizId=book1&slot=preview',payloadDigest:'d'.repeat(64)}};
 const text=renderReadingDocument(publicAssetReading(book),'text');expect(text).toContain(book.book.url);expect(text).toContain(book.book.payloadDigest);
});
