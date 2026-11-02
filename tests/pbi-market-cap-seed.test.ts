import {expect,it} from 'vitest';
import membership from '../public/receiz-public-market.json';
import sports from '../public/receiz-public-sports.json';
import sourceFile from '../public/receiz-public-capitalization.json';
import historyFile from '../public/receiz-public-share-chart-history.json';
import {parsePublicMarket} from '../src/receiz/public-market';
import {mergePublicSports} from '../src/receiz/public-sports';
import {publicShareCapitalization} from '../src/receiz/market-share-inventory';
import {publicCatalogAtPulse} from '../src/receiz/market-projection/catalog-prices';
import {parseMarketCapSource} from '../src/receiz/market-projection/source';
import {parseMarketHistory,SHARE_MARKET_HISTORY_POLICY} from '../src/receiz/market-projection/history';
it('ships all six public Market cap ranges and counts immediately from retained operands',()=>{
 const raw=mergePublicSports(parsePublicMarket(membership,membership.snapshot),sports),history=parseMarketHistory(historyFile),source=parseMarketCapSource(sourceFile);
 expect(raw.items.some(item=>item.category==='proof'&&item.hasPbiSignature!==true)).toBe(true);
 expect(history.historyPolicy).toBe(SHARE_MARKET_HISTORY_POLICY);
 const expected=publicShareCapitalization(publicCatalogAtPulse(raw,source,history.summary.serverPulse));
 expect(history.summary.shareCapitalization).toEqual(expected);expect(history.summary.marketAssetsPriced).toBe(raw.items.filter(item=>item.category==='proof').length);
 for(const range of Object.values(history.series)){expect(range.length).toBeGreaterThan(1);expect(range.at(-1)?.usdCents).toBe(expected.usdCents);}
 expect(()=>parseMarketHistory({...historyFile,historyPolicy:'share-capitalization-and-release-v1'})).toThrow();
 expect(()=>parseMarketHistory({...historyFile,historyPolicy:'pbi-signed-share-capitalization-and-release-v1'})).toThrow();
});
