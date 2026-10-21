import {createRoot} from 'react-dom/client';
import {PublicAssetDetail} from '../../src/features/market/PublicAssetDetail';
import {publicAssetManifest} from '../../src/receiz/public-asset-manifest';
import type {PublicMarketItem} from '../../src/receiz/public-market';
import '../../src/styles/tokens.css';
import '../../src/styles/app.css';
import '../../src/styles/features.css';
import '../../src/public-explorer/asset-page.css';

// Browser harness supplies synthetic audio and artwork. No account or original
// source is connected, and the fixture's mock is never part of the application.
const verifyUrl='https://receiz.com/v/20261019_1200/AB12CD34/14700000?a=abcd1234&ms=1792411200000';
const item:PublicMarketItem={id:'asset-object-qa',assetId:'album-qa',title:'Sapphire After Hours',summary:'A quiet study in midnight blue. Music and its carried proof share one object.',category:'proof',mediaKind:'audio',artworkUrl:'https://receiz.com/artwork/bankeiz-qa-album.svg',sourceUrl:'https://receiz.com/alice/verified/album-qa',verifyUrl,originalUrl:'https://receiz.com/api/proof-material/packages/'+'a'.repeat(64)+'/artifact',originalDigest:'a'.repeat(64),pulse:null,sealedAt:'2026-10-19T16:00:00Z',ownerUsername:'alice',ownerDisplayName:'Alice',ownerProfileUrl:'https://receiz.com/alice',priceUsd:24,changePct:null,chart:[],authority:'projection-only',canTrade:false,
 proofManifest:publicAssetManifest({code:'AB12CD34',pulse:'14700000',verifyPath:verifyUrl,proof:{circuit:'Groth16',groth16Id:'9A24F19C1267F823',poseidon:'1234567890123456789012345678901234567890123456789012345678901234567890'},claimHashHex:'b'.repeat(64),pbiReceiptHash:'c'.repeat(64),media:{sha256Hex:'d'.repeat(64)},attachments:[{name:'Music authorship certificate',sha256Hex:'e'.repeat(64),src:'https://receiz.com/api/proof-material/packages/'+'a'.repeat(64)+'/artifact?attachment=authorship'}]})};
const harnessEnabled=Reflect.get(window,'__assetObjectQaHarness')===true;
createRoot(document.getElementById('root')!).render(<main style={{padding:'20px clamp(14px,4vw,36px)',maxWidth:850,margin:'0 auto'}}><p style={{fontSize:11,color:'#738298',marginBottom:24}}>Interaction fixture · synthetic media · no account or funds connected</p>{harnessEnabled?<div className="public-asset-page"><PublicAssetDetail item={item} readOnly standalone/></div>:<p>Run through the isolated browser harness, which supplies synthetic artwork and audio. No original is fetched by this fixture.</p>}</main>);
