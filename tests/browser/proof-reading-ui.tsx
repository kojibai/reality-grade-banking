import {createRoot} from 'react-dom/client';import {useEffect,useState} from 'react';
import {PublicAssetDetail} from '../../src/features/market/PublicAssetDetail';import {Sheet} from '../../src/components/Sheet';import {parsePublicMarket,type PublicMarketItem} from '../../src/receiz/public-market';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';
function PublicReadingFixture(){
 const [item,setItem]=useState<PublicMarketItem|null>(null),[show,setShow]=useState(true),[error,setError]=useState('');
 useEffect(()=>{const controller=new AbortController();void fetch('/receiz-public-market.json',{credentials:'omit',signal:controller.signal}).then(r=>r.json()).then(seed=>{const catalog=parsePublicMarket(seed,seed.snapshot),assetId=new URLSearchParams(location.search).get('chart')==='1'?'31b739b7-d7fb-4c5b-b469-2ab141e39288':'3f507095-b264-4606-916b-34f86c506ba3';const item=catalog.items.find(item=>item.assetId===assetId);if(!item)throw Error('Public fixture source unavailable.');if(!controller.signal.aborted)setItem(item);}).catch(cause=>{if(!controller.signal.aborted)setError(String(cause));});return()=>controller.abort();},[]);
 return <><p className="body-copy small-copy" style={{padding:16}}>Public original reader · no account connected</p>{error&&<p role="alert">{error}</p>}{item&&<><button className="secondary-button" onClick={()=>setShow(true)}>Open public original</button>{show&&<Sheet title="Public asset" onClose={()=>setShow(false)}><PublicAssetDetail item={item}/></Sheet>}</>}</>;
}
createRoot(document.getElementById('root')!).render(<PublicReadingFixture/>);
