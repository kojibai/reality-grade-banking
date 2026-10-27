import {expect,it} from 'vitest';
import membership from '../public/receiz-public-market.json';
import shareHistory from '../public/receiz-public-share-chart-history.json';
import {parsePublicMarket} from '../src/receiz/public-market';
import {parseMarketHistory,SHARE_MARKET_HISTORY_POLICY} from '../src/receiz/market-projection/history';
import {readPublicShareInventory} from '../src/receiz/market-share-inventory';
it('carries canonical share quantities and release projections in the shipped asset source',()=>{
 const proofs=parsePublicMarket(membership,membership.snapshot).items.filter(item=>item.category==='proof'&&!item.nativeAsset);
 expect(proofs.length).toBeGreaterThan(0);
 for(const item of proofs){expect(readPublicShareInventory(item.shareInventory,item),item.id).not.toBeNull();expect(item.shareInventory?.releaseCapitalization?.kaiUPulse,item.id).toBe(String(BigInt(item.pulse!)*1000000n));}
 const history=parseMarketHistory(shareHistory);expect(history.historyPolicy).toBe(SHARE_MARKET_HISTORY_POLICY);expect(history.summary.shareCapitalization!.covered).toBeGreaterThanOrEqual(proofs.length);
 for(const points of Object.values(history.series))expect(points.at(-1)?.usdCents).toBe(history.summary.shareCapitalization!.usdCents);
});
