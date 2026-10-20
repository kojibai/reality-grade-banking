// @vitest-environment happy-dom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it,vi} from 'vitest';
import {Ledger} from '../src/features/ledger/Ledger';
import {parsePrivateHistoryPage} from '../src/receiz/private-history';
vi.mock('../src/receiz/usePublicNetwork',()=>({usePublicNetwork:()=>({records:[],sources:{},bootstrap:false,refresh:vi.fn(),loadMore:vi.fn()})}));
vi.mock('../src/features/ledger/useLedgerValueSource',()=>({useLedgerValueSource:()=>null}));
it('makes received and sent amounts explicit in My history while keeping their underlying payment witnesses together',async()=>{
 Object.assign(globalThis,{IS_REACT_ACT_ENVIRONMENT:true});
 const records=parsePrivateHistoryPage({ok:true,accountUserId:'me',nextCursor:null,events:[
  {id:'in',kind:'chat_transfer',transferId:'in',amountUsdCents:'1250',sender:{userId:'other'},recipient:{userId:'me'}},
  {id:'out',kind:'chat_transfer',transferId:'out',amountUsdCents:'2500',sender:{userId:'me'},recipient:{userId:'other'}},
  {id:'unknown',kind:'chat_transfer',amountUsdCents:'500'},
 ]},'me').records;
 const host=document.createElement('div'),root=createRoot(host),fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 try{
  await act(async()=>root.render(<Ledger active={false} personalHistory={{records,available:true,completeAtSealedHead:true}}/>));
  await act(async()=>[...host.querySelectorAll('button')].find(b=>b.textContent==='My history')!.click());
  const rows=[...host.querySelectorAll('.ledger-event')];
  expect(rows[0].querySelector('.row-copy strong')?.textContent).toBe('Money Received');
  expect(rows[0].querySelector('.ledger-value strong')?.textContent).toBe('+$12.50');
  expect(rows[0].querySelector('.asset-mark.deposit')).not.toBeNull();
  expect(rows[1].querySelector('.row-copy strong')?.textContent).toBe('Money Sent');
  expect(rows[1].querySelector('.ledger-value strong')?.textContent).toBe('−$25.00');
  expect(rows[1].querySelector('.asset-mark.send')).not.toBeNull();
  expect(rows[2].querySelector('.ledger-value strong')?.textContent).toBe('$5.00');
  const filters=host.querySelector('nav[aria-label="Your activity direction"]')!;
  const filter=(label:string)=>[...filters.querySelectorAll('button')].find(button=>button.textContent===label)!;
  await act(async()=>filter('Received').click());
  expect(host.querySelectorAll('.ledger-event')).toHaveLength(1);
  expect(host.querySelector('.row-copy strong')?.textContent).toBe('Money Received');
  expect(filter('Received').getAttribute('aria-pressed')).toBe('true');
  await act(async()=>filter('Sent').click());
  expect(host.querySelectorAll('.ledger-event')).toHaveLength(1);
  expect(host.querySelector('.row-copy strong')?.textContent).toBe('Money Sent');
  await act(async()=>filter('All').click());
  expect(host.querySelectorAll('.ledger-event')).toHaveLength(3);
  expect(fetch).not.toHaveBeenCalled();
 }finally{act(()=>root.unmount());vi.unstubAllGlobals();}
});
