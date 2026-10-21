import {useMemo} from 'react';
import {ArrowUpRight} from 'lucide-react';
import {Sheet} from '../components/Sheet';
import {PublicAssetChart} from '../features/market/PublicAssetChart';
import {projectPublicAssetPeriods} from '../receiz/market-projection/asset';
import {useMarketDisplaySource} from '../receiz/market-projection/display-source';
import {formatPublicPrice,type PublicMarketItem} from '../receiz/public-market';
import {assetPagePath,retainPublicAsset} from '../receiz/public-asset-page';
import {beginPublicAssetTrade} from '../receiz/public-asset-trade';

export function ProfileValuePeek({item,onClose,active}:{item:PublicMarketItem;onClose():void;active:boolean}){
 const source=useMarketDisplaySource(),pulse=item.localValuationPulse??source?.serverPulse??Number(item.pulse);
 const periods=useMemo(()=>projectPublicAssetPeriods(item,source,pulse),[item,source,pulse]);
 const trade=(side:'buy'|'sell')=>{retainPublicAsset(item);onClose();beginPublicAssetTrade({itemId:item.id,title:item.title,side});};
 return <Sheet title="Asset value" onClose={onClose} active={active}><div className="profile-value-peek"><h3>{item.title}</h3><a className="profile-peek-link" href={assetPagePath(item.id)} onClick={()=>{retainPublicAsset(item);onClose();}}>View asset<ArrowUpRight size={13}/></a><strong>{formatPublicPrice(item.priceUsd)}</strong><span>Market value</span><PublicAssetChart periods={periods} fallback={item.chart}/>{!periods&&item.chart.length<2&&<p className="body-copy small-copy">Price history is not supplied for this asset.</p>}<div className="dual-actions"><button className="primary-button" disabled={item.id.startsWith('sports:')} onClick={()=>trade('buy')}>Buy ownership</button><button className="secondary-button" disabled={item.id.startsWith('sports:')} onClick={()=>trade('sell')}>Take cash</button></div></div></Sheet>;
}
