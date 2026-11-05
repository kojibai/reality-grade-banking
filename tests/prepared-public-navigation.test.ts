import {expect,it} from 'vitest';
import {alignPreparedPublicNavigation} from '../server/prepared-public-navigation';
const navigation={reserved:['custom_owner'],styles:['exact-existing-style'],bank:{entry:'/assets/bank-held.js',content:'Frozen bank entry',head:[0]},pages:{'/explore/':{runtime:'explore',content:'stale-explore',head:[0]},'/explore/images/':{runtime:'explore',content:'stale-category',head:[0]},'/ledger/':{runtime:'ledger',content:'stale-ledger',head:[0]},'/discover/':{runtime:'discover',content:'unchanged-discover',head:[0]},'/learn/':{runtime:'learn',content:'Existing guide',head:[0]}}};
const template=`<html><body><script id="public-market-seed" type="application/json">{"generation":"current-source-B"}</script><script id="receiz-navigation" type="application/json">${JSON.stringify(navigation)}</script></body></html>`;
const read=(html:string)=>JSON.parse(/<script id="receiz-navigation" type="application\/json">([\s\S]*?)<\/script>/.exec(html)![1]);
it('keeps current prepared content and its single seed while other affected destinations use their ready HTML',()=>{
 const html=alignPreparedPublicNavigation(template,'explore','Current accepted collection'),value=read(html);
 expect(value.pages['/explore/'].content).toBe('Current accepted collection');expect(value.pages['/explore/images/']).toMatchObject({content:''});expect(value.pages['/ledger/']).toMatchObject({content:''});expect(value.pages['/discover/']).toMatchObject({content:'unchanged-discover'});
 expect(html.match(/id="public-market-seed"/g)).toHaveLength(1);expect(html).toContain('current-source-B');expect(value.bank).toEqual(navigation.bank);expect(value.styles).toEqual(navigation.styles);expect(value.reserved).toContain('custom_owner');
});
it('keeps the current Ledger destination and empties its old Explore body without changing Bank entry',()=>{
 const value=read(alignPreparedPublicNavigation(template,'ledger','Current accepted Proofs and financial history'));
 expect(value.pages['/ledger/'].content).toContain('Current accepted Proofs');expect(value.pages['/explore/']).toMatchObject({content:''});expect(value.pages['/explore/images/']).toMatchObject({content:''});expect(value.bank).toEqual(navigation.bank);
});
