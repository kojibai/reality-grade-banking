import {createRoot} from 'react-dom/client';
import {LiveMarketTrade} from '../../src/features/market/LiveMarketTrade';
import {createBankOperations} from '../../src/receiz/bank-operations';
import {createNativeAssets} from '../../src/receiz/native-asset';
import {nativeAssetChallenge} from '../../src/receiz/native-asset-protocol';
import {retainPublicAsset} from '../../src/receiz/public-asset-page';
import {parsePublicMarket} from '../../src/receiz/public-market';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
// Display/review fixture only. No execution, signature, funds or remote service.
const side=new URLSearchParams(location.search).get('side')==='sell'?'sell':'buy',requests:unknown[]=[];
Object.assign(window,{nativeActionFixture:{requests}});
const item=parsePublicMarket({ok:true,transport:{publicOriginals:[{id:'profile:artist:work',receizId:'work',title:'A complete work',profileOriginal:{nativeAsset:{id:'a'.repeat(64),issuanceSourceSha256:'b'.repeat(64),headSourceSha256:'c'.repeat(64),publicCertificateSha256:'d'.repeat(64)}}}]}}).items[0];retainPublicAsset(item);
const assets=createNativeAssets({ownerReceizId:'artist.receiz.id',keyId:'a'.repeat(64),assertOpen(){},lock:async run=>run(),store:{read:async()=>null,write:async()=>{throw Error('Execution forbidden');}},sign:async()=>{throw Error('Signing forbidden');},request:async(path,request)=>{if(!path.includes('/prepare?'))throw Error('Only review is permitted');requests.push(request);const review={schema:'receiz.bank.native-asset-review.v1',request,keyId:'a'.repeat(64),planDigest:'b'.repeat(64),terms:{debitUsdCents:side==='buy'?'100':'0',debitPhiMicro:side==='buy'?'500000':'0',creditUsdCents:side==='sell'?'100':'0',creditPhiMicro:side==='sell'?'500000':'0',feeUsdCents:'0',quantityMicro:request.quantityMicro,assetDigest:request.assetDigest,recipient:null,expiresAtKaiUPulse:9000000000000000}};return{...review,ticket:'fixture',challengeB64Url:nativeAssetChallenge(review as never)};}});
const operations=createBankOperations({ownerReceizId:'artist.receiz.id',assertOpen(){},lock:async run=>run(),store:{load:async()=>null,saveNew:async()=>{},replace:async()=>{}},context:async()=>{throw Error('Generic trading forbidden');},assets});
const identity={listDeposits:async()=>[],operations:async()=>operations,marketTrade:()=>{throw Error('Generic shares forbidden');}} as unknown as OpenIdentity;
createRoot(document.getElementById('root')!).render(<main className="sheet-content" style={{maxWidth:520,margin:'20px auto',padding:22}}><LiveMarketTrade identity={identity} marketItemId={item.id} side={side} onRefresh={()=>{}}/></main>);
