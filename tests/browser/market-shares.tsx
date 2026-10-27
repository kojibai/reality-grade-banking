import {createRoot} from 'react-dom/client';
import {Landmark} from 'lucide-react';
import {PublicAssetDetail} from '../../src/features/market/PublicAssetDetail';
import {parsePublicMarket} from '../../src/receiz/public-market';
import {readPublicShareInventory} from '../../src/receiz/market-share-inventory';
import capturedInventory from './market-shares-data.json';
import publicSource from '../../public/receiz-public-market.json';
import '../../src/styles/tokens.css';import '../../src/styles/app.css';import '../../src/styles/features.css';import '../../src/features/market/market.css';
const item=parsePublicMarket(publicSource,publicSource.snapshot).items.find(item=>item.id==='profile:bjklock:d1d5a3f4-5db9-444e-88f5-95443fb70598')!;
// Captured live read. This fixture is never loaded by the production application.
item.shareInventory=readPublicShareInventory(capturedInventory,item)!;
createRoot(document.getElementById('root')!).render(<><div className="preview-heading"><Landmark size={28} strokeWidth={1.5}/><small>Existing asset interface · Live quantity captured October 26, 2026</small></div><section className="preview-panel" style={{maxWidth:580,margin:'auto'}}><PublicAssetDetail item={item} readOnly/></section></>);
