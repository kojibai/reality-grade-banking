// @vitest-environment happy-dom
import {afterEach,expect,it} from 'vitest';
import {act} from 'react';import {createRoot} from 'react-dom/client';
import {CertificateManager} from '../src/features/certificates/CertificateManager';
import {readPublicAssetTrade,closePublicAssetTrade} from '../src/receiz/public-asset-trade';
let host:HTMLDivElement,root:ReturnType<typeof createRoot>;
afterEach(async()=>{if(root)await act(()=>root.unmount());host?.remove();closePublicAssetTrade();});
it('owner actions keep the exact certificate target in the existing account trade flow',async()=>{
 const token='owner-certificate-action-test',api={status:async()=>null,state:async()=>({note:{noteToken:token,title:'Wheat',remainingShareQuantityMicro:'12500000',lastPriceUsdCents:'100'},item:{id:'asset:wheat'},viewer:{isOwner:true}})};
 host=document.createElement('div');document.body.append(host);root=createRoot(host);
 await act(async()=>root.render(<CertificateManager identity={{shareCertificates:async()=>api} as never} initialToken={token} embedded onClose={()=>{}}/>));
 for(const [label,side]of [['Add shares','buy'],['Sell shares','sell']]){
  const button=[...host.querySelectorAll('button')].find(b=>b.textContent===label);expect(button).toBeDefined();await act(()=>button!.click());
  expect(readPublicAssetTrade()).toMatchObject({itemId:'asset:wheat',certificateToken:token,side});expect(readPublicAssetTrade()?.certificateAction).toBeUndefined();
 }
});
