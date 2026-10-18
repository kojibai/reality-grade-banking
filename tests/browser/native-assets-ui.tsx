import {createRoot} from 'react-dom/client';
import {LiveAssetDetail} from '../../src/features/assets/LiveAssets';
import {Sheet} from '../../src/components/Sheet';
import type {OpenIdentity} from '../../src/receiz/native-identity';
import type {HeldDeposit} from '../../src/receiz/deposit-source';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
const source:HeldDeposit={digest:'a'.repeat(64),executionDigest:'b'.repeat(64),filename:'native-asset-holding.receizbundle',title:'Reserve units',kind:'proof',status:'held-proof',bytes:new Uint8Array([1]),pulse:'14666500',nativeAsset:{assetId:'c'.repeat(64),quantityMicro:'6000000',lockedQuantityMicro:'2000000',supplyMicro:'10000000',symbol:'UNIT',backingRail:'reserve',backingUsdCents:'20000',backingPhiMicro:'100000000',status:'active',sourceKaiUPulse:'14666500000000',issuedAtKaiUPulse:'14666500000000'}};
const identity={binding:{artifactOwnerReceizId:'example.receiz.id'},listDeposits:async()=>[source]} as unknown as OpenIdentity;
createRoot(document.getElementById('root')!).render(<><p className="body-copy small-copy" style={{padding:16}}>Interface fixture · no account, authority or funds connected</p><Sheet title="Your asset" onClose={()=>{}}><LiveAssetDetail identity={identity} digest={source.digest}/></Sheet></>);
