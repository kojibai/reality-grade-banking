import {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {MarketOverview} from '../../src/features/market/MarketOverview';
import {PublicAssetDetail} from '../../src/features/market/PublicAssetDetail';
import {parsePublicMarket} from '../../src/receiz/public-market';
import {mergePublicSports} from '../../src/receiz/public-sports';
import membership from '../../public/receiz-public-market.json';
import sports from '../../public/receiz-public-sports.json';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';import '../../src/features/market/market.css';
const catalog=mergePublicSports(parsePublicMarket(membership,membership.snapshot),sports);
const item=catalog.items.find(item=>item.id==='profile:bjklock:d1d5a3f4-5db9-444e-88f5-95443fb70598')!;
function Preview(){const [asset,setAsset]=useState(false);return <main style={{maxWidth:590,margin:'24px auto',padding:'0 22px'}}><p className="body-copy small-copy">Actual interface · Retained public inputs · No financial actions</p><div className="periods" role="group" aria-label="Preview surface"><button aria-pressed={!asset} onClick={()=>setAsset(false)}>Global</button><button aria-pressed={asset} onClick={()=>setAsset(true)}>Asset</button></div>{asset?<PublicAssetDetail item={item} readOnly/>:<MarketOverview catalog={catalog} active={false} sourceActive={false} onExplore={()=>setAsset(true)}/>}</main>;}
createRoot(document.getElementById('root')!).render(<Preview/>);
